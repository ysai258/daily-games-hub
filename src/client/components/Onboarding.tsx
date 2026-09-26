'use client';

import { useState, type FormEvent } from 'react';
import { MAX_NAME_LENGTH, playerNameSchema } from '@/shared/validation';

function greeting(): string {
  const hour = Number(
    new Intl.DateTimeFormat('en-IN', { hour: 'numeric', hourCycle: 'h23', timeZone: 'Asia/Kolkata' }).format(new Date()),
  );
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function NameForm({
  initial = '',
  submitLabel,
  onSubmit,
}: {
  initial?: string;
  submitLabel: string;
  onSubmit: (name: string) => void | Promise<void>;
}) {
  const [name, setName] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const parsed = playerNameSchema.safeParse(name);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Enter a name.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await onSubmit(parsed.data);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="stack" noValidate>
      <label htmlFor="player-name" className="label">
        Your name
      </label>
      <input
        id="player-name"
        className="input"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={MAX_NAME_LENGTH + 10}
        autoComplete="nickname"
        placeholder="Enter your name"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? 'player-name-error' : undefined}
        autoFocus
      />
      {error && (
        <p id="player-name-error" className="error-text" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="button button--primary" disabled={busy}>
        {submitLabel}
      </button>
    </form>
  );
}

export function Onboarding({ onDone }: { onDone: (name: string) => void }) {
  return (
    <main className="page page--center">
      <div className="card onboarding">
        <p className="eyebrow">🎮 Daily Games</p>
        <h1 className="title">{greeting()} 👋</h1>
        <p className="muted">Who are you? Your friends will see this name on the leaderboard.</p>
        <NameForm submitLabel="Continue" onSubmit={onDone} />
      </div>
    </main>
  );
}
