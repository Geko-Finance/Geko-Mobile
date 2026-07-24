# UI And Component Rules

## Platform Strategy

### iOS

- Prefer native-feeling components.
- `@expo/ui` is planned, but currently gated by EAS iOS build compatibility.
- Use `*.ios.tsx` for iOS-only behavior or appearance.
- Future Swift/custom iOS components should be wrapped behind small React APIs.

### Android

- Prefer Gluestack and NativeWind.
- Use `*.android.tsx` for Android-specific behavior or appearance.

### Shared API

Screens should import stable app components instead of choosing platform internals directly.

Example:

```txt
Screen -> AppButton -> AppButton.ios.tsx / AppButton.android.tsx
```

## Component Rules

- TypeScript only.
- Keep props semantic and easy to customize.
- Avoid business logic in UI components.
- Keep layout predictable with explicit sizing for cards, tabs, buttons, and rows.
- Use NativeWind for most styling.
- Use Gluestack when existing generated UI components are already the best fit.

## Asset Components

Do this:

```tsx
<FinanceCard owner="Jonathan Doe" balance="$6,480.00" color="blue" />
```

Avoid this:

```tsx
<FinanceCard image={require("...")} />
```

The component should own asset selection.

## Accessibility

- Buttons need `accessibilityRole="button"`.
- Text must not overlap or overflow.
- Use sufficient contrast.
- Respect safe area insets for sticky headers, tabs, and absolute elements.
