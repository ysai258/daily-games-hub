# Daily Games Hub — Feasibility Report (Phase 0)

> **Decision (2026-09-26):** every game opens on its own site in a new tab. The player
> pastes the game's share text into the hub, which identifies the game from the link
> (or title) in the text and records it under the IST day of the paste. The first
> result per game per day wins. There are no iframes and no changes to any game,
> including Evarra. The analysis below is what that decision rests on.

Investigated 2026-09-26. Every finding comes from live HTTP responses, the games'
shipped JS bundles (two of them publish production source maps), or, for Evarra,
the source repo. Nothing here is guessed; where a fact could not be established it
says so.

## Summary

| Game | Iframe possible | Storage | Result accessible to hub | postMessage | Frame blocked | Integration approach |
|---|---|---|---|---|---|---|
| Absolute Cinema | **Yes** | localStorage `ac_games_v1` | No (cross-origin; API CORS-locked to own origin) | None | No | **iframe + pasted share text** (self-reported) |
| Aadu Gajala | **No** | localStorage `gaana-bajana:*` | No | None | **Yes — `X-Frame-Options: DENY`** | **open in new tab + pasted share text** (self-reported) |
| Evarra | **Yes** | localStorage `evarra:v3:games` | **Yes, once we add it** — we own the source | None today; we can add one | No | **iframe + postMessage** (source owned by ysai258) |
| Pattukunte Pattucheera | **Yes** | localStorage (`gameStatus`, `currentIndex`, `day`, …) | No | None | No | **iframe + pasted share text** (self-reported, day-number checked) |

