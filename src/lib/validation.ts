import { z } from "zod";

export const phoneSchema = z
  .string()
  .trim()
  .min(7, "Enter a valid phone number")
  .max(20)
  .regex(/^[+0-9][0-9\s-]*$/, "Enter a valid phone number");

export const bookingRequestSchema = z.object({
  serviceId: z.string().min(1),
  doctorId: z.string().min(1),
  start: z.iso.datetime(),
  patient: z.object({
    name: z.string().trim().min(2, "Enter the patient's full name").max(120),
    phone: phoneSchema,
    email: z.email().optional().or(z.literal("")),
    gender: z.enum(["MALE", "FEMALE", "OTHER", "UNDISCLOSED"]).default("UNDISCLOSED"),
    dob: z.iso.date().optional().or(z.literal("")),
    city: z.string().trim().max(80).optional().or(z.literal("")),
  }),
  reason: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const leadSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: phoneSchema,
  email: z.email().optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  interest: z.string().trim().max(160).optional().or(z.literal("")),
  message: z.string().trim().max(2000).optional().or(z.literal("")),
  source: z
    .enum([
      "WEBSITE_FORM",
      "CHATBOT",
      "INSTAGRAM",
      "YOUTUBE",
      "GOOGLE",
      "WALK_IN",
      "REFERRAL",
      "PHONE",
      "CAMPAIGN",
    ])
    .default("WEBSITE_FORM"),
});

export const chatSchema = z.object({
  sessionKey: z.string().min(8).max(80),
  message: z.string().trim().min(1, "Say something").max(2000),
  visitorName: z.string().trim().max(120).optional(),
  visitorPhone: phoneSchema.optional(),
});

export const socialPostSchema = z.object({
  title: z.string().trim().min(1).max(120),
  caption: z.string().trim().min(1).max(2200),
  hashtags: z.string().trim().max(500).optional().or(z.literal("")),
  mediaUrl: z.url("Enter a public https:// URL to the image or video").optional().or(z.literal("")),
  mediaKind: z.enum(["IMAGE", "VIDEO", "REEL", "SHORT"]).default("IMAGE"),
  platforms: z.array(z.enum(["INSTAGRAM", "YOUTUBE"])).min(1, "Pick at least one platform"),
  scheduledAt: z.iso.datetime().optional().or(z.literal("")),
});

export const otCaseSchema = z.object({
  patientId: z.string().min(1),
  surgeonId: z.string().min(1),
  serviceId: z.string().min(1),
  theatreId: z.string().optional().or(z.literal("")),
  scheduledStart: z.iso.datetime(),
  durationMin: z.coerce.number().int().min(15).max(720),
  anaesthesia: z.enum(["LOCAL", "REGIONAL", "GENERAL", "SEDATION"]).default("LOCAL"),
  anaesthetist: z.string().trim().max(120).optional().or(z.literal("")),
  assistants: z.string().trim().max(240).optional().or(z.literal("")),
  procedureNote: z.string().trim().max(4000).optional().or(z.literal("")),
});
