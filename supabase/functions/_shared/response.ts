// supabase/functions/_shared/response.ts

import { safeErrorMessage } from "./crypto.ts";

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function jsonResponse(ok: boolean, data: unknown, status = 200): Response {
  return new Response(
    JSON.stringify({
      ok,
      data: ok ? data : null,
      error: ok ? null : data,
    }),
    {
      status,
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "application/json",
      },
    },
  );
}

export function successResponse(data: unknown): Response {
  return jsonResponse(true, data, 200);
}

export function errorResponse(err: unknown): Response {
  const message = safeErrorMessage(err);
  console.error("Request error:", err);
  return jsonResponse(false, message, 400);
}

export function handleCors(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }
  return null;
}
