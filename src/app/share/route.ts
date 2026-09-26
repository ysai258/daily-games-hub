import { NextResponse } from 'next/server';
import { composeSharedText, sharedTextRedirectPath } from '@/shared/share-target';

/**
 * Web Share Target endpoint (manifest `share_target.action`).
 *
 * When someone picks "Daily Games" in Android's share sheet, Chrome opens the
 * installed app with a form POST here carrying `title`, `text` and `url`. This
 * turns them into one block of text and redirects to the dashboard, where the paste
 * box is prefilled for review. Nothing is saved until the player taps Save.
 *
 * 303 turns the POST into a GET, so reloading the dashboard doesn't re-post the
 * share or trigger a "resubmit form?" prompt.
 */
export const dynamic = 'force-dynamic';

function field(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === 'string' ? value : '';
}

export async function POST(req: Request) {
  let text = '';
  try {
    const form = await req.formData();
    text = composeSharedText({ title: field(form, 'title'), text: field(form, 'text'), url: field(form, 'url') });
  } catch {
    // A malformed body still lands on the dashboard; the player can paste by hand.
  }
  return NextResponse.redirect(new URL(sharedTextRedirectPath(text), req.url), 303);
}

/** Opening /share directly (a bookmark, a stale tab) just goes home. */
export function GET(req: Request) {
  return NextResponse.redirect(new URL('/', req.url), 303);
}
