'use client';

import { useId, useMemo, useState } from 'react';
import { getGame, type GameId } from '@/shared/games';
import { parseShareText } from '@/shared/parse';
import { resultLabel } from '@/shared/scoring';
import type { ResultDto } from '@/shared/types';
import { api, isRetryable } from '../api';
import { usePlayer } from '../hooks';
import { queuePending } from '../pending';

type Status =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'saved'; result: ResultDto }
  | { kind: 'queued'; gameId: GameId }
  | { kind: 'error'; message: string };

/**
 * Paste a game's share text → see what the hub read → save it.
 * The game is worked out from the text itself (its link, or its title), and the
 * day is today in IST. Anything already recorded today is refused up front.
 */
export function PasteResult({
  today,
  recorded,
  onSaved,
}: {
  today: string;
  recorded: ReadonlySet<GameId>;
  onSaved: () => void;
}) {
  const { player } = usePlayer();
  const [text, setText] = useState('');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const inputId = useId();
  const canReadClipboard = typeof navigator !== 'undefined' && typeof navigator.clipboard?.readText === 'function';

  const preview = useMemo(() => (text.trim() ? parseShareText(text, today) : null), [text, today]);
  const alreadyRecorded = preview?.ok === true && recorded.has(preview.result.gameId);
  const canSave = preview?.ok === true && !alreadyRecorded && status.kind !== 'saving';

  async function pasteFromClipboard() {
    try {
      const clip = await navigator.clipboard.readText();
      if (clip) {
        setText(clip);
        setStatus({ kind: 'idle' });
      }
    } catch {
      setStatus({ kind: 'error', message: 'Your browser blocked clipboard access. Long-press the box and choose Paste.' });
    }
  }

  async function save() {
    if (!preview?.ok) return;
    setStatus({ kind: 'saving' });
    const gameId = preview.result.gameId;
    const body = { playerId: player.id, playerName: player.name, text, gameDate: today };
    const res = await api.submit(body);

    if (res.ok) {
      setStatus({ kind: 'saved', result: res.data.result });
      setText('');
      onSaved();
    } else if (isRetryable(res.status)) {
      queuePending({ ...body, gameId, queuedAt: new Date().toISOString() });
      setStatus({ kind: 'queued', gameId });
      setText('');
    } else {
      setStatus({ kind: 'error', message: res.error });
      if (res.status === 409) onSaved();
    }
  }

  return (
    <section className="card paste" aria-labelledby={`${inputId}-title`}>
      <h2 id={`${inputId}-title`} className="section-title">
        📋 Add a result
      </h2>
      <p className="muted small">
        Finish a game, tap its <strong>Share</strong> or <strong>Copy</strong> button, then paste it here.
      </p>

      <label htmlFor={inputId} className="visually-hidden">
        Game share text
      </label>
      <textarea
        id={inputId}
        className="input textarea"
        rows={5}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          if (status.kind !== 'saving') setStatus({ kind: 'idle' });
        }}
        placeholder={'🎬 ABSOLUTE CINEMA\n🟥🟩⬜⬜⬜\n2 / 5\n…'}
        spellCheck={false}
      />

      {preview && !preview.ok && (
        <p className="error-text" role="alert">
          {preview.error}
        </p>
      )}
      {preview?.ok && (
        <p className={alreadyRecorded ? 'error-text' : 'detected'} role="status">
          {getGame(preview.result.gameId).icon} {getGame(preview.result.gameId).name} ·{' '}
          <strong>{resultLabel(preview.result)}</strong>
          {alreadyRecorded ? ' — already added today. Only the first result counts.' : ''}
        </p>
      )}

      <div className="row">
        {canReadClipboard && (
          <button type="button" className="button" onClick={pasteFromClipboard}>
            Paste
          </button>
        )}
        <button type="button" className="button button--primary grow" onClick={save} disabled={!canSave}>
          {status.kind === 'saving' ? 'Saving…' : 'Save result'}
        </button>
      </div>

      {status.kind === 'saved' && (
        <p className="success-text" role="status">
          ✓ {getGame(status.result.gameId).name} recorded: {status.result.label}
        </p>
      )}
      {status.kind === 'queued' && (
        <p className="warn-text" role="status">
          Your game is complete, but we couldn&apos;t reach the hub. It&apos;s saved on this phone and will be sent
          automatically when you&apos;re back online.
        </p>
      )}
      {status.kind === 'error' && (
        <p className="error-text" role="alert">
          {status.message}
        </p>
      )}
    </section>
  );
}
