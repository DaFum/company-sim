# Codebase Review — AI Startup Simulator

**Date:** 2026-07-14
**Scope:** Full review of `src/` (React + Vite + Phaser + Zustand, ~7,000 LOC)
**Baseline health:** `npm run lint` clean · `npm run test:run` 220/220 passing · `npm run build` succeeds

The project is in a healthy, working state. Findings below are things worth
addressing, ordered by severity. None block the build; several are functional
bugs where a feature silently does nothing.

---

## 1. Functional bugs (features that silently don't work)

### 1.1 Selected AI model is never sent to the API — HIGH

**Files:** `src/hooks/useAiDirector.js:139`, `src/services/aiService.js:20-66`, `src/components/ApiKeyModal.jsx:99-117`

`callAI` accepts a `model` parameter (6th arg), but the only real caller omits it:

```js
result = await callAI(apiKey, systemPrompt, fullState, true, aiProvider); // no model
```

Consequences:
- The Pollinations model dropdown in `ApiKeyModal` writes to `aiModel` in the
  store, but that value is **never read at call time** — Pollinations always
  runs with the default `'openai'` model. The selector is purely cosmetic.
- The OpenAI branch **hardcodes** `model: 'gpt-4o-mini'` (`aiService.js:58`) and
  ignores the `model` argument entirely, so even passing it would have no effect
  there.

**Fix:** pass `aiModel` from the store into `callAI`, and use the `model`
argument in the OpenAI branch (`model` instead of the hardcoded literal).

### 1.2 Terminal decision overlay shows an empty reason — MEDIUM

**File:** `src/components/RetroTerminal.jsx:33`

```jsx
<p className="decision-reason">"{pendingDecision.reason}"</p>
```

The decision object produced by `formatDecision` (`useAiDirector.js:67-74`) has
no `reason` field — it's called `reasoning`. `DecisionPopup.jsx:20` correctly
uses `decision.reasoning`. The terminal overlay renders `""` every time.
**Fix:** use `pendingDecision.reasoning`.

### 1.3 REFACTOR's "productivity halted" effect is instantly overwritten — MEDIUM

**Files:** `src/store/gameStore.js:540-543` (REFACTOR), `540-544` (crunch), `689-717` (startNewDay)

Pending decisions are applied at the end of the day, in the crunch branch of
`advanceTick`:

```js
if (newTick > 60) {
  if (state.pendingDecision) state.applyPendingDecision(); // sets productivity: 0
  state.startNewDay();                                     // resets productivity to 10/12
  return;
}
```

`startNewDay` unconditionally resets `productivity` to `12` (with coffee machine)
or `10`. So `REFACTOR`'s `updates.productivity = 0` is wiped microseconds later
and the intended "lose a day of productivity" penalty never actually happens —
only the technical-debt reduction persists. The prompt (`prompts.js:53-56`)
advertises the penalty, so behavior contradicts documentation.
**Fix:** track a "refactoring" flag that survives `startNewDay` for one day, or
apply the productivity penalty to the following day explicitly.

### 1.4 Worker traits never appear on the sprites — MEDIUM

**Files:** `src/game/scenes/MainScene.js:931-943`, `src/game/sprites/WorkerSprite.js:30,126-130`

`WorkerSprite` supports trait markers (🔥 10x, 🤢 toxic, 👶 junior) via its
`trait` constructor arg, but `spawnWorker` never passes one:

```js
const worker = new WorkerSprite(this, x, y, role, Date.now()); // trait defaults to 'NORMAL'
```

The scene subscribes only to `state.roster` (role **counts**), not to
`state.employees` (which carry traits), so the visual layer has no way to know a
worker's trait. Result: trait icons are dead code and the store's trait system is
invisible in-game. **Fix:** sync sprites against `employees` (or include a trait
breakdown in the roster subscription) and pass the trait into `spawnWorker`.

### 1.5 `startNewDay` force-resumes the game every day — LOW

**File:** `src/store/gameStore.js:710`

`startNewDay` sets `isPlaying: true` unconditionally. If the player paused during
the previous day, the game silently un-pauses at the day boundary. Preserve the
prior `isPlaying` value unless auto-resume is intended.

