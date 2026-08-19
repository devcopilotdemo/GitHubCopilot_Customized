# Agentic SDLC + GHAS Demo Script

An end-to-end demo of the **`agentic-sdlc` Copilot plugin** driving a real feature into this
repository, plus the security guardrails that surround it: agent hooks that catch secrets and
personal data before they are committed, and GitHub Advanced Security catching what makes it
to the platform.

The narrative arc is deliberate:

> **Plan it. Track it. Build it. Guard it locally. Guard it on the platform.**

| # | Scenario | Time | Shows |
| --- | --- | --- | --- |
| 0 | Setup | 5 min | Plugin install, MCP, prerequisites |
| 1 | Plan a user story from an image | 5 min | `ent-planner`, vision, GitHub issue traceability |
| 2 | Implement the shopping cart | 10 min | `ent-orchestrator`, parallel delegation, branch + PR |
| 3 | PII hook blocks a commit | 4 min | `preToolUse` hook, `scan-pii` |
| 4 | Secret hook blocks a commit | 4 min | `preToolUse` hook, `scan-secrets` |
| 5 | GHAS: push protection and secret scanning | 5 min | Platform-side secret controls |
| 6 | GHAS: CodeQL and Copilot Autofix | 8 min | Vulnerability detection and AI remediation |
| 7 | GHAS: Dependabot | 5 min | Vulnerable dependency, automated PR |
| 8 | Copilot code review catches non-compliant code | 6 min | `copilot-instructions.md`, path-scoped instructions, Copilot code review |
| 9 | Code quality and review | 5 min | Copilot code review, `ent-tester` |

You do not have to run all of them. Scenarios 1 to 2 are the core story; 3 to 4 are the plugin
differentiator; 5 to 9 are the GHAS layer. Pick according to your audience and time.

---

## Scenario 0: Setup

Do this **before** the audience is watching.

### Install the plugin

```bash
copilot plugin marketplace add devcopilotdemo/ent-agent-plugins
copilot plugin install agentic-sdlc@ent-agent-plugins
copilot plugin list
```

Alternatively, install the plugin directly without adding the marketplace:

```bash
copilot plugin install devcopilotdemo/ent-agent-plugins:plugins/agentic-sdlc
```

For an enterprise-rollout talking point, show that the same thing can be pushed to every
developer through `managed-settings.json` rather than installed by hand:

```json
{
  "extraKnownMarketplaces": {
    "ent-agent-plugins": {
      "source": { "source": "github", "repo": "devcopilotdemo/ent-agent-plugins" }
    }
  },
  "enabledPlugins": { "agentic-sdlc@ent-agent-plugins": true }
}
```

### Prerequisites checklist

- [ ] Repository cloned locally (Codespaces works, but the hook demos are crisper locally).
- [ ] `gh auth status` is green, with permission to create issues and pull requests.
- [ ] GitHub MCP server available so `ent-planner` can create the issue.
- [ ] `npm install` has been run in `api/` and `frontend/` so builds are warm.
- [ ] Advanced Security enabled on the repo: **Settings > Code security** with CodeQL,
      secret scanning, push protection, and Dependabot alerts all on.
- [ ] Branch protection on `main` requiring a PR, so the branch/PR workflow is enforced and
      not just polite.
- [ ] `docs/design/cart.png` open in a tab, ready to show.

### Reset between runs

```bash
git checkout main && git pull
git branch -D feature/cart-implementation 2>/dev/null
gh pr list --state open   # close any leftover demo PRs
```

---

## Scenario 1: Plan a user story from an image

**Point to make:** planning is a distinct, reviewable step, and the plan leaves a durable
record on GitHub instead of evaporating with the chat session.

### Show the input first

Open `docs/design/cart.png`. Say plainly: this is all we have. A picture from a designer and a
sentence of intent. That is how most work actually arrives.

### Run the planner

```bash
copilot
```

```text
@ent-planner Plan the implementation of a shopping cart for this application,
based on the design in docs/design/cart.png. Review the existing API routes,
models and frontend components first so the plan fits the current architecture.
```

### What to narrate while it works

- It **reads the repo before planning.** Watch it open `api/src/routes`, `api/src/models`,
  and the frontend components. Contrast with a generic assistant that would invent a stack.
- It **reads the image.** The cart layout, line items, quantity controls, and totals in the
  plan come from `cart.png`, not from imagination.
- It produces a **task table with owners and dependencies**, and every acceptance criterion is
  phrased as something a test or a command can verify. Call out one criterion and ask the
  room: could you write a test for that? That is the bar.

