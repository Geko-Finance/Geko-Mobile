# Architecture Rules

## Structure

```txt
app/                  Expo Router routes and layouts only
src/features/         Product domains, screens, hooks, feature APIs
src/domain/           Shared business types
src/services/         API, storage, TanStack Query, infrastructure
src/providers/        App-wide providers
src/assets/           Shared app assets
```

## Routing

- `app/` is only routing.
- Screens should be implemented in `src/features/*/screens`.
- Layout auth guards belong in route group layouts.
- Current primary tabs live in `app/(app)/(tabs)`.

## State

- Zustand: local app state, session status, UI preferences.
- TanStack Query: server state, cache, mutations, invalidation.
- SecureStore: sensitive persisted values only.

## Domain Types

Domain types live in `src/domain/*` and should not import React, navigation, or UI.

Examples:

- `Money`
- `Account`
- `Transaction`
- `Payment`
- `CustomerProfile`
- `KycState`

## Mock-First Rule

No backend exists yet. Keep UI connected through hooks/APIs so backend integration can replace mocks without rewriting screens.
