import { MAX_SHARE_TEXT_LENGTH } from './parse';

/**
 * Web Share Target plumbing. Android delivers a share as `title`, `text` and `url`
 * fields (see the manifest's `share_target`). The hub needs one block of text for the
 * paste box. Games differ in where they put their link: most put it inside the
 * text, but Absolute Cinema passes it separately as `url`. So the link is appended
 * only when the text doesn't already contain it.
 */
export type SharedFields = { title: string; text: string; url: string };

const HASH_KEY = 'shared';

export function composeSharedText({ title, text, url }: SharedFields): string {
  const body = text.trim() || title.trim();
  const link = url.trim();
  if (!link) return body;
  const bare = link.replace(/\/+$/, '');
  if (body.includes(bare)) return body;
  return body ? `${body}\n${link}` : link;
}

/**
 * Where /share redirects. The text rides in the URL fragment rather than the query
 * string: browsers never send the fragment to the server, so it stays out of request
 * logs and doesn't make the dashboard look like a different page. One character
 * over the parser's limit is kept, so an oversized share still shows "too long"
 * instead of being silently cut.
 */
export function sharedTextRedirectPath(text: string): string {
  const capped = text.slice(0, MAX_SHARE_TEXT_LENGTH + 1);
  return capped ? `/#${HASH_KEY}=${encodeURIComponent(capped)}` : '/';
}

/** The shared text in a `location.hash`, or null if the fragment isn't a share. */
export function readSharedFromHash(hash: string): string | null {
  const prefix = `#${HASH_KEY}=`;
  if (!hash.startsWith(prefix)) return null;
  try {
    return decodeURIComponent(hash.slice(prefix.length));
  } catch {
    return null;
  }
}