### The traceability moment

The plan ends with a `## Traceability` section, and the planner asks for approval before it
touches GitHub. This is the beat worth pausing on:

> The plugin will not silently write to your GitHub. It proposes, you approve.

Approve it:

```text
Yes, create the issue.
```

Then switch to the browser and show the created issue. The body carries the goal, non-goals,
the full task table, and the acceptance criteria, so the issue stands alone as the record of
intent. Anyone can pick this up later, including Copilot coding agent.

> **Optional branch:** if you want to demo the async coding agent instead of continuing
> locally, assign the issue to Copilot right here and let it open the PR while you carry on
> with the security scenarios. Come back to it at the end.

---

## Scenario 2: Implement the shopping cart

**Point to make:** the orchestrator coordinates specialists, parallelizes what is genuinely
independent, and delivers a branch and a pull request rather than a pile of edits.

```text
@ent-orchestrator Implement the shopping cart plan from issue #<n>.
```

### Beats to call out

**Branch first.** Before it edits anything, a dedicated branch is created off `main`.
Show it live:

```bash
git branch --show-current
```

Nothing lands on the default branch. That is a rule in the agent definition, not a habit.

**Contract before fan-out.** Watch the orchestrator settle the cart API shape first, because
backend and frontend both depend on it. Then it fans out: `ent-backend-developer` on the cart
routes and model, `ent-frontend-developer` on the cart UI from the design spec, in the same
wave. Say the quiet part out loud: sequential delegation of independent work is wasted wall
clock time.

**Verification is a gate, not a formality.** `ent-tester` runs against the real
implementation. Show the actual test output.

```bash
cd api && npm test
```

**PR only after green.** The pull request is opened after validation passes, and its body
links the issue with `Closes #<n>`. Show the PR, then show the issue, now linked. Full loop:
image to issue to branch to tested code to PR to closed issue.

### Fallback

If a task fails live, do not fight it. That is a legitimate demo moment: the orchestrator
refuses to advance the wave and reports the blocker instead of declaring success on a diff
that does not compile. Say so, then re-delegate the failed task.

---

## Scenario 3: The PII hook blocks a commit

**Point to make:** the guardrail runs *inside the agent loop*, before the data ever reaches
git history. This is the failure mode that platform-side scanning cannot fully save you from,
because by then it has already been committed.

### Set the trap

Ask Copilot to do something entirely reasonable. This is the important framing: nobody in the
demo is being careless on purpose.

```text
Add seed data for a test customer to api/src/seedData.ts so I can exercise the
cart checkout flow. Include their contact details and a saved payment method.
```

The model will helpfully produce something like an email, a phone number, a date of birth, and
a card number. Realistic-looking test fixtures are exactly how personal data leaks into repos.

### Trigger the hook

```text
Commit this change.
```

The `preToolUse` hook fires on the shell tool, scans the **staged index** in `block` mode, and
**denies the commit**. The agent never gets to run `git commit`.

### What to show in the output

- Findings are **redacted**: only the first and last three characters survive. The guardrail
  does not itself become a leak in your terminal scrollback or CI log.
- Each finding names the **rule and severity**: `US_SSN` and `CREDIT_CARD` are critical,
  `EMAIL_ADDRESS` and `US_PHONE` are medium.
- Obvious placeholders like `@example.com` and `changeme` are ignored, so the thing is usable
  day to day rather than something people disable in week one.

### Show the remediation, not just the block

```text
Replace the personal data with clearly synthetic placeholders and commit again.
```

The commit now succeeds. The point lands better as *"it taught us the safe pattern"* than as
*"it said no."*

### Optional: show the controls

```bash
SCAN_MODE=warn ...          # report instead of blocking
SCAN_SCOPE=diff ...         # scan the working tree instead of the index
SCAN_ALLOWLIST=fixtures/    # suppress a known false positive
```

Note the guidance: narrow with `SCAN_ALLOWLIST` rather than reaching for `SKIP_SDLC_SCAN`.

---

## Scenario 4: The secret hook blocks a commit

Same mechanism, different detector, and a much sharper consequence.

### Set the trap

```text
Wire the cart checkout to the payments provider. Put the API key and the database
connection string in a config file so it runs locally.
```

Or, faster and just as honest, hand-edit a `.env`-style file with a fake Stripe key
(`sk_live_...`) and a Postgres connection string.

### Trigger and narrate

```text
Commit this.
```

Blocked again, with `STRIPE_SECRET_KEY` at critical severity and `CONNECTION_STRING` at high.

Talking points:

- The detector set is broad: cloud keys for AWS, GCP and Azure, every GitHub token format,
  private keys, connection strings, Slack, Stripe, SendGrid, Twilio, npm, and JWTs.
- Remediate properly on camera. Move the value to an environment variable and reference it
  from config, so the audience sees the correct pattern rather than just the refusal.

### The honest caveat

Say this out loud, because it earns credibility and it sets up Scenario 5:

> This hook is a safety net, not a control. It reduces accidental exposure. It does not
> replace GitHub secret scanning, push protection, or a real secret manager. If a genuine
> secret is ever detected, treat it as compromised and rotate it.

That sentence is the natural hand-off into the platform-side controls.

---

## Scenario 5: GHAS push protection and secret scanning

**Point to make:** defense in depth. The hook is developer-side and can be bypassed by someone
determined; push protection is server-side and cannot.

### Demo

1. Bypass the local hook deliberately, so the audience sees the layers are independent:

   ```bash
   SKIP_SDLC_SCAN=true git commit -m "temp: local config"
   git push
   ```

2. **Push protection rejects the push** at the remote. Show the terminal output: GitHub names
   the secret type and the exact file and line, and offers a bypass URL that requires an
   explicit, audited reason.

3. In the browser, walk **Security > Secret scanning** and cover:
   - Provider-validated secrets, where GitHub checks with the provider whether the credential
     is live.
   - Alert states and the audit trail of who bypassed what and why.
   - Push protection for custom patterns, if your org defines internal token formats.

### The framing sentence

Three chances to catch the same mistake: the agent hook before commit, push protection before
it reaches the remote, secret scanning after it lands. Each one exists because the previous
one can be skipped.

---

## Scenario 6: GHAS code scanning and Copilot Autofix

**Point to make:** finding vulnerabilities is table stakes; the interesting part is how fast
they get *fixed*.

### Introduce a realistic flaw

Ask for it in a way that mirrors real pressure to ship:

```text
Add an endpoint to api/src/routes that looks up cart line items by user ID,
using a raw SQL query for performance.
```

Concatenated SQL is a very natural thing for that prompt to produce. Push it on a branch and
open a PR.

### Demo

1. **CodeQL runs on the pull request.** Show the check and then the annotation inline on the
   diff, so the finding appears where the developer already is.
2. Open the alert and walk the **data flow path** from the request parameter to the sink.
   This is the difference between a pattern match and real semantic analysis.
3. Click **Generate autofix**. Copilot Autofix proposes a parameterized query with an
   explanation of the reasoning.
4. Commit the suggested fix and show the alert close automatically on the re-scan.

### Alternative, if you want it agent-driven

```text
Review the code scanning alerts on this pull request, explain the root cause of each
one in plain language, and fix them.
```

Then contrast the two paths for the audience: Autofix is one click inside the platform;
the agent path handles several alerts at once and can refactor more broadly. Both end in the
same place, which is a green PR.

### Extra credit

Show **security campaigns** if the org uses them, to make the point that this scales to
backlogs of existing debt rather than only new code.

---

## Scenario 7: Dependabot

**Point to make:** most of the attack surface is code you did not write.

### Demo

1. Pin a known-vulnerable version in `api/package.json` (an old `lodash`, `axios`, or
   `express` works well), commit, and push.
2. Show the **Dependabot alert** appear under Security, with severity, the CVE, and, most
   usefully, whether the vulnerable function is actually reachable from your code.
3. Show the **Dependabot pull request**: the bump, the changelog, the compatibility score,
   and the CI run proving nothing broke.
4. Hand it to the agent for the cases a version bump cannot solve:

   ```text
   @ent-devops Review the open Dependabot pull requests. For any that require code
   changes because of a breaking API change, make those changes and get CI green.
   ```

   This is where `ent-devops` earns its place: it treats the pipeline as the source of truth
   and verifies the workflow run rather than assuming a YAML edit worked.

5. If time allows, show `.github/dependabot.yml` grouping updates so teams get one PR a week
   instead of thirty a day. Adoption fails on noise, not on capability.

---

## Scenario 8: Copilot code review catches non-compliant code

**Point to make:** the instruction files created for this repo
([.github/copilot-instructions.md](.github/copilot-instructions.md),
[.github/instructions/api.instructions.md](.github/instructions/api.instructions.md),
[.github/instructions/frontend.instructions.md](.github/instructions/frontend.instructions.md))
are not just for chat — Copilot code review reads them too, and enforces the same rules on a
pull request whether a human or an agent wrote the diff.

### Set the trap

