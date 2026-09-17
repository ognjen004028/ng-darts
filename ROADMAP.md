# Darts Scoring App — Feature Roadmap

> Working plan for implementing features one session at a time.
> Each numbered item is sized to fit in a single session. Start a new session per item,
> read this file + `architecture.md` + `RULES.md`, then check the item off here.

---

## Commit strategy

- **Commits are made by the owner only — never automatic.** Agents prepare work
  and leave changes uncommitted for the owner to review and commit.
- **One commit per roadmap item** (or per natural stopping point within a long item).
  Commit at the end of each session so the next session starts from a clean tree.
- **Always commit green:** the owner confirms typecheck + tests pass before every
  commit. Agents do **not** run `ng test` or `test:ci`.
- The owner runs tests in the browser (`ng test`) before commit. Do not run
  headless tests.
- **Implementation ships with its tests** in the same commit — the tests are the proof
  the engine works, so they belong with the code.
- **Follow the repo's existing style** (`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`
  prefixes). Match the tone of past commits.
- **Split only at clean seams.** If an item is one interdependent change (e.g. models +
  the engine that uses them), one commit beats an artificial split. Split when the parts
  are independently reviewable and each leaves tests green.
- **Keep scaffolding/tooling with the feature that needs it** (e.g. `karma.conf.js` went
  in with the first engine tests), and **never commit temp/generated artifacts**
  (e.g. the deleted `.tmp-spec-run/`).
- **Docs checkboxes** (`ROADMAP.md`/`architecture.md` status) go in the same commit as
  the work they mark done, or in a tiny trailing `docs:` commit — not spread around.

---

## Current Status (September 2026)

| Area                                                       | Status                                                               |
| ---------------------------------------------------------- | -------------------------------------------------------------------- |
| Angular 19 standalone scaffold                             | ✅                                                                   |
| Routing (`''`, `game/*`, wildcard)                         | ✅ setup route removed; game pages are live                          |
| Home: gamemode + x01 score select                          | ✅                                                                   |
| `add-players` (1–4, editable names, emits `Player[]`)      | ✅                                                                   |
| `Player` model                                             | ✅ (`id`, `name`, `order`)                                           |
| `RULES.md` (rule variants locked)                          | ✅                                                                   |
| Domain models (DartThrow, Turn, GameSession, Player.order) | ✅                                                                   |
| X01 engine (throw/endTurn/undo/bust/double-in/out/win)     | ✅                                                                   |
| X01 engine unit tests                                      | ✅ (via `ng test`; headless: `ng test --karma-config=karma.conf.js`) |
| Cricket engine (marks, close, points, win/draw)            | ✅                                                                   |
| Cricket game screen (targets × players grid)               | ✅                                                                   |
| `GameSessionService` (signals, `startGame`/`reset`)        | ✅                                                                   |
| Game route guard (`/game/*` → `/`, mode must match)        | ✅                                                                   |
| `dart-input` (1–20 with S/D/T, bull, miss)                 | ✅                                                                   |
| `turn-summary` / `game-actions` widgets                    | ✅                                                                   |
| X01 game screen (scoreboard, undo, bust, win banner)       | ✅                                                                   |
| Styling                                                    | ✅ phone-first; Home / add-players / app shell SCSS; ~44px tap targets |
| Home: X01 double in / double out                           | ◻️ Phase 5.1b (engine defaults already match RULES.md)               |
| Persist live session                                       | ◻️ Phase 5.2                                                         |
| Match history screen                                       | ◻️ Phase 5.2b                                                        |
| Rematch / leave / resume                                   | ◻️ Phase 5.3                                                         |
| Capacitor Android wrap                                     | ◻️ Phase 6                                                           |

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
`DartThrow` (segment 1–20 | bull, multiplier 1/2/3, or miss), `Turn` (max 3 throws, playerId), `GameMode`, `GameSession` (mode, players, settings, per-player state, status `in_progress | finished`), extended `Player` (`order`).
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

- [x] **3.1 — `dart-input` shared component** (`src/app/shared/dart-input/`)
      Buttons for segments 1–20 with S/D/T, bull, miss. Emits `DartThrow`; engines validate.

- [x] **3.2 — X01 game screen** (`src/app/features/x01-game/`)
      Reads session; shows current player, remaining score per player, turn's darts so far, `End turn` and `Undo`. Win → `finished` status + winner banner.

- [x] **3.3 — `turn-summary` / `game-actions` shared components**
      Small reusable widgets per `architecture.md`'s shared UI list.

**Acceptance:** two people can play a full 301 game on one device, no refresh. Undo removes the last dart correctly, including a busted turn. (Covered by component + service specs; full UX check in the browser.)

---

## Phase 4 — Cricket

- [x] **4.1 — Cricket engine** (`src/app/domain/cricket/`)
  Per `RULES.md`: marks (S/D/T → 1/2/3), close at ≥3, points on closed targets per chosen variant, win = all targets closed + tie-break.

