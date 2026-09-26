import { createHash, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { istToday } from '@/shared/date';
import { dateKeySchema } from '@/shared/validation';

export function json<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

export function error(message: string, status: number): NextResponse {
  return json({ error: message }, status);
}

/** Reads a JSON body, refusing anything that isn't small JSON. */
export async function readJson(req: Request, maxBytes = 8_192): Promise<unknown> {
  const body = await req.text();
  if (body.length > maxBytes) throw new BadRequest('Request too large.');
  try {
    return JSON.parse(body);
  } catch {
    throw new BadRequest('Request body must be JSON.');
  }
}

export class BadRequest extends Error {}

/** `?date=` if valid and not in the future, else today (IST). */
export function dateParam(req: Request): string | { error: string } {
  const raw = new URL(req.url).searchParams.get('date');
  if (raw === null) return istToday();
  const parsed = dateKeySchema.safeParse(raw);
  if (!parsed.success) return { error: 'Dates look like 2026-09-26.' };
  if (parsed.data > istToday()) return { error: "That day hasn't happened yet." };
  return parsed.data;
}

/**
 * Admin routes need `Authorization: Bearer <ADMIN_PASSWORD>`. With no password
 * configured the admin API doesn't exist (404), so it is never open by accident.
 */
export function adminCheck(req: Request): NextResponse | null {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return error('Not found.', 404);
  const given = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  const digest = (s: string) => createHash('sha256').update(s).digest();
  if (!timingSafeEqual(digest(given), digest(password))) return error('Wrong admin password.', 401);
  return null;
}

/** Wraps a handler so unexpected failures return a clean 500 instead of a stack trace. */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<NextResponse>) {
  return async (...args: A): Promise<NextResponse> => {
    try {
      return await fn(...args);
    } catch (err) {
      if (err instanceof BadRequest) return error(err.message, 400);
      console.error(err);
      return error('Something went wrong on our side. Try again in a moment.', 500);
    }
  };
}