---

## 2. Dead / unreachable logic

> **Status: RESOLVED.** All three items in this section were integrated into the
> game rather than deleted — the event roll was rewritten around a weighted
> table, `COMPETITOR_CLONE` was made functional with a counter-play, and
> `clearTimers` was wired into app teardown. Details preserved below for context.

### 2.1 `COMPETITOR_CLONE` event is never triggered and has no effect — LOW — ✅ RESOLVED

*Fix:* added `COMPETITOR_CLONE` to the weighted chaos-event table so it can now
occur; while active it cuts demand to 70% (`advanceTick`); and `PIVOT` now
resolves it (the only way to escape the clone). The AI prompt documents this.

**File:** `src/store/gameStore.js:375-378, 701`

`triggerEvent` has a `COMPETITOR_CLONE` handler (duration `999`) and
`startNewDay` treats it as a persistent event, but nothing ever calls
`triggerEvent('COMPETITOR_CLONE')` — the random event roll in `advanceTick`
(`594-601`) only produces the other five types. Even if triggered, no code reads
it to alter revenue/gameplay. It's a fully dead feature.

### 2.2 `clearTimers` action is defined but never called — LOW — ✅ RESOLVED

*Fix:* `App` now calls `clearTimers()` in an unmount effect, so pending store
timeouts (e.g. the veto pizza-party timer) are cleared on teardown instead of
firing against a stale store.

**File:** `src/store/gameStore.js:299-305`

The store exposes `clearTimers` (and maintains a `timers` array), but no
component/hook invokes it — e.g. on unmount or reset. The veto pizza timer
self-removes, so today there's no leak, but the intended cleanup hook is unused.
Either wire it up (e.g. in an app-level unmount effect) or remove it.

### 2.3 Convoluted / partly-unreachable event roll — LOW — ✅ RESOLVED

*Fix:* replaced the nested `if/else` + double-`Math.random()` roll with a
declarative `CHAOS_EVENT_TABLE` (weights + optional gate conditions) and a
`rollChaosEvent` helper. Behaviour is preserved (debt-driven outages,
mood-gated resignations, "dodge" on unmet conditions) but readable and
extensible.

**File:** `src/store/gameStore.js:586-602`

`outageChance = 0.001 + technicalDebt/1000` is then gated again by
`Math.random() < outageChance * 10`, and one branch (`roll < 0.2`) is an explicit
"dodged" no-op. The nested probabilities are hard to reason about and make
TECH_OUTAGE very unlikely regardless of debt. Worth simplifying into a single,
documented weighted table.

---

## 3. Logic quirks worth a look

> **Status: RESOLVED.** All three items fixed and covered by new tests.

### 3.1 Non-dev roles accrue technical debt — LOW — ✅ RESOLVED

*Fix:* the `10x_ENGINEER` debt accrual (`+0.2`) is now gated to `role === 'dev'`
in `calculateEmployeeMetrics`, so 10x sales/support hires no longer add debt to
code they don't touch.

**File:** `src/store/gameStore.js:64-89`

`calculateEmployeeMetrics` adds `debtAcc += 0.2` for **any** `10x_ENGINEER`,
including sales/support employees, and applies `output = 4.0` to them too — but
that output is only counted for dev/sales roles. A 10x support hire silently
generates technical debt while producing nothing. Consider scoping trait effects
to relevant roles.

### 3.2 Multi-day events can't outlive a day — LOW — ✅ RESOLVED

*Fix:* `startNewDay` now carries over every event with `timeLeft > 0` instead of
wiping all non-`COMPETITOR_CLONE` events. Durations like `HUMAN_SICK`'s 120 ticks
now genuinely span multiple days, and the old `COMPETITOR_CLONE` special case is
subsumed by the general rule.

**File:** `src/store/gameStore.js:369,713`

