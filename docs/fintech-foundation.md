# Fintech Foundation

## Implemented

- `SessionProvider` bootstraps session state from secure storage.
- Zustand owns client session state.
- TanStack Query owns server state cache and mutation defaults.
- `(app)` routes are protected and redirect anonymous users to `/login`.
- `(auth)` redirects authenticated users to `/home`.
- `apiRequest` centralizes base URL, timeout, auth header, JSON parsing, and API errors.
- `appConfig` reads runtime config from Expo `extra` with safe defaults.
- Secure JSON storage wraps `expo-secure-store` for typed session persistence.

## Next

- Replace placeholder auth with backend login and refresh-token flow.
- Add token refresh and global 401 handling.
- Add query invalidation on logout and session refresh.
- Replace mock auth API with backend integration.
- Add observability hooks without logging PII.
- Add environment values per EAS profile.