On a scratch branch, deliberately write code that violates a couple of the checklist items in
the new instructions, on both sides of the stack:

```text
Add a GET /api/products/:id/discount-preview route in api/src/routes/product.ts that
takes a discount percentage as a query param and returns the discounted price, using
`any` for the request handler types and without validating the id or the discount value.

On the frontend, add a quick "recently viewed" widget to Products.tsx that fetches
/api/products directly with a hard-coded localhost URL inside a useEffect, with its own
loading state instead of react-query, and an icon-only button with no aria-label.
```

This mirrors exactly the kind of shortcut a time-pressured PR takes: an unvalidated `:id`,
an `any`-typed handler, a hard-coded URL, a hand-rolled fetch effect instead of `react-query`,
and a missing accessibility label — every one of them called out explicitly in
`api.instructions.md` and `frontend.instructions.md`.

Push the branch and open a pull request.

### Trigger the review

Request a review from **Copilot** on the pull request (or, locally, ask the agent to review
using the same instructions):

```text
@ent-tester Review this diff against .github/copilot-instructions.md,
.github/instructions/api.instructions.md, and .github/instructions/frontend.instructions.md,
and list every violation with the specific rule it breaks.
```

### What to show in the output

- Each finding **cites the specific checklist item**, not a vague "consider improving this" —
  e.g. "unvalidated path param, see API review checklist #1" or "hard-coded API URL, should go
  through `api/config.ts`, see frontend review checklist #4".
- The review is **scoped by path**: API violations are judged against `api.instructions.md`,
  frontend violations against `frontend.instructions.md`, because both carry an `applyTo`
  front-matter pattern matching their workspace.
- Contrast with a generic review comment like "add error handling" — these comments are
  actionable because they point at a concrete, pre-agreed convention already in the repo.

### Remediate on camera

```text
Fix every violation the review flagged, following the patterns in the existing
routes and components.
```

Show the follow-up diff: the `:id` and query param now validated with `Number.isFinite`, the
handler typed against the `Product` interface instead of `any`, the URL routed through
`api/config.ts`, the fetch moved to `useQuery`, and an `aria-label` added to the button. Re-run
the review (or re-request it) and show it comes back clean.

---

## Scenario 9: Code quality and review

**Point to make:** the loop closes with review, and review is also assisted.

### Demo

1. On the cart pull request, request a review from **Copilot**. Walk a couple of comments and
   be honest about which ones you would act on. Credibility beats polish.
2. Show the **repository ruleset**: PR required, CodeQL required to pass, secret scanning
   push protection on. The guardrails are configuration, not culture.
3. Hand the review back to the plugin for anything test-shaped:

   ```text
   @ent-tester The reviewer flagged that cart quantity updates are untested at the
   boundaries. Add tests for zero, negative, and above-stock quantities, and run them.
   ```

4. Merge. The linked issue closes automatically via `Closes #<n>`. Return to the issue and
   show the complete record: original design image, plan, tasks, acceptance criteria, the
   PR, the security checks, and the merge.

---

## Closing summary

Land these four sentences:

1. **Planning is a first-class step.** The plan is reviewed before code exists, and it lives
   on GitHub as an issue rather than in a chat log.
2. **Specialist agents beat one general agent.** Each has narrow rules, and the orchestrator
   parallelizes only what is genuinely independent.
3. **Guardrails run where the mistake happens.** Hooks fire inside the agent loop, before the
   commit, and they cannot be talked out of it by a persuasive prompt.
4. **Defense in depth is the point.** Agent hooks, push protection, secret scanning, CodeQL,
   Autofix, and Dependabot are layers, and every one of them exists because the layer in
   front of it can be skipped.

## Timing

| Audience | Run |
| --- | --- |
| Executive, 15 min | Scenarios 1, 2, and 3 |
| Developer, 30 min | Scenarios 1, 2, 3, 4, 6, and 8 |
| Security, 30 min | Scenarios 3, 4, 5, 6, and 7 |
| Full, 60 min | All of them |

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Plugin agents are not offered | `copilot plugin list`, then reinstall and restart the CLI |
| Planner cannot create the issue | Check the GitHub MCP server is running and the token can write issues |
| Hook does not fire | It matches the shell tool on `git commit`. Confirm `SKIP_SDLC_SCAN` is not set |
| Hook blocks something legitimate | Add a narrow `SCAN_ALLOWLIST` substring. Do not disable the scanner on camera |
| No CodeQL results | The default setup can take a few minutes on first run. Pre-warm it before the demo |
| Push protection does not trigger | Confirm push protection is enabled under Settings > Code security |