**The hub cannot read any game's localStorage, and it will not try to.** For
cross-origin iframes this is also doubly moot: modern browsers (Chrome 115+,
Firefox, Safari) partition an iframe's storage by the top-level site. A game played
inside the hub keeps **separate progress** from the same game played directly on its
own site. See [Embedding caveat](#embedding-caveat-partitioned-storage).

**Only Evarra can give a result automatically.** The other three have no
integration surface: no postMessage, no public API, no CORS. For those, the legitimate
option left is the PRD's Option D fallback: the player pastes the game's own share
text into the hub, and the hub labels the result **Self-reported**.

---

## Per-game findings

### 1. Absolute Cinema — https://absolute-cinema.in/

| Question | Finding |
|---|---|
| Iframe possible / works | Yes. No XFO, no CSP (enforced or report-only), no JS frame-busting. |
| X-Frame-Options / frame-ancestors | None / none |
| Storage | `localStorage.ac_games_v1` (all games), `ac_player_id`, `ac_admin_token`. No sessionStorage/IndexedDB. |
| Stored data | Per `"<mode>:<date>"`: `{mode, date, status: playing\|won\|lost, guessesUsed, clueIndex, score, history[{label,result}], tiles[5], completedAt}` |
| Score / guesses / completion / date | Yes / yes / yes / yes (IST date). Streak is recomputed, not stored. Share text is not stored. |
| postMessage | None in app code. Emergent's injected `emergent-main.js` posts console/error logs to `window.parent` with `"*"`. It is a third-party dev logger, it does **not** carry results, and it is not a supported interface, so we will not use it. |
| Network result | `POST /api/results {mode,date,won,guesses,score}` is sent to *its own* backend, keyed by cookie. The API rejects other origins (`400 Disallowed CORS origin`). Calling it server-side would be unauthorised use. |
| Public repo / licence | None found. Footer: "© 2026 Absolute Cinema. All rights reserved." Contact: absolutecinema2503@gmail.com |
| Documented integration / share endpoint | None |
| Service worker | None |
| Origin dependence | API base is compiled as `https://absolute-cinema.in/api`, so it works when framed (same backend). Session cookies are `SameSite=Lax` and are not sent in a cross-site frame, but the game does not need them to play. |
| Daily boundary | IST midnight (`Intl…timeZone: "Asia/Kolkata"`; server `next_reset …T00:00:00+05:30`) |
| Scoring | 5 guesses (skip uses one). Win on guess n = `{100,80,60,40,20}[n-1]` points; loss = 0. |

**Share text** (from `ShareCard.jsx`):
```
🎬 ABSOLUTE CINEMA
🟥🟥🟩⬜⬜
3 / 5

I guessed today's movie in 3 attempt(s)! Can you beat me?
https://absolute-cinema.in
```
A loss prints `0 / 5` and `🟥🟥🟥🟥🟥`. **The text has no date or puzzle number**,
and a Time Machine replay of a past day produces identical text. The hub has to
stamp it with the IST date on which it was received, and it cannot verify it.

### 2. Aadu Gajala — https://aadu-gajala.vercel.app/

| Question | Finding |
|---|---|
| Iframe possible | **No.** `X-Frame-Options: DENY` on every route checked (`/`, `/?date=`, `/api/daily`, 404, static assets). Also `CSP-Report-Only: frame-ancestors 'none'` (report-only, but XFO alone blocks all modern browsers). |
| JS frame-busting | None (irrelevant given XFO) |
| Storage | `localStorage["gaana-bajana:round:<YYYY-MM-DD>"]`, `gaana-bajana:stats`, `gaana-bajana:daily-challenge:<date>`, `gaana-bajana:playback-event`; `sessionStorage` seek position. |
| Stored data | Round: `{puzzleNumber, dateKey, status: playing\|won\|lost, attempts[{kind: correct\|wrong\|skipped,…}] (≤5)}`. Stats: `{played, won, currentStreak, maxStreak, distribution[5], lastCompletedPuzzle, …}` |
| postMessage | None |
| Network result | None. `/api/daily` and `/api/attempt` (server-signed round token) send **no CORS headers**. No results/leaderboard endpoint. |
| Public repo / licence | None found. Author contact: https://x.com/sarath_744 (footer). No terms/licence text. |
| Service worker | None |
| Daily boundary | IST midnight (`timeZone: "Asia/Kolkata"`). Puzzle #1 = 2026-08-12, so today is #46. |
| Scoring | 5 attempts with 2/4/7/10/15-second clips. Win on attempt N shows `N/5`, loss shows `X/5`. |

**Share text:**
```
ఆడు గజాల ఆడు #26 SEP

I guessed today’s song with the 7-second clue — 3/5 attempts! 🎶
× △ ■ □ □

Can you beat my score? 👀
Play now: https://aadu-gajala.vercel.app
#AaduGajalaAadu
```
The header carries a day and month (`#DD MON`) but no year. A past-day replay adds
`?date=YYYY-MM-DD` to the URL and says "this song" instead of "today’s song". Both
let the hub **reject replays and wrong-day pastes**. Watch out for the curly `’` in
the win line versus the straight `'` in the loss line, and for the em dash.

### 3. Evarra — https://ysai258.github.io/evarra/

| Question | Finding |
|---|---|
| Iframe possible | Yes. GitHub Pages sends no XFO/CSP, and the app has no frame-busting (`grep window.top/parent` finds nothing). |
| Storage | `localStorage["evarra:v3:games"]`: an archive keyed by date. Falls back to memory if storage throws. |
| Stored data | `GameState {date, celebrityId, currentStage, guesses[], hintsUsed[], score?, completed, won}` |
| postMessage | None today |
| Public repo / licence | https://github.com/ysai258/evarra: public, **no licence file**, but **owned by the hub's author** (`gh` is authenticated as ysai258), so modifying it is permitted. |
| Deploy | GitHub Actions deploys to Pages on push to `main`. |
| Daily boundary | ⚠️ **Player's local midnight**, not IST (`engine/date.ts`). This is the same for friends in India; see blockers. |
| Scoring | 5 attempts; points 500 → 100 (−80 per stage, −15 per hint); loss = 0. Share shows `n/5 · P points`. |

**Integration:** add a small hook, run when a game completes, that posts the result
to the parent frame:

```ts
window.parent.postMessage(
  { type: 'GAME_RESULT', v: 1, gameId: 'evarra', date, won, attempts, maxAttempts: 5, score, maxScore: 500, hintsUsed },
  HUB_ORIGIN, // exact origin, never "*"
);
```
The hub checks that `event.origin === 'https://ysai258.github.io'` and that
`event.source` is the Evarra iframe's `contentWindow`, and the server re-validates.
This proves the result came from the real Evarra page, but not that it wasn't
tampered with: the player controls their own browser.

### 4. Pattukunte Pattucheera — https://pattukunte-pattucheera.netlify.app/

| Question | Finding |
|---|---|
| Iframe possible | Yes. No XFO/CSP (`netlify.toml` only has a SPA redirect). No frame-busting. |
| Storage | localStorage: `currentIndex`, `currentGuesses`, `gameStatus` (`running\|completed\|failed`), `day`, `stats` (double-encoded JSON), `guessDistribution`, `lastPlayedGame`, `timeTravel-*`, `theme`. |
| postMessage | None |
| Network result | None. Results only go to Google Analytics events without a score. The puzzle data on S3 is public (`ACAO: *`), **including the answer** (`/{day}/meta-data.json`). |
| Public repo / licence | https://github.com/santoshimz/pattukunte-pattucheera, public, **no licence** (all rights reserved). |
| Service worker | Yes, a pass-through fetch handler only, so harmless when framed. |
| Framed-mode caveats | Share uses `navigator.share` / `navigator.clipboard`, so the iframe needs `allow="clipboard-write; web-share"`. Social buttons use `window.open`. |
| Daily boundary | IST midnight. Day N = days since 2022-05-22 00:00 IST (today = 1587). |
| Scoring | 5 attempts (skip counts). Win shows `N/5`, loss shows `0/5`. |

**Share text:**
```
Pattukunte Pattucheera Day 1587: 3/5

🟥🟥🟩⬛⬛

https://pattukunte-pattucheera.netlify.app
#PattukuntePattuCheera
```
Past-day replays print `Day 1500(Time Travelled): …` with 🟦 squares. The day number
lets the hub **check the paste against today's IST day** and reject replays.

---

## Options evaluated

| Option | Verdict |
|---|---|
| **A. iframe + postMessage** | **Evarra only.** It is the only game whose source we can modify. The others would need their authors to add a hook. |
| **B. Same-origin reverse proxy** | **Rejected.** It is technically plausible for the two CRA apps, but it means re-serving someone else's all-rights-reserved app under our origin. The PRD (§4, §33) forbids that without permission. It would also not help Aadu Gajala, whose server-signed API is same-origin. |
| **C. Adapter from source** | Only Evarra (same as A). Pattukunte's repo is public but has no licence, so we cannot fork and host it. |
| **D. Share-text parser** | **Adopted for Absolute Cinema, Aadu Gajala and Pattukunte.** All three produce fixed, parseable share text. Results are labelled *Self-reported*. |

## Embedding caveat (partitioned storage)

When Absolute Cinema or Pattukunte runs inside the hub's iframe, it gets a **fresh,
partitioned** localStorage. A friend who already played today on the real site will
see a new, unplayed game inside the hub, and replaying it is spoiled. So the game page
offers both **Play here** (iframe) and **Open original site** (new tab), with the
paste box underneath either way. For Aadu Gajala only "Open" exists.

The same applies to Evarra: progress played inside the hub is separate from
progress played directly on github.io. The hub records the result either way when
played in the hub. When played directly, the player can paste Evarra's share text
(`n/5 · P points`, dated), which also gets a parser.

## Scoring normalisation

**All four games use the same shape: up to 5 attempts, win on attempt N, or lose.**
That makes one comparable metric defensible without changing any game's meaning:

```
attemptsScore = won ? (6 - N) / 5 : 0        // 1st try = 100%, 5th = 20%, loss = 0%
```

This is exactly Absolute Cinema's own points table (100/80/60/40/20). The per-game
leaderboards show each game's **native** result (`3/5`, and Evarra's `340 pts`). The
overall view sums `attemptsScore` across the games played. Evarra's hint penalty is
not part of the overall score, because only Evarra has hints.

