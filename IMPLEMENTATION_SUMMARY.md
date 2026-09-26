# Daily Games Hub — Implementation Summary

One link for the friend group's four daily games. Each game opens on its own site.
When a player finishes, they paste the game's share text into the hub, which records
it on a daily leaderboard.

## Architecture

```
Phone ──▶ Next.js app (Vercel)
            ├─ pages (React, client-rendered; identity in localStorage)
            └─ /api/* route handlers ──▶ Postgres (Neon) via Drizzle
Game sites (external, untouched) ──share text──▶ player's clipboard ──paste──▶ hub
```

- **One Next.js 16 project** serves the UI and the API, so there is one deploy.
- **Shared code** in `src/shared/` runs on both sides:
  - the game config (`games.ts`)
  - IST dates (`date.ts`)
  - scoring (`scoring.ts`)
  - validation (`validation.ts`)
  - the share-text parsers (`parse/`)

  The browser parses for an instant preview. The server parses again, and only the server's result is stored.
- **Server code** in `src/server/`: submit logic (`results.ts`), leaderboard queries
  (`leaderboard.ts`), rate limiting (`rate-limit.ts`), the DB client and schema (`db/`).
- **Browser code** in `src/client/`: player identity, the API client, the offline
  retry queue, WhatsApp share, and the components.

## How each game is integrated

| Game | How a result gets in | Game detected by | Date check |
|---|---|---|---|
| 🎬 Absolute Cinema | Pasted share text | `absolute-cinema.in` or "ABSOLUTE CINEMA" | None possible: the text has no date |
| 🎵 Aadu Gajala | Pasted share text | `aadu-gajala.vercel.app` or `ఆడు గజాల ఆడు` | `#DD MON` must be today. `?date=` and "this song" replays are rejected. |
| ⭐ Evarra? | Pasted share text | `ysai258.github.io/evarra` or `EVARRA?` | The full date must be today. Multiplayer results are rejected. |
| 👗 Pattukunte Pattucheera | Pasted share text | `pattukunte-pattucheera.netlify.app` or its title | `Day N` must equal today's day number. "(Time Travelled)" is rejected. |

- **Every parser checks the claimed score against the emoji grid.** This catches typos and casual edits. Evarra's points are also checked against its scoring rules.
- **All results are stored with `source = 'share-text'`** and shown as self-reported.
- **Why no iframes or reading localStorage:** see `FEASIBILITY.md`. In short, browsers block reading another site's storage, and Aadu Gajala forbids framing.

## Rules

- **Day** = the IST calendar day of the paste (`Asia/Kolkata`, via Luxon). It never comes from the server's timezone or from UTC.
- **One result per player, per game, per day.**
  - The first paste wins. A different second paste gets `409` and the UI blocks it up front.
  - Re-sending the identical result is treated as a retry: `200`, and no new row.
- **Offline:** if saving fails because of the network, a server error or the rate limit, the paste is queued in localStorage (`daily_games_pending_results`). It is re-sent when the browser comes back online or the app opens. A queued result keeps the day it was pasted on, and the server accepts today or yesterday only.
- **Identity:** a random UUID (`daily_games_player_id`) plus a display name (`daily_games_player_name`) in localStorage. Leaderboards key on the id, so two people named Rahul stay separate. Renaming updates past results too.
- **Scoring across games:** all four games are "solve within 5 attempts".
  - The normalized score is `(6 − N) / 5` for a solve on attempt N, and 0 for a miss.
  - This equals Absolute Cinema's own 100/80/60/40/20 table.
  - **Friends view:** sorted by games played, then total normalized score. The Score column averages over all 4 games, so unplayed counts as 0%.
  - **Per-game boards:** use each game's own result. Evarra's are ranked by its points.

## Share straight from a game (Android)

Once someone installs the hub from Chrome on Android (menu ⋮ → **Install app**), the hub appears in the phone's
share sheet next to WhatsApp. Sharing a result sends it into the hub's paste box, ready to review and save.

```
Game's Share button ─▶ Android share sheet ─▶ "Daily Games"
  ─▶ POST /share (title, text, url)        src/app/share/route.ts
  ─▶ 303 to /#shared=<text>                src/shared/share-target.ts
  ─▶ dashboard prefills the paste box      src/app/page.tsx → PasteResult
  ─▶ player taps Save result (same API, same rules as a manual paste)
```

- `src/app/manifest.ts` holds the `share_target`, installable icons, `id`, `scope` and `display: standalone`.
- `public/sw.js` is a minimal service worker: no caching, plus an offline page when navigation fails. It never touches `/share` or `/api`.
- `src/client/components/ServiceWorker.tsx` registers it, in production builds only.
- `public/icons/` and `src/app/apple-icon.png` are generated from `scripts/icon-source.svg` by `scripts/icons.cjs`.
- **Games that pass their link separately:** Absolute Cinema sends it as `url`, not inside `text`. The link is appended so the game is still detected.
- **Where the text travels:** in the URL fragment, which is never sent to the server or logged. It is removed from the address bar as soon as it has been read.
- **Where it works:** the share target works only in the **installed** app on Android (Chrome, and Chromium browsers such as Samsung Internet) and on ChromeOS. iPhone Safari does not support Web Share Target, so iPhone users keep copy and paste. That flow is unchanged.

