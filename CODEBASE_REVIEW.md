# Codebase Review — AI Startup Simulator

**Date:** 2026-07-16  
**Scope:** Full repository review focused on `src/`, project configuration, tests, and deployment workflow.  
**Baseline health:** `npm run lint` clean · `npm run test:run` passing · `npm run build` succeeds without the previous Eruda `eval` warning.

The project is in a healthy state overall: the React/Vite shell, Zustand simulation store, Phaser scene bridge, AI director, and tests are aligned and currently pass the standard checks. The previously documented findings have been addressed in the follow-up implementation described below.

---

## Executive summary

- **No release-blocking source failures were found.** Lint, tests, and production build all pass.
- **Core gameplay architecture is coherent.** Simulation state lives in `gameStore`, AI actions are centralized in `actionRegistry`, React reads store slices with selectors, and Phaser subscribes to store changes instead of duplicating domain state.
- **CI now gates deploys with checks.** GitHub Pages deployment runs lint and the Vitest suite before building.
- **The BYOK tradeoff is now explicit.** OpenAI keys are still client-side by design, and the modal/README now warn users to use restricted or temporary keys.
- **The original review findings are resolved.** The file now tracks the remediation state rather than stale open items.

---

## Findings status

### 1. Deployment CI builds but does not gate on lint/tests — RESOLVED

**Files:** `.github/workflows/deploy.yml`, `package.json`

The deploy workflow now runs `npm run lint` and `npm run test:run` before `npm run build`, so GitHub Pages deployment is gated by the same local checks.

**Why it matters:** regressions can reach `main` and deploy if they still compile. This project has a meaningful Vitest suite around store logic, AI service behavior, hooks, Phaser scenes, and click paths, so not using it in CI leaves avoidable risk.

**Resolution:** lint and test steps were added before the build step.

---

### 2. Browser-side OpenAI key exposure is intentional but should be more visible — RESOLVED

**Files:** `src/services/aiService.js`, `src/store/gameStore.js`, `src/components/ApiKeyModal.jsx`, `memory.md`

The app stores the user-provided key in `sessionStorage` and initializes the OpenAI browser SDK with `dangerouslyAllowBrowser: true`. The modal and README now explicitly tell users to use a restricted or temporary key because it is used directly from the browser.

**Why it matters:** the current modal copy says the key is stored in session storage, but it does not explicitly tell users that a browser-executed key is exposed to client-side scripts and should be a restricted/throwaway key. That distinction matters for trust.

**Resolution:** added a plain-language browser-key warning to the API-key modal and README.

---

### 3. Build emits an Eruda `eval` warning — RESOLVED

**Files:** `src/main.jsx`, build output, `package.json`

Eruda is now development-only, so production builds no longer include the optional debug dependency or emit the previous dependency-level `eval` warning.

**Why it matters:** this is probably acceptable for optional debugging, but dependency `eval` warnings can mask future build warnings and may concern reviewers/security scanners.

**Resolution:** restricted Eruda loading to development builds and documented that behavior in README.

---

### 4. Native `canvas` devDependency appears unused — RESOLVED

**Files:** `package.json`, `vitest.config.js`, `src/test/setup.js`

`canvas` was listed in devDependencies, but repository search found no direct import. It has been removed as a direct project dependency in `package.json`; Phaser remains aliased to the local mock in Vitest, and tests now run on `happy-dom`. `canvas` may still appear in `package-lock.json` only as optional transitive metadata from Vitest/jsdom, not as an app-owned dependency.

**Why it matters:** `canvas` is a native package and can make installs slower or more brittle in CI because it may require system libraries. If it is not needed, removing it would simplify dependency installation.

**Resolution:** removed the direct `canvas` dependency, switched tests to `happy-dom`, and verified install/test/build behavior.

---

### 5. Mixed German/English code comments and user-facing strings — RESOLVED

**Files:** `src/App.jsx`, `src/services/aiService.js`, `src/services/prompts.js`

The visible UI and AI-service errors are now English, and README documents the language rule: player-facing UI stays English while the AI system prompt may remain German when that wording is intentional for prompt tuning.

**Why it matters:** inconsistent language makes future copy and test expectations harder to maintain. It also creates ambiguity about whether AI-facing prompt text should match UI language.

**Resolution:** converted touched comments/errors to English and documented the UI/prompt language rule.

---

### 6. API-key modal fetches Pollinations models even for OpenAI-only users — RESOLVED

**Files:** `src/components/ApiKeyModal.jsx`, `src/services/aiService.js`

The modal no longer loads Pollinations models on mount. It fetches them only when the Pollinations button or model selector receives focus/click/hover intent.

**Why it matters:** it adds latency/noise to the initial modal and can create avoidable console warnings in offline or restricted environments.

**Resolution:** lazy-load Pollinations models on user intent.

---

### 7. Some comments describe old implementation details rather than current behavior — RESOLVED

**Files:** `src/App.jsx`, `src/store/actionRegistry.js`, `src/store/gameStore.js`

The touched stale comments in `App.jsx`, `ApiKeyModal.jsx`, and service error text were cleaned up while keeping nearby behavior unchanged.

**Why it matters:** stale comments are low-cost individually but can mislead future agents in a codebase with fast-moving game logic.

**Resolution:** cleaned only comments in the files already touched for the findings.

---

## Strengths observed

- **Action handling is centralized.** AI/game actions are declared in `ACTION_DEFINITIONS`, which keeps titles, costs, effects, validation, and execution behavior together.
- **Store-derived helpers are mostly synchronized.** Headcount helpers (`workers`, `roster`) are recalculated after employee-changing actions and during ticks.
- **React render scope has improved.** `App` uses individual Zustand selectors rather than subscribing to the whole store.
- **Phaser lifecycle cleanup exists.** `GameCanvas` destroys the Phaser instance on unmount, and `MainScene` tracks store unsubscribers for cleanup.
- **Tests cover the important seams.** The suite includes store behavior, AI service/prompts, hooks, Phaser scenes, and click paths.
- **Bundle splitting is intentional.** Vite isolates Phaser and React vendor chunks, keeping the app chunk much smaller than the Phaser engine chunk.

---

## Verification performed

| Command                                                                                                              | Result | Notes                                                                                 |
| -------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------- |
| `git status --short`                                                                                                 | Passed | Confirmed working tree before review edits.                                           |
| `git log --oneline -5`                                                                                               | Passed | Reviewed recent project history as requested by repo guidance.                        |
| `rg --files -g '!node_modules' -g '!dist' -g '!build'`                                                               | Passed | Mapped repository structure without recursive `ls`.                                   |
| `rg "from 'canvas'\|from \"canvas\"\|require\\('canvas'\\)\|canvas" -n . -g '!node_modules' -g '!package-lock.json'` | Passed | Found no direct native `canvas` import; only stubs/styles/docs/dependency references. |
| `npm run lint`                                                                                                       | Passed | ESLint completed with no errors.                                                      |
| `npm run test:run`                                                                                                   | Passed | 9 test files, 259 tests passed after the remediation changes.                         |
| `npm run build`                                                                                                      | Passed | Build completed without the previous Eruda dependency-level `eval` warning.           |

---

## Follow-up priority

All findings from this review have been addressed. Future review should focus on new product or gameplay issues rather than the resolved items above.
