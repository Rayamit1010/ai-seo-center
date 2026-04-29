import { NextResponse } from "next/server";
import { safeJsonParse } from "@/lib/utils";
import { humanizeErrorMessage } from "@/lib/errors";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ success: true, data }, init);
}

export function fail(error: string, status = 500) {
  return NextResponse.json(
    {
      error,
      reason: humanizeErrorMessage(error),
    },
    { status }
  );
}

export function parseStoredJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  return safeJsonParse(value, fallback);
}
