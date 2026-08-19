---
applyTo: "api/**"
---

# API instructions (Express + TypeScript)

Scope: [api/src/](../../api/src/). Follow these when writing or reviewing API code, including
Copilot code review on pull requests touching this workspace.

## Existing patterns to follow

- **One router per entity** in `routes/<entity>.ts`, default-exporting an `express.Router()`,
  mounted in [api/src/index.ts](../../api/src/index.ts) under `/api/<entity-plural>`. Follow
  the CRUD shape already used in `routes/product.ts` / `routes/branch.ts`: `POST /`, `GET /`,
  `GET /:id`, `PUT /:id`, `DELETE /:id`.
- **One interface per entity** in `models/<entity>.ts`, documented with a `@swagger
  components/schemas` JSDoc block. Route handlers must type request/response bodies against
  these interfaces — do not use `any`.
- **In-memory store per router**, seeded by spreading from [api/src/seedData.ts](../../api/src/seedData.ts)
  (`let products: Product[] = [...seedProducts]`). Tests reset this via an exported
  `resetX()` helper (see `resetBranches` in `routes/branch.ts`) — add one for any new router.
- **Swagger JSDoc above every route**: keep the `@swagger` block's paths, params, request
  bodies, and response codes in sync with the actual handler. This is what drives
  `api/api-swagger.json` and the Swagger UI.
- **Tests live next to the route** as `routes/<entity>.test.ts`, using `vitest` + `supertest`
  + a fresh `express()` app per test (see [api/src/routes/branch.test.ts](../../api/src/routes/branch.test.ts)).

## Review checklist — flag these as issues

1. **Unvalidated path params.** `parseInt(req.params.id)` without an `isNaN`/`Number.isFinite`
   check can silently look up/mutate the wrong record or return a confusing 404. Validate and
   return `400` for a malformed id.
2. **Unvalidated request bodies.** `router.post('/', (req, res) => { products.push(req.body) })`
   trusts the client completely. New/changed routes should check required fields exist and
   have the right shape before writing to the store, and return `400` otherwise.
3. **Missing 404 handling.** Every `:id` route must handle the "not found" case explicitly
   (matching the existing `if (found) {...} else { res.status(404) }` pattern) — never assume
   the lookup succeeds.
4. **No raw SQL or shell interpolation.** There is no database in this app today; if a change
   introduces one, any query must be parameterized, never string-concatenated with request
   input. Same rule for `child_process` calls.
5. **Secrets and PII.** No hard-coded API keys, connection strings, tokens, or real personal
   data in route handlers, seed data, or tests. Config values (API keys, DB URLs) must come
   from `process.env`, following the `API_CORS_ORIGINS` pattern in [api/src/index.ts](../../api/src/index.ts).
6. **CORS and middleware changes.** Widening `cors()` origins or headers, or adding new global
   middleware, needs an explicit justification in the PR — it affects every route.
7. **Response codes match REST conventions**: `201` + created resource on `POST`, `200` on
   successful `GET`/`PUT`, `204` with empty body on `DELETE`, `404` when not found. Don't
   introduce ad hoc status codes without reason.
8. **Swagger docs and code must not drift.** If a handler's request/response shape changes,
   the `@swagger` JSDoc above it must change too.
9. **New routes need a test file** covering the happy path, the 404 path, and any new
   validation added.

## Good API design to apply, even where legacy code doesn't yet

- Prefer narrowing types over `any`/`unknown` casts; extend the entity interface in `models/`
  rather than reshaping data ad hoc in the route.
- Keep route handlers small — extract shared lookup/validation logic used by multiple routers
  into a helper rather than duplicating it.
- Use plural, kebab-case resource paths consistent with existing ones
  (`/api/order-details`, `/api/order-detail-deliveries`).
