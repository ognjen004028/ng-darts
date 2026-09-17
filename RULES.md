# Darts Scoring App — Rules (locked)

> Authoritative rule set for v1. Engines implement exactly what is written here;
> the UI never re-implements rules. Locked decisions are listed at the end of this file.

---

## Shared rules (both modes)

### Players
- 1–4 players, pass-and-play on one device.
- **Undo** reverts the last action (the last dart in X01; the last zone tap in Cricket).

### Dart values
| Throw | Value |
|-------|-------|
| Single segment 1–20 | 1–20 |
| Double segment (D1–D20) | 2–40 |
| Triple segment (T1–T20) | 3–60 |
| Outer bull (single bull) | 25 |
| Inner bull (double bull) | 50 |
| Miss | 0 |

- The inner bull counts as a **double** (D25) for double-in / double-out purposes.
- The outer bull is a **single** and can never satisfy double-in / double-out.

---

## X01

### Turns
- Turn order is **fixed rotation** by player order (as added in setup), starting with the first player.
- Each turn consists of up to **3 darts**. The turn automatically ends after the 3rd dart
  (or immediately on a checkout / bust / game end).
- A player may end a turn after 1 dart or 2 darts. End turn is not valid when the turn
  has 0 darts.
- **No turn limit** — the game lasts as many rounds as it takes (no 15-round cap like some
  machines enforce). A bust or missed turn never advances a global round counter.

### Settings
| Setting | Default | Options |
|---------|---------|---------|
| Starting score | **501** | 301, 501, 701 |
| Double in | **Off** | On / Off |
| Double out | **On** | On / Off |

### Scoring
- Each dart's value is subtracted from the player's remaining score.
- Remaining score can never go below 0.

### Bust (turn reverted)
A turn is **busted** — all darts of the turn are reverted and play passes to the next player — when:
1. Remaining score would go **below 0**.
2. Double out is **On**, and remaining score would reach **exactly 1**.
3. Remaining score would reach **0** with a throw that is not a valid checkout
   (i.e. the winning dart is not a double, when double out is On).

When double out is **Off**:
- Bust only when remaining score would go **below 0**.
- A player can check out on **0** with any dart (including S1).

### Double in (when On)
- Applies to each player's **first turn of the game**.
- The player must hit a double (including bull) on one of their first 3 darts before any score counts.
- Darts thrown before the double-in do not score. If the player uses all 3 darts without a double,
  the turn ends with no score (no penalty, not a bust).

### Double out (when On)
- The winning dart must be a double (including bull). Outer bull (25) cannot check out.

### Win
- A player wins immediately when their remaining score reaches **exactly 0** on a valid checkout.

---

## Cricket

### Play
- There are **no turns** and no dart keypad.
- A tap on a player's target zone adds **one single** dart for that player on that target.
- Any player's zones may be tapped while the game is in progress.
- A tap on a **closed** zone scores points when the standard scoring rules below allow it.
- **Undo** reverts the last tap.

### Settings
| Setting | Default |
|---------|---------|
| Targets | 15–20 + bull (7 targets, fixed for v1) |
| Scoring variant | **Standard** (not cut-throat) |
| Bull mark split | **Yes** — outer bull = 1 mark, inner bull = 2 marks |

### Marks
- A target is closed for a player once they have **3 marks** on it.
- Marks: single = 1, double = 2, triple = 3. Inner bull = 2, outer bull = 1.
- Extra marks beyond 3 are recorded and used for scoring (see below).

### Scoring (standard)
- A player scores **points only on targets they have closed** (≥3 marks), and **only while at least
  one opponent still has that target open** (< 3 marks).
- The dart that **closes** a target does not score points. Later darts on that target score
  only while an opponent still has the target open.
- Points equal the total dart value on a closed target: single = segment number,
  double = 2×, triple = 3×, inner bull = 50, outer bull = 25.
- Once **every** player has closed a target, it is dead: no further points are scored on it by anyone.

### Win & tie handling
- A player wins immediately when they close **all 7 targets** **and** their points are
  **greater than or equal to** every opponent's points.
- If a player closes all 7 targets while trailing in points, the game continues — they must
  keep scoring until they **tie or pass** the leader, at which point they win **immediately**
  (the instant equality is reached).
- If all players close all 7 targets (game deadlocked): the player with the **most points** wins.
  If points are **equal**, the match is a **draw** (finished, no winner).

---

## Locked decisions

| Question | Decision |
|----------|----------|
| X01 default starting score | 501 |
| X01 double in default | Off |
| X01 double out default | On |
| X01 bust on remaining 1 | Only when double out is On |
| X01 bull for checkout | Inner bull (50) counts as D25; outer bull (25) does not |
| Cricket scoring variant | Standard (not cut-throat) |
| Cricket points only when opponent open | Yes |
| Cricket bull mark split | Yes (outer = 1, inner = 2) |
| X01 turn order | Fixed rotation, first player starts |
| Cricket play | No turns; zone tap = one single dart; undo last tap |
| Cricket tie handling | Most points wins; equal points = draw |
