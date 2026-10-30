import { NextResponse } from 'next/server';

export interface ApiResponse<T = unknown> {
  success: boolean;
  requestId: string;
  timestamp: string;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function sanitizeLog(data: unknown): unknown {
  if (typeof data !== 'object' || data === null) return data;
  const sanitized = Array.isArray(data) ? [...data] : { ...(data as Record<string, unknown>) };
  const sensitiveKeys = ['email', 'password', 'token', 'secret', 'phone', 'card', 'aadhaar', 'passport'];

  for (const key of Object.keys(sanitized)) {
    if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
      (sanitized as Record<string, unknown>)[key] = '[REDACTED]';
    } else if (typeof (sanitized as Record<string, unknown>)[key] === 'object') {
      (sanitized as Record<string, unknown>)[key] = sanitizeLog((sanitized as Record<string, unknown>)[key]);
    }
  }
  return sanitized;
}

export function apiSuccess<T>(data: T, status = 200, requestId = generateRequestId()): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      requestId,
      timestamp: new Date().toISOString(),
      data
    },
    { status }
  );
}

export function apiError(
  message: string,
  code = 'BAD_REQUEST',
  status = 400,
  details?: unknown,
  requestId = generateRequestId()
): NextResponse<ApiResponse<null>> {
  console.error(`[API Error ${requestId}] ${code}: ${message}`, sanitizeLog(details));
  return NextResponse.json(
    {
      success: false,
      requestId,
      timestamp: new Date().toISOString(),
      error: {
        code,
        message,
        details
      }
    },
    { status }
  );
}
