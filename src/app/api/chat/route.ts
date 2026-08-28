import { NextRequest } from "next/server";
import { ok, handleError } from "@/lib/api";
import { chatSchema } from "@/lib/validation";
import { replyToVisitor } from "@/lib/chatbot";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const input = chatSchema.parse(await request.json());
    const result = await replyToVisitor(input);
    return ok(result);
  } catch (error) {
    return handleError(error);
  }
}
