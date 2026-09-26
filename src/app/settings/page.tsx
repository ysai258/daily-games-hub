'use client';

import { useState } from 'react';
import { NameForm } from '@/client/components/Onboarding';
import { Disclaimer } from '@/client/components/Disclaimer';
import { usePlayer } from '@/client/hooks';

export default function SettingsPage() {
  const { player, rename } = usePlayer();
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  return (
    <div className="stack-lg">
      <h1 className="title">⚙️ Settings</h1>
      <section className="card stack">
        <h2 className="section-title">Display name</h2>
        <NameForm
          key={player.name}
          initial={player.name}
          submitLabel="Save name"
          onSubmit={async (name) => {
            const err = await rename(name);
            setNote(err ? { ok: false, text: err } : { ok: true, text: `Saved. Friends now see you as ${name}.` });
          }}
        />
        {note && (
          <p className={note.ok ? 'success-text' : 'error-text'} role="status">
            {note.text}
          </p>
        )}
      </section>
      <section className="card stack">
        <h2 className="section-title">This device</h2>
        <p className="muted small">
          The hub knows you by an id stored in this browser, not by your name. Using another phone or browser starts a
          new player. Clearing site data does the same.
        </p>
        <p className="small mono">Player id: {player.id}</p>
      </section>
      <section className="card stack">
        <h2 className="section-title">Add to home screen</h2>
        <p className="muted small">
          Android Chrome: menu ⋮ → <strong>Add to Home screen</strong>. iPhone Safari: Share → <strong>Add to Home
          Screen</strong>.
        </p>
      </section>
      <Disclaimer />
    </div>
  );
}
