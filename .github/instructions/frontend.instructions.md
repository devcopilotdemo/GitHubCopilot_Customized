---
applyTo: "frontend/**"
---

# Frontend instructions (React + TypeScript + Vite + Tailwind)

Scope: [frontend/src/](../../frontend/src/). Follow these when writing or reviewing frontend
code, including Copilot code review on pull requests touching this workspace.

## Existing patterns to follow

- **Function components with hooks**, no class components. Local UI state via `useState`,
  server state via `react-query`'s `useQuery` (see [frontend/src/components/entity/product/Products.tsx](../../frontend/src/components/entity/product/Products.tsx)) —
  do not hand-roll fetch-in-`useEffect` + manual loading/error state for server data.
- **Feature components live under `components/entity/<entity>/`**, one folder per entity, with
  a list view (e.g. `Products.tsx`) and a form (e.g. `ProductForm.tsx`). Cross-cutting UI
  (`Navigation`, `Footer`, `Login`) lives directly under `components/`.
- **Data fetching goes through `api/config.ts`** (`api.baseURL` + `api.endpoints`) with
  `axios`, not hard-coded URLs — extend `api/config.ts` for new endpoints rather than
  inlining a path string in a component.
- **Theming via `useTheme()`** (`ThemeContext`/`themeContextUtils`): conditionally apply
  `darkMode ? '...' : '...'` Tailwind classes as done throughout `Products.tsx`. Don't
  introduce a second theming mechanism (CSS-in-JS, separate dark-mode context, etc.).
- **Tailwind utility classes only** for styling; no new CSS files or inline `style={}` unless
  Tailwind genuinely cannot express it.
- **Accessibility attributes are part of the pattern, not optional**: existing components set
  `aria-label` on icon-only buttons and search inputs, and meaningful `id`s on interactive
  elements (see the quantity stepper in `Products.tsx`). Match this on new interactive elements.

## Review checklist — flag these as issues

1. **Class components or `React.FC` typing** instead of a plain typed function component —
   inconsistent with the rest of the codebase.
2. **Manual `useEffect` + `useState` data fetching** where `react-query` should be used
   instead, especially if it reimplements loading/error state already handled by `useQuery`.
3. **Missing loading/error states** on any new data-fetching component — every existing entity
   list handles `isLoading` and `error` explicitly; new ones must too.
4. **Hard-coded API URLs** instead of going through `api/config.ts`.
5. **Unhandled `undefined`/`null` array/object access**, e.g. rendering `product.price.toFixed(2)`
   without confirming `product` exists, or `.map()` on a possibly-`undefined` query result
   without the optional-chaining pattern already used (`filteredProducts?.map(...)`).
6. **Missing `key` props** on list items, or using array index as `key` when a stable ID
   (e.g. `productId`) is available.
7. **Accessibility regressions**: icon-only or ambiguous buttons without `aria-label`, form
   inputs without an associated label, or interactive elements that aren't keyboard reachable
   (non-button/anchor elements with only `onClick`).
8. **Inline secrets or environment-specific values** (API keys, absolute internal URLs) - these
   belong in Vite env vars (`import.meta.env`), never hard-coded in a component.
9. **Dead TODOs left as the whole implementation** (e.g. `// TODO: implement X` with an
   `alert()` standing in for real behavior) — acceptable only if the PR explicitly scopes that
   feature out; otherwise it should be implemented or tracked in an issue, not merged silently.
10. **`useEffect` without a correct dependency array**, or state updates that should be derived
    values computed during render instead of synced via an effect.

## Good React practice to apply, even where legacy code doesn't yet

- Extract repeated conditional Tailwind class strings (e.g. the `darkMode ? ... : ...` pattern
  repeated per element) into a small helper or co-located constant when a component has many
  of them, to keep JSX readable.
- Memoize expensive derived values (`useMemo`) or callbacks passed to many children
  (`useCallback`) only when there's a measurable reason — don't reach for them by default.
- Keep components focused: if a list component grows a modal, a filter bar, and a form inline,
  consider splitting it, following the existing `Products.tsx` / `ProductForm.tsx` split.