## Database schema (`drizzle/0000_init.sql`)

- **`players`**: `id uuid pk`, `name`, `created_at`, `updated_at`
- **`game_results`**:
  - identity: `id uuid pk`, `player_id → players`, `game_id`, `game_date date`
  - result: `won`, `attempts`, `max_attempts`, `points` (Evarra only)
  - provenance: `source`, `raw_text`, `created_at`
  - constraints: `UNIQUE(player_id, game_id, game_date)`; indexes on `(game_date, game_id)` and `(game_date, player_id)`
- **`rate_limits`**: `key pk`, `window_start`, `count`. Serverless instances share no memory, so the counters live in Postgres.

## API

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/games` | Enabled games |
| GET | `/api/today` | Server IST date and next reset (so a wrong phone clock doesn't matter) |
| POST | `/api/results` | `{playerId, playerName, text, gameDate?}` → 201 saved, 200 duplicate, 409 already recorded, 422 unreadable or wrong day, 429 rate-limited |
| GET | `/api/leaderboard?date=` | Friends standings plus a board per game |
| GET | `/api/leaderboard/:gameId?date=` | One game's board |
| GET | `/api/player/:playerId?date=` | One player's results for a day |
| PUT | `/api/player/:playerId` | Rename `{name}` |
| GET | `/api/player/:playerId/history` | The last 60 days, grouped by day |
| GET | `/api/admin/results?date=` | Admin: the day's results including raw pasted text |
| DELETE | `/api/admin/results/:id` | Admin: delete a bad result, so the player can paste again |

Validation:
- The player id must be a UUID.
- Names are trimmed, stripped of control characters and limited to 1–30 characters. They are always rendered as text.
- Pasted text is capped at 2000 characters.
- `date` must not be in the future.
- `POST /api/results` allows 30 requests per 10 minutes per IP.
- Admin needs `Authorization: Bearer $ADMIN_PASSWORD`, compared in constant time. The admin API returns 404 when the password is unset.

## Pages

`/` today's dashboard · `/games/:gameId` · `/leaderboard` (with previous and next day) ·
`/leaderboard/:gameId` · `/history` · `/settings` (rename, add to home screen) · `/admin`

## Local setup

```bash
cd daily-games-hub
npm install
npm run dev          # http://localhost:3000
```

- Without `DATABASE_URL`, the app runs an embedded Postgres (PGlite) in `.data/pglite` and migrates it on start, so no setup is needed. Delete `.data/` to reset.
- To use a real Postgres locally, set `DATABASE_URL` and run `npm run db:migrate`.
- To try it on your phone, open the "Network" URL that `next dev` prints, on the same Wi-Fi.

Other commands: `npm test`, `npm run typecheck`, `npm run build`, `npm run check` (all three),
`npm run db:generate` (after changing `src/server/db/schema.ts`).

## Environment variables

| Name | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | In production | Postgres connection string. Pooled URLs are fine (`prepare: false`). |
| `ADMIN_PASSWORD` | No | Enables `/admin`. Unset means admin is off. |

## Deploying (Vercel + Neon, both free)

1. In this folder: `vercel link`, creating a new project `daily-games-hub`.
2. Add Postgres: Vercel dashboard → the project → Storage → Create Database → Neon (free). This sets `DATABASE_URL`. Any other Postgres works too: set `DATABASE_URL` yourself.
3. Optionally: `vercel env add ADMIN_PASSWORD production`.
4. `vercel deploy --prod`. The `vercel-build` script applies migrations and then builds, and it fails loudly if `DATABASE_URL` is missing.
5. Share the URL in the WhatsApp group.

## Known limitations

- **Results are self-reported.** Share text is plain text, so anyone can type a fake one. The grid check stops typos, not intent. The UI says this on every leaderboard.
- **Absolute Cinema's share text has no date.** A replay of an old day through its Time Machine looks identical to today's result. The hub can only stamp it with the paste day.
- **Identity is per browser.** A new phone or cleared site data means a new player. Anyone who learns a player id could post as that player. That's acceptable for friends, and this is not authentication.
- **Evarra rolls over at the player's local midnight, not IST.** For a friend outside India, Evarra's "today" can differ from the hub's for part of the day, and their paste is then rejected as the wrong day.
- **The parsers are tied to each game's current share format.** If a game changes its template, pastes fail with a clear "couldn't read" message until its parser in `src/shared/parse/` is updated. Each parser's header comment shows the expected format.
- **There is no in-app admin control for renaming or disabling a game.** Change `src/shared/games.ts` and redeploy.

## Future improvements

- **Ask the game authors for a result hook.** A few lines calling `window.parent.postMessage(result, hubOrigin)` would let the hub embed a game and record results automatically. Contacts are in `FEASIBILITY.md`.
  - Evarra is yours, so it could be first. It would need an iframe game page and a `PostMessageResultProvider` alongside the paste box.
- **Optional bookmarklet.** A player could tap it on a game's page to read that game's own localStorage and send the result. It's legitimate because it runs on the game's page, with the player's consent. It's clunky on mobile, though.
- Weekly or monthly standings, and streaks.
