/**
 * API authentication for /api/v1/ Command Layer endpoints.
 * Validates GENESIS_INTERNAL_API_KEY Bearer token.
 */

import { NextRequest, NextResponse } from "next/server";

/**
 * Validate the API key from the Authorization header.
 * Returns a 401 NextResponse if invalid, or null if valid.
 */
export function validateApiKey(request: NextRequest): NextResponse | null {
  const apiKey = request.headers.get("Authorization")?.replace("Bearer ", "");

  if (!apiKey || apiKey !== process.env.GENESIS_INTERNAL_API_KEY) {
    return NextResponse.json(
      {
        data: null,
        error: { code: "UNAUTHORIZED", message: "Invalid API key" },
        meta: {
          app: "pipeline",
          version: "1.0",
          timestamp: new Date().toISOString(),
        },
      },
      { status: 401 }
    );
  }

  return null; // valid
}
