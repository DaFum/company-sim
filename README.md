# AI Startup Simulator

A React + Vite + Phaser startup simulation game driven by a browser-side AI director.

## AI provider and key safety

The simulator supports Pollinations auth and bring-your-own OpenAI keys. OpenAI keys are stored in `sessionStorage` and used directly from the browser, so use a restricted or temporary key rather than a long-lived production secret.

The player-facing UI is English. The AI system prompt may remain German by design when prompt tuning benefits from that wording; user-visible errors and onboarding copy should stay English.

## Development commands

- `npm run dev` — start the Vite dev server.
- `npm run lint` — run ESLint.
- `npm run test:run` — run the Vitest suite once.
- `npm run build` — create a production build.

## Debug console

Eruda is available only in development builds. Start the dev server and add `?eruda=true` to the URL when mobile debugging is needed.

---

# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
