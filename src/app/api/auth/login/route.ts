import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, fail, handleError } from "@/lib/api";
import { createSession, verifyCredentials } from "@/lib/auth";

const schema = z.object({ email: z.email(), password: z.string().min(1) });

export async function POST(request: NextRequest) {
  try {
    const { email, password } = schema.parse(await request.json());
    const user = await verifyCredentials(email, password);
    if (!user) return fail("Incorrect email or password.", 401);

    await createSession({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    return ok({ name: user.name, role: user.role });
  } catch (error) {
    return handleError(error);
  }
}
