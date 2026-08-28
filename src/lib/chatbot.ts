import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "./db";
import { ApiError } from "./api";
import { clinic } from "./config";
import { formatMoney } from "./format";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";
const MAX_HISTORY = 20;

/// Grounds the assistant in the clinic's live catalogue so it never invents a
/// service, a doctor, or a price.
async function buildSystemPrompt() {
  const [services, doctors] = await Promise.all([
    prisma.service.findMany({
      where: { active: true },
      select: { name: true, kind: true, description: true, priceMinor: true, durationMin: true },
      orderBy: { name: "asc" },
    }),
    prisma.doctor.findMany({
      where: { active: true },
      select: { name: true, specialty: true, qualifications: true, yearsExp: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const serviceLines = services
    .map(
      (s) =>
        `- ${s.name} (${s.kind}, ${s.durationMin} min, from ${formatMoney(s.priceMinor)}): ${s.description}`,
    )
    .join("\n");

  const doctorLines = doctors
    .map((d) => `- ${d.name}, ${d.qualifications} — ${d.specialty}, ${d.yearsExp} years' experience`)
    .join("\n");

  return `You are the front-desk assistant for ${clinic.name}, a clinic running an outpatient department (OPD) and an operation theatre (OT).

CLINIC DETAILS
Phone: ${clinic.phone}
Email: ${clinic.email}
Address: ${clinic.address}

SERVICES
${serviceLines || "(none listed yet)"}

DOCTORS
${doctorLines || "(none listed yet)"}

HOW TO BEHAVE
- Be warm, brief and practical. Two or three short sentences is usually enough.
- Help visitors understand services, rough costs, and how to book. To book, point them to the "Book an appointment" page or offer to take their name and phone number so the team can call back.
- Only state facts present above. If you do not know something — a specific doctor's availability, an exact surgical quote, insurance coverage — say so and offer a callback.
- You are NOT a doctor. Never diagnose, never interpret symptoms or reports, never recommend or adjust medication, never give dosages.
- If someone describes a medical emergency (severe bleeding, breathing difficulty, chest pain, loss of consciousness, a serious injury), tell them immediately to call emergency services or go to the nearest emergency department. Do not attempt triage.
- Never ask for or repeat medical record numbers, ID numbers, or payment card details in chat.`;
}

export async function replyToVisitor(params: {
  sessionKey: string;
  message: string;
  visitorName?: string;
  visitorPhone?: string;
}) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new ApiError("The assistant is not configured yet. Please use the contact form.", 503);
  }

  const conversation = await prisma.conversation.upsert({
    where: { sessionKey: params.sessionKey },
    create: {
      sessionKey: params.sessionKey,
      visitorName: params.visitorName,
      visitorPhone: params.visitorPhone,
    },
    update: {
      ...(params.visitorName ? { visitorName: params.visitorName } : {}),
      ...(params.visitorPhone ? { visitorPhone: params.visitorPhone } : {}),
    },
  });

  await prisma.chatMessage.create({
    data: { conversationId: conversation.id, role: "USER", content: params.message },
  });

  const history = await prisma.chatMessage.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: "desc" },
    take: MAX_HISTORY,
  });

  const anthropic = new Anthropic({ apiKey });
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 600,
    system: await buildSystemPrompt(),
    messages: history
      .reverse()
      .map((m) => ({ role: m.role === "USER" ? ("user" as const) : ("assistant" as const), content: m.content })),
  });

  const reply = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();

  await prisma.chatMessage.create({
    data: { conversationId: conversation.id, role: "ASSISTANT", content: reply },
  });

  return { reply, conversationId: conversation.id };
}
