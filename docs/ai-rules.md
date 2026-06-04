# AI Collaboration Rules

The team primarily uses Claude. These rules apply to Claude and any other coding agent.

## How To Work

- Inspect existing files before proposing changes.
- Prefer implementation over long plans when the task is clear.
- Keep diffs small and scoped.
- Do not rewrite generated UI code unless asked.
- Do not move architecture without updating docs.
- Do not add dependencies without a clear reason.
- Do not use destructive Git commands.

## Required Checks

For code changes:

```bash
npm.cmd run typecheck
```

For navigation, assets, config, dependencies, or Expo changes:

```bash
npm.cmd run lint
npm.cmd run doctor
```

## Decision Rules

- Backend data: TanStack Query.
- Local client state: Zustand.
- Sensitive persistence: SecureStore.
- Navigation: Expo Router.
- iOS native UI: `*.ios.tsx` or wrapped native components. Use `@expo/ui` only after EAS iOS compatibility is verified.
- Android UI: Gluestack/NativeWind.

## Prompt Template

Use this when delegating to Claude:

```txt
Act as a senior Expo/EAS fintech mobile engineer working in Geko Mobile.
Read CLAUDE.md first.
Make a small, typed, maintainable change.
Respect the architecture in docs/architecture.md.
Respect UI/platform rules in docs/ui-components.md.
Run typecheck and report results.
```
