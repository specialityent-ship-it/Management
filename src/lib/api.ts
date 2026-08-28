import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthError } from "./auth";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function fail(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error: message, ...extra }, { status });
}

/// Turns thrown errors into a predictable JSON envelope so every route
/// handler can stay a straight-line happy path.
export function handleError(error: unknown) {
  if (error instanceof ZodError) {
    return fail("Validation failed", 422, {
      issues: error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  }
  if (error instanceof AuthError) return fail(error.message, error.status);
  if (error instanceof ApiError) return fail(error.message, error.status);
  console.error(error);
  return fail("Something went wrong", 500);
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}