`HUMAN_SICK` is created with `duration: 120` (2 days' worth of ticks), but
`startNewDay` wipes all non-`COMPETITOR_CLONE` events, so the extra duration is
meaningless. Durations >60 for non-persistent events are misleading.

### 3.3 ID collisions from `Date.now()` — LOW — ✅ RESOLVED

*Fix:* employee IDs now come from a monotonic `nextEmployeeId()` counter
(`emp-1`, `emp-2`, …) at every creation site, guaranteeing uniqueness even for
bulk hires in one tick. This also makes sprite-to-employee matching (see 1.4)
collision-proof. (The `Date.now()` fallback left in `MainScene.spawnWorker` is
now only reached by unit tests; production sprites always receive the store's
counter ID.)

**Files:** `src/store/gameStore.js:191,458,737`, `src/game/scenes/MainScene.js:939`

Employee and sprite IDs use `Date.now()`. Bulk hires guard against this with
`Date.now() + i`, but single hires and the initial employee don't. Two hires in
the same millisecond, or an employee id equal to a sprite id, can collide. Prefer
a monotonic counter or `crypto.randomUUID()`.

---

## 4. Performance

> **Status: RESOLVED.** All three items fixed. Build now code-splits cleanly:
> app chunk dropped from ~1,572 kB to ~311 kB, with Phaser isolated in its own
> async, independently-cached chunk.

### 4.1 `App` subscribes to the entire store — MEDIUM — ✅ RESOLVED

*Fix:* replaced the single destructured `useGameStore()` call with individual
selectors (one per field), matching the pattern the other components already
use. `App` now re-renders only when a value it renders changes, not on every
unrelated store mutation.

**File:** `src/App.jsx:44-59`

```js
const { cash, day, tick, ... } = useGameStore();
```

Calling `useGameStore()` with no selector subscribes `App` to **every** state
change, so the whole component tree re-renders on every tick (and every event,
mood tick, etc.). Use individual selectors (as the other components do) or a
shallow-equality selector to scope re-renders.

### 4.2 Large single JS bundle (~1.5 MB) — LOW — ✅ RESOLVED

*Fix:* two changes — (1) `manualChunks` in `vite.config.js` splits `phaser` and
`react`/`react-dom` into dedicated vendor chunks; (2) `GameCanvas` is now
`React.lazy`-loaded behind a `Suspense` fallback, so Phaser lands in an async
chunk and the HUD paints first. Result: main app chunk `1,572 kB → 311 kB`,
Phaser isolated at ~1,208 kB (cached across deploys). The warning limit is
raised past Phaser so genuine app-code bloat still surfaces.

**Build output**

`dist/assets/index-*.js` is 1,572 kB (mostly Phaser) and trips Vite's 500 kB
warning. Consider `manualChunks` to split Phaser, or lazy-loading the game canvas.
`eruda` (506 kB) is already dynamically imported behind `?eruda=true`, which is good.

### 4.3 Single floating-number slot — LOW — ✅ RESOLVED

*Fix:* `App` now keeps an array of floaters (append on cash swing, remove by id
on complete) instead of a single slot, so rapid changes each render their own
number. IDs come from a monotonic ref, and the completion callback is
`useCallback`-stable so `FloatingNumber`'s dismiss timer isn't reset every tick.

**File:** `src/App.jsx:62-78`

`setFloater` replaces any in-flight floater, so rapid cash swings drop earlier
numbers. A small array/queue would render them all if that's desired.

---

## 5. Security / configuration

### 5.1 Browser-side OpenAI key with `dangerouslyAllowBrowser` — MEDIUM (by design, document it)

**Files:** `src/services/aiService.js:56`, `src/store/gameStore.js:166,244-247`

The OpenAI key is entered client-side, stored in `sessionStorage`, and used with
`dangerouslyAllowBrowser: true`. For a BYOK toy this is a deliberate trade-off
(noted in the modal + `memory.md`), but it's worth an explicit warning to users
that the key is exposed to any script running on the page and travels directly
from the browser. No server proxy exists to mitigate.

### 5.2 CI does not run lint or tests — MEDIUM

**File:** `.github/workflows/deploy.yml`

The only workflow builds and deploys to GitHub Pages on push to `main`. There is
no CI step running `npm run lint` or `npm run test:run`, so the 220-test suite and
ESLint never gate merges. Adding a `test` job (or steps before build) would catch
regressions like 1.2 above.

### 5.3 `canvas` native dependency is unused and can break `npm ci` — MEDIUM

**File:** `package.json:33`

`canvas@^3.2.1` is a devDependency but is **not imported anywhere in `src/`**
(the Vitest config aliases Phaser to a mock and uses jsdom/happy-dom). It requires
native compilation (Cairo/Pango), which failed to build in this environment and is
a common CI failure point. Removing it (tests pass without it via
`--ignore-scripts`) would slim installs and de-risk CI. Verify no transitive need
before dropping.

---

## 6. Code quality / consistency

### 6.1 Mixed German/English strings — LOW

**Files:** `src/services/aiService.js:28,68`, `src/services/prompts.js` (whole prompt), various UI

Error messages like `'Kein API Key vorhanden.'` / `'Leere Antwort von der KI.'`
and the entire system prompt are German, while the UI is English. A prior commit
("Fix localization") standardized parts; the service layer and prompt remain
German. Pick one language (or externalize strings) for consistency.

### 6.2 Redundant `import '../App.css'` — TRIVIAL

**File:** `src/components/AiStatus.jsx:3`

`App.jsx` already imports `App.css`; the duplicate import in `AiStatus` is
unnecessary (harmless due to bundler dedup).

### 6.3 Commented-out post-processing blocks — TRIVIAL

**File:** `src/game/scenes/MainScene.js:182-193`

A disabled tilt-shift/vignette/bloom stack is left commented in `create()`. Either
restore it behind a capability check or remove it to reduce noise.

### 6.4 `getAvailableModels` always hits Pollinations — TRIVIAL

**File:** `src/components/ApiKeyModal.jsx:36-44`, `src/services/aiService.js:3-18`

The modal fetches the Pollinations model list on mount regardless of the chosen
provider. Harmless (graceful fallback), but it's an unconditional network call
even for OpenAI-only users.

---

## Summary table

| # | Finding | Severity | Type | Status |
|---|---------|----------|------|--------|
| 1.1 | Selected AI model never sent to API | High | Bug | Open |
| 1.2 | Terminal decision reason renders empty (`.reason` vs `.reasoning`) | Medium | Bug | ✅ Fixed |
| 1.3 | REFACTOR productivity penalty instantly overwritten | Medium | Bug | ✅ Fixed |
| 1.4 | Worker traits never shown on sprites | Medium | Bug | ✅ Fixed |
| 1.5 | `startNewDay` force-resumes after pause | Low | Bug | ✅ Fixed |
| 2.1 | `COMPETITOR_CLONE` never triggered / no effect | Low | Dead code | ✅ Fixed |
| 2.2 | `clearTimers` defined but unused | Low | Dead code | ✅ Fixed |
| 2.3 | Convoluted, partly-unreachable event roll | Low | Clarity | ✅ Fixed |
| 3.1 | Non-dev roles accrue technical debt | Low | Logic | ✅ Fixed |
| 3.2 | Multi-day event durations meaningless | Low | Logic | ✅ Fixed |
| 3.3 | `Date.now()` ID collisions | Low | Robustness | ✅ Fixed |
| 4.1 | `App` subscribes to entire store | Medium | Perf | ✅ Fixed |
| 4.2 | ~1.5 MB JS bundle | Low | Perf | ✅ Fixed |
| 4.3 | Single floating-number slot | Low | Perf | ✅ Fixed |
| 5.1 | Client-side key + `dangerouslyAllowBrowser` | Medium | Security | Open |
| 5.2 | CI runs no lint/tests | Medium | Tooling | Open |
| 5.3 | Unused native `canvas` dep breaks installs | Medium | Tooling | Open |
| 6.1 | Mixed German/English strings | Low | Consistency | Open |
| 6.2 | Redundant CSS import | Trivial | Cleanup | Open |
| 6.3 | Commented-out postFX block | Trivial | Cleanup | Open |
| 6.4 | Unconditional Pollinations models fetch | Trivial | Cleanup | Open |
