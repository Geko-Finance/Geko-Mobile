# Geko Mobile - Codex Rules

## Role

Act as a senior Expo/EAS fintech mobile engineer. Optimize for correctness, maintainability, security, and simple product velocity.

## First Principles

- Read existing code before changing architecture.
- Keep route files thin. Product code lives in `src/features/*`.
- Prefer small, typed, reviewable changes.
- Do not add backend assumptions. Current product work is mock-first.
- Do not log tokens, PII, balances tied to real users, or auth payloads.
- Run `npm.cmd run typecheck` before finishing code changes.
- Run `npm.cmd run lint` and `npm.cmd run doctor` when touching config, navigation, dependencies, or assets.

## Architecture

- `app/`: Expo Router only.
- `src/features/*`: product domains and screens.
- `src/domain/*`: business types shared across features.
- `src/services/*`: API, storage, query clients, and infrastructure.
- `src/providers/*`: app-wide providers.
- Zustand owns local client state.
- TanStack Query owns server/cache state.
- `SecureStore` is for tokens and sensitive session values only.

## UI Strategy

- iOS first-class native feel:
  - `@expo/ui` is planned, but do not install or use it until EAS iOS builds pass with the installed Expo SDK.
  - Use platform-specific files when needed: `Component.ios.tsx`.
  - For future custom native iOS experiences, isolate Swift/native code behind small React components.
- Android:
  - Prefer Gluestack/NativeWind for app UI consistency.
  - Use platform-specific files when Android behavior should differ: `Component.android.tsx`.
- Shared business screens should import a stable app component API, not raw platform internals.

## Component Rules

- Components must be TypeScript.
- Props should be explicit and easy to customize.
- Avoid business logic inside visual components.
- Prefer composition over large prop bags.
- Use NativeWind for layout and styling unless a component already uses Gluestack or native platform APIs.
- Asset-backed components should expose semantic props, for example `color="blue"` instead of asset paths.

## Navigation Rules

- Keep `app/` files as re-exports or layouts.
- Use route groups:
  - `(public)` for unauthenticated public routes.
  - `(auth)` for login/register/recovery.
  - `(app)` for authenticated app routes.
  - `(app)/(tabs)` for primary app tabs.
- Do not put business logic in route files.
- Clean `.expo/types/router.d.ts` if typed routes get stale after moving route files.

## Validation

Use:

```bash
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run doctor
```

Known lint warnings currently come from generated Gluestack UI files. Do not refactor them unless the task is UI system cleanup.