- [x] **4.2 — Cricket game screen** (`src/app/features/cricket-game/`)
  Scoreboard grid (15–20 + bull × players) with mark zones and Undo. No keypad, no turns.

**Acceptance:** full Cricket game playable; engine tests green. (Engine tests cover marks, scoring, win/deadlock/draw, undo; UX check in the browser.)

---

## Phase 5 — Polish & persistence

- [x] **5.1 — Visual design** (phone first, one device)
  - Create the three missing SCSS files: `home.component.scss`,
    `add-players.component.scss`, `app.component.scss`.
  - Layout for a phone screen first (pass-and-play, then Capacitor).
  - Home: mode, score, players, Start — readable layout.
  - Game: scoreboard first; dart pad large enough to tap (about 44px).
  - Pad the shell with `env(safe-area-inset-*)`. Set `viewport-fit=cover` on the
    viewport meta in `src/index.html`. Do not use hover-only controls.
  - Use the CSS variables already in `src/styles.scss`. Do not add a design system.

- [ ] **5.1b — X01 settings on Home**
  Engine already has `doubleIn` / `doubleOut`. Home currently sends only
  `startingScore`. Add two toggles. Defaults stay Off / On per `RULES.md`.
  Do not add Cricket setting UI. Targets and standard scoring stay fixed.
  Bust on remaining 1 applies only when double-out is On (`RULES.md` + engine).

- [ ] **5.2 — Persist live session only**
  - `localStorage` for `ActiveSession` with a **schema version**.
  - Restore on load so refresh on `/game/*` does not bounce to Home.
  - Guard still redirects when there is no valid stored session.
  - Required for Capacitor: the OS can kill the WebView. Stay on `localStorage`
    (no Preferences plugin until the wrap proves it is needed).

- [ ] **5.2b — Simple match history**
  Store finished matches and add a history screen + route. Not statistics
  (statistics stay Phase 7).

- [ ] **5.3 — UX around the session**

  | Gap | Current | Target |
  |-----|---------|--------|
  | New game | Banner button resets and goes Home | Keep that as **Leave to setup** |
  | Rematch | Missing | Same players + settings, new engine state, stay on the game route |
  | Leave while live | No in-app back | A Leave control + confirm |
  | Confirm leave | No `CanDeactivate` / `beforeunload` | Confirm in-app when `status === 'in_progress'`. Do **not** rely on `beforeunload` (it does not run in Capacitor). Hardware back is Phase 6. |
  | Home vs live session | Back to `/` keeps memory session | Home shows **Resume** and **New game** |
  | Win message | Banner and `.message` both say who won | Banner only; keep bust / invalid in `.message` |

  Optional later (not 5.3): show engine events (`target_closed`, `double_in`)
  in the message line. `result-message.ts` only maps result `type`.

---

## Phase 6 — Capacitor wrap (Android first)

The same Angular build runs in a native WebView. Do not move rules into native code.

- [ ] **6.1 — Add Capacitor**
  `@capacitor/cli`, `@capacitor/core`, `@capacitor/android`.
  Set `webDir` to `dist/darts-project/browser` (Angular 19 application builder).
  Keep `base href="/"`.

- [ ] **6.2 — Android project + sync**
  `ng build`, then `npx cap sync android`. Open in Android Studio and run on a device
  or emulator. Confirm Home → Start → live game → persist across app restart.

- [ ] **6.3 — Native chrome (optional, same phase if small)**
  StatusBar / SplashScreen. Hardware back: confirm-leave on a live game, else
  navigate Home. No extra plugins.

iOS waits until Android works (needs a Mac).

---

## Phase 7 — Deferred (post-wrap, from `architecture.md`)

- iOS Capacitor project
- Legs and sets
- Checkout suggestions (UI helper)
- Custom Cricket targets
- Statistics UI over match history (simple history is Phase 5.2b)
- Online multiplayer / accounts (needs backend: REST + WebSocket)
- NgRx — only if signal/service complexity demands it

---

## Suggested session order

Run items in this sequence — each builds on the previous:

1. Phase 0 → `RULES.md`
2. 1.1 → models
3. 1.2 → X01 engine
4. 1.3 → engine tests
5. 2.1 → `GameSessionService` ✅
6. 2.2 + 2.3 → Start + guard ✅
7. 3.1 → `dart-input` ✅
8. 3.2 + 3.3 → X01 screen loop ✅
9. 4.1 + 4.2 → Cricket ✅
10. 5.1 → design pass ✅
11. 5.1b → Home double in/out
12. 5.2 → persist live session
13. 5.2b → match history
14. 5.3 → rematch / leave / resume
15. 6.1 + 6.2 → Capacitor Android wrap
16. 6.3 → StatusBar / hardware back (optional)
