# OctoCAT Supply — Copilot Instructions

OctoCAT Supply is a demo supply-chain management app: an Express/TypeScript REST API and a
React/TypeScript frontend, managed as npm workspaces (`api`, `frontend`). See
[docs/architecture.md](../docs/architecture.md) for the ERD and component diagram, and
[README.md](../README.md) for the demo scenarios this repo is built around.

## Non-negotiables

These rules apply to every change, in every workspace, and should be treated as hard blockers
in code review, not style preferences:

1. **Never commit secrets or personal data.** No API keys, connection strings, tokens, real
   names/emails/phone numbers/payment data in code, seed data, tests, or fixtures. Use
   obviously synthetic placeholders (`test@example.com`, `sk_test_placeholder`).
2. **No raw string-concatenated SQL or shell commands built from user input.** This app has no
   SQL database today (in-memory arrays seeded from [api/src/seedData.ts](../api/src/seedData.ts)),
   but if persistence is added, all queries must be parameterized. Any `child_process` or
   template-built command must never interpolate unsanitized request input.
3. **Every route must validate and bound its inputs.** Path params parsed with `parseInt`
   must be checked with `Number.isFinite`/`isNaN` before use; request bodies must be checked
   for required fields before being trusted, not written straight into the in-memory store.
4. **No `any` in new TypeScript code.** Both workspaces compile with strict TypeScript
   ([api/tsconfig.json](../api/tsconfig.json), [frontend/tsconfig.app.json](../frontend/tsconfig.app.json)).
   Type request/response bodies against the model interfaces in `api/src/models/*.ts` or the
   frontend's local interfaces.
5. **Branch protection is real, not decorative.** Never commit directly to `main`. All work
   happens on a feature branch and lands via pull request.
6. **New or changed behavior needs a test.** API changes need a `vitest`/`supertest` test
   alongside the route (see `api/src/routes/*.test.ts`); non-trivial frontend logic should be
   covered too.

## Architecture at a glance

- **API** (`api/src/`): one Express router per entity in `routes/`, one interface per entity in
  `models/`, wired up in [api/src/index.ts](../api/src/index.ts). Data is in-memory, seeded
  from [api/src/seedData.ts](../api/src/seedData.ts) — there is no database and no ORM.
- **Frontend** (`frontend/src/`): React 18 + TypeScript + Vite + Tailwind. Feature UI lives
  under `components/entity/<entity>/`, cross-cutting UI under `components/`, contexts under
  `context/`.
- Routes are documented inline with `@swagger` JSDoc blocks and aggregated into
  `api/api-swagger.json` — keep these in sync when changing a route's shape.

Workspace-specific conventions and review checklists live in
[.github/instructions/api.instructions.md](instructions/api.instructions.md) and
[.github/instructions/frontend.instructions.md](instructions/frontend.instructions.md).

## Build, test, and run

```bash
npm install                          # root install, hydrates both workspaces
npm run build                        # build api + frontend (or the "Build API"/"Build Frontend" tasks)
npm run dev                          # run api + frontend concurrently
npm run test                         # run tests in both workspaces
npm run test:api                     # vitest for api only
npm run lint                         # eslint for frontend only
```

## Working conventions

- Prefer extending existing patterns over introducing new ones: follow the CRUD router shape
  in an existing `api/src/routes/*.ts` file, or the data-fetching/theming patterns in an
  existing `frontend/src/components/entity/*` component, rather than inventing a new one.
- Keep pull requests scoped to one feature/fix, with a description that links the issue it
  closes (`Closes #<n>`), matching the workflow in [demo.md](../demo.md).
- Do not add new runtime dependencies for something the existing stack already solves
  (axios + react-query for data fetching, Tailwind for styling, express for routing).
