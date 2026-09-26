import { describe, expect, it } from 'vitest';
import { composeSharedText, readSharedFromHash, sharedTextRedirectPath } from './share-target';

describe('composeSharedText', () => {
  it('uses the shared text as-is when it already contains the link', () => {
    const text = 'Pattukunte Pattucheera Day 1587: 3/5\n\n🟥🟥🟩⬛⬛\n\nhttps://pattukunte-pattucheera.netlify.app';
    expect(composeSharedText({ title: 'Pattukunte PattuCheera', text, url: '' })).toBe(text);
  });

  it('appends a link the sharing site passed separately (Absolute Cinema does this)', () => {
    expect(
      composeSharedText({ title: '', text: '🎬 ABSOLUTE CINEMA\n🟩⬜⬜⬜⬜\n1 / 5', url: 'https://absolute-cinema.in' }),
    ).toBe('🎬 ABSOLUTE CINEMA\n🟩⬜⬜⬜⬜\n1 / 5\nhttps://absolute-cinema.in');
  });

  it('does not repeat a link already in the text, ignoring a trailing slash', () => {
    expect(composeSharedText({ title: '', text: 'x\nhttps://absolute-cinema.in', url: 'https://absolute-cinema.in/' })).toBe(
      'x\nhttps://absolute-cinema.in',
    );
  });

  it('falls back to the title only when there is no text', () => {
    expect(composeSharedText({ title: 'EVARRA?', text: '', url: '' })).toBe('EVARRA?');
    expect(composeSharedText({ title: 'EVARRA?', text: 'body', url: '' })).toBe('body');
  });

  it('returns an empty string for an empty share', () => {
    expect(composeSharedText({ title: ' ', text: '', url: '' })).toBe('');
  });
});

describe('redirect round trip', () => {
  it('carries emoji and newlines through the URL fragment intact', () => {
    const text = 'ఆడు గజాల ఆడు #26 SEP\n× △ ■ □ □\n— 3/5 attempts! 🎶';
    const path = sharedTextRedirectPath(text);
    expect(path.startsWith('/#shared=')).toBe(true);
    expect(readSharedFromHash(path.slice(1))).toBe(text);
  });

  it('sends an empty share to the plain dashboard', () => {
    expect(sharedTextRedirectPath('')).toBe('/');
  });

  it('ignores fragments that are not a share', () => {
    expect(readSharedFromHash('')).toBeNull();
    expect(readSharedFromHash('#section')).toBeNull();
    expect(readSharedFromHash('#shared=%E0%A4%A')).toBeNull();
  });

  it('caps oversized shares so the redirect URL stays small', () => {
    const path = sharedTextRedirectPath('x'.repeat(50_000));
    expect(path.length).toBeLessThan(10_000);
  });
});
