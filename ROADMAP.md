# Darts Scoring App — Feature Roadmap

> Working plan for implementing features one session at a time.
> Each numbered item is sized to fit in a single session. Start a new session per item,
> read this file + `architecture.md`, implement, run tests, then check the item off here.

---

## Current Status (August 2026)

| Area | Status |
|------|--------|
| Angular 19 standalone scaffold | ✅ |
| Routing (`''`, `setup/:mode`, `game/*`) | ✅ routes exist, game pages are placeholders |
| Home: gamemode + x01 score select | ✅ |
| `add-players` (1–4, editable names, emits `Player[]`) | ✅ |
| `Player` model | ✅ (only `id`, `name`) |
| Domain models (DartThrow, Turn, GameSession, …) | ❌ |
| X01 / Cricket engines | ❌ |
| `GameSessionService` | ❌ |
| Game route guard | ❌ |
| `dart-input` + turn flow UI | ❌ |
| Styling (all SCSS empty) | ❌ |
| Unit tests (real ones) | ❌ (karma+jasmine configured) |

---

## Phase 0 — Lock the rules (prerequisite, ~30 min)

Decide and document the rule variants before writing engines. Open questions from `architecture.md`:

- **X01:** default starting score (301/501/701), double-in / double-out defaults, bull = 25 or 50 on checkout
- **Cricket:** standard vs cut-throat scoring, points only when opponent still open, bull mark split (single/double bull)
- **Both:** turn order (fixed rotation for v1), cricket tie handling

**Deliverable:** a `RULES.md` in the repo. Engines implement exactly what it says; UI never re-implements rules.

---

## Phase 1 — Domain foundation (pure TS, fully tested)

**1.1 — Domain models** (`src/app/domain/models/`)
`DartThrow` (segment 1–20 | bull, multiplier 1/2/3, or miss), `Turn` (max 3 throws, playerId), `GameMode`, `GameSession` (mode, players, settings, per-player state, status `setup | in_progress | finished`), extended `Player` (`order`).
Extend the existing `player.ts` rather than rewriting.

**1.2 — X01 engine** (`src/app/domain/x01/`)
Pure functions/class, no Angular: `applyThrow`, `endTurn`, `undoLastThrow`, `isFinished`/`getWinner`. Enforce: subtract dart value, bust on <0 or invalid finish (revert turn), double-in / double-out toggles, win detection. Return structured results (`success | bust | invalid | game_won`) + optional `events[]` — never just state.

**1.3 — Unit tests for the engine**
Jasmine/karma is already wired. Cover: normal throws, bust revert, double-in/out, checkout, win detection. This is the cheapest place to prove the rules and the heart of the learning value.

**Acceptance:** `ng test` green; engine has zero Angular imports.

---

## Phase 2 — Session state + navigation

**2.1 — `GameSessionService`** (`src/app/state/game-session.service.ts`)
Single source of truth using `signal()`/`computed()`: `players`, `mode`, `x01Settings`, `gameState`. Home writes on Start; game screens read. Add `startGame(mode, players, settings)`, `reset()`.

**2.2 — Start button on Home**
Validate (≥1 player), write the session, navigate to `game/x01-game` or `game/cricket-game`.

**2.3 — Route guard** (`src/app/core/guards/game-session.guard.ts`)
Block `/game/*` when there is no valid session → redirect to `/`.

**Acceptance:** refresh on a `/game/*` URL bounces to home; Start navigates and the target page can read the session.

---

## Phase 3 — Playable X01 loop (first vertical slice)

**3.1 — `dart-input` shared component** (`src/app/shared/dart-input/`)
Buttons for segments 1–20 with S/D/T, bull, miss. Emits `DartThrow`; engines validate.

**3.2 — X01 game screen** (`src/app/features/x01-game/`)
Reads session; shows current player, remaining score per player, turn's darts so far, `End turn` and `Undo`. Win → `finished` status + winner banner.

**3.3 — `turn-summary` / `game-actions` shared components**
Small reusable widgets per `architecture.md`'s shared UI list.

**Acceptance:** two people can play a full 301 game on one device, no refresh. Undo removes the last dart correctly, including a busted turn.

---

## Phase 4 — Cricket

**4.1 — Cricket engine** (`src/app/domain/cricket/`)
Per `RULES.md`: marks (S/D/T → 1/2/3), close at ≥3, points on closed targets per chosen variant, win = all targets closed + tie-break.

**4.2 — Cricket game screen** (`src/app/features/cricket-game/`)
Scoreboard grid (15–20 + bull × players) with marks and points, same turn-flow widgets as X01.

**Acceptance:** full Cricket game playable; engine tests green.

---

## Phase 5 — Polish & persistence

**5.1 — Visual design pass** (all SCSS currently empty)
Basic layout/typography, scoreboard legibility, touch-friendly dart input for pass-and-play on one device.

**5.2 — localStorage session + match history**
Persist the in-progress game (refresh-safe) and finished matches for a simple history screen.

**5.3 — UX gaps**
New game / rematch from the finished state, confirm-before-leave on a live game.

---

## Phase 6 — Deferred (post-MVP, from `architecture.md`)

- Legs and sets
- Checkout suggestions (UI helper)
- Custom Cricket targets
- Statistics UI over match history
- Online multiplayer / accounts (needs backend: REST + WebSocket)
- NgRx — only if signal/service complexity demands it

---

## Suggested session order

Run items in this sequence — each builds on the previous:

1. Phase 0 → `RULES.md`
2. 1.1 → models
3. 1.2 → X01 engine
4. 1.3 → engine tests
5. 2.1 → `GameSessionService`
6. 2.2 + 2.3 → Start + guard
7. 3.1 → `dart-input`
8. 3.2 + 3.3 → X01 screen loop
9. 4.1 + 4.2 → Cricket
10. 5.1 → design pass
11. 5.2 → persistence/history
12. 5.3 → UX gaps
