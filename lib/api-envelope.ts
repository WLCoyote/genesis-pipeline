/**
 * Standard response envelope helpers for /api/v1/ Command Layer endpoints.
 * Format: { data, error, meta } per GENESIS_CONVENTIONS_v2.1
 */

import { NextResponse } from "next/server";

interface ErrorPayload {
  code: string;
  message: string;
}

interface Meta {
  app: string;
  version: string;
  timestamp: string;
}

function buildMeta(): Meta {
  return {
    app: "pipeline",
    version: "1.0",
    timestamp: new Date().toISOString(),
  };
}

/**
 * Return a success response with the standard envelope.
 */
export function apiSuccess(data: unknown, status = 200): NextResponse {
  return NextResponse.json(
    { data, error: null, meta: buildMeta() },
    { status }
  );
}

/**
 * Return an error response with the standard envelope.
 */
export function apiError(code: string, message: string, status = 500): NextResponse {
  const error: ErrorPayload = { code, message };
  return NextResponse.json(
    { data: null, error, meta: buildMeta() },
    { status }
  );
}
