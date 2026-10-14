---
paths:
  - "src/**/*.ts"
  - "src/**/*.tsx"
---

# React rules (loaded when a .ts or .tsx file under src is touched)

- The TanStack Query cache is the only copy of server data; never mirror a
  query result into `useState` or a Zustand store. Zustand is client-only.
- No `useEffect` to derive state; compute during render. Effects synchronise
  with the outside world and return a cleanup.
- Zod at every boundary (API, forms, search params, env); types are
  `z.infer`, never a duplicate interface. No `any`, `!` or silencing `as`.
- Fetch through `apiFetch(path, schema, { signal })`; query keys from the
  feature's typed factory, complete with every input the fetch uses.
- Loaders start independent queries together (`Promise.all` of
  `ensureQueryData`); no query chain down the tree that is not a real
  dependency. No barrel `index.ts` re-exports; import the defining file.
- Every query consumer renders pending, error (with retry), empty and data.
- No `useMemo`, `useCallback` or `React.memo` without a measurement.
- `src/components/ui` is shadcn output: add with the CLI, never edit, never
  wrap. Style with Tailwind tokens from `src/index.css`, no arbitrary values.
- Native interactive elements, labels on every control, `aria-label` on
  icon buttons, `role="status"` on async regions, keyboard path for every flow.
- `key` is a stable id; controlled inputs stay controlled; lists over ~200
  rows are virtualised.
- Tests: Testing Library by role, the API mocked with MSW, `retry: false`;
  Playwright with `page.route`, no `waitForTimeout`. A bug fix ships with its
  test.
- Nothing secret in a `VITE_` variable. No `eslint-disable` without a task id.