## Blockers & decisions needed

1. **Evarra change needs your go-ahead to push.** Adding the postMessage hook edits
   `ysai258/evarra`, and it only goes live after a push to `main` (which auto-deploys).
   I will make the change locally but will not commit, push or deploy without you.
2. **Evarra uses local midnight, not IST.** For friends in India this makes no
   difference. For a friend abroad, Evarra's "today" and the hub's IST day disagree for
   part of the day. Recommendation: the hub accepts an Evarra result whose `date`
   equals today in IST, and otherwise tells the player it is for a different day.
3. **Result update policy: first result wins** (recommended). All four games lock a
   day once it is finished, so a later different result for the same day can only be a
   replay (in another browser, the partitioned iframe or Time Machine) or a typo. A
   manual/self-reported result may be *replaced* by an automatic (postMessage) one,
   never the other way round. Mistakes go through admin delete.
4. **Self-reported is the norm.** 3 of the 4 games cannot be verified. The UI and
   README say so, as the PRD requires.
5. **Optional: contact the authors.** A 5-line postMessage snippet in each game would
   upgrade that game to automatic detection with no hub changes beyond config:
   Absolute Cinema at absolutecinema2503@gmail.com, Aadu Gajala at @sarath_744 on X,
   Pattukunte at santoshimz on GitHub.

## Recommended game config

As built (per the decision above), all four games use `integrationType: 'external'`
with the share-text parser. Switching a game to automatic detection later only needs
that game's author to post a result message; see the options table.

## Proposed stack

Vite + React + TypeScript SPA. The API is Node + TypeScript with Hono, run as Vercel
serverless functions in the same repo, so one deploy covers both. Data goes in
Postgres (Neon free tier) through Drizzle ORM with migrations, and Luxon handles IST
dates. There is no Redis and no auth provider; the rate limit is a small Postgres-backed
counter.
