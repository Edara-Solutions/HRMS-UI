# Frontend Automation Workflow

## Philosophy

Automation is layered:

- Hooks help developers before code leaves the machine.
- CI is the source of truth for merge safety.
- Advisory scanners report useful signals without blocking until the baseline is trusted.
- CD is platform-specific and should not be faked before the host is chosen.

## Local Setup

Install dependencies with Bun:

```bash
bun install
```

Lefthook installs from the `prepare` script. To reinstall hooks manually:

```bash
bun run prepare
```

## Local Commands

```bash
bun run typecheck
bun run lint
bun run test
bun run build
bun run test:e2e
bun run doctor
```

`bun run quality` runs the fast blocking suite: typecheck, lint, unit tests, and build.

## Git Hooks

`pre-commit`:

- runs Biome on staged supported files,
- writes safe fixes,
- stages fixed files.

`pre-push`:

- runs typecheck,
- runs lint,
- runs unit tests.

E2E does not run on every push because it starts a browser and a dev server. It belongs in CI and in focused local verification.

## CI

`.github/workflows/ci.yml` runs on pull requests, pushes to `main`, merge queue events, and manual dispatch.

Blocking PR checks:

- `bun install --frozen-lockfile`
- `bun run openapi:check`
- `bun run typecheck`
- `bun run lint:ci`
- `bun run test`
- `bun run build`
- `bun run test:e2e`

Pushes to `main` upload the verified `dist` folder as a short-lived artifact. This is not deployment; it is a deployable build output.

## Contract Refresh

`bun run openapi:check` proves the vendored OpenAPI snapshot and everything generated from it agree. It cannot prove the snapshot is current, because reproducing it needs the backend repository.

`.github/workflows/contract-refresh.yml` covers that half on a schedule and on manual dispatch. It re-vendors from the backend branch recorded in `contracts/PRODUCING_REF` and, when anything changed, opens or updates a pull request against the integration branch carrying the new snapshot and every regenerated artifact.

Staleness is a pull request rather than a failing check on purpose: a UI author cannot fix a stale backend contract from inside their branch, and a gate that blocks people for something they cannot fix is a gate that gets disabled. The auto-PR is both the notification and the test — full CI runs on it, so a breaking backend change surfaces as a red pull request.

Two operational notes:

- The workflow file must live on the default branch. `on: schedule` fires only from the default branch's copy, and a schedule that never fires looks exactly like no drift.
- It needs a `CONTRACT_REFRESH_TOKEN` secret — a fine-grained PAT or GitHub App token with read access to `Edara-Solutions/HRMS_Back_End` plus contents and pull-requests write here. `GITHUB_TOKEN` cannot read the backend, and pull requests it creates do not start workflow runs. Without the secret the job fails loudly on its first step rather than reporting a clean contract.

## E2E Runner

`bun run test:e2e` uses `scripts/run-e2e.mjs` instead of Playwright's built-in `webServer` lifecycle. On Windows, the built-in lifecycle can leave the runner waiting after tests pass. The script starts Vite, waits for `http://127.0.0.1:3000`, runs Playwright with `PLAYWRIGHT_SKIP_WEB_SERVER=1`, and then tears the server down.

If you intentionally want Playwright to manage the server itself:

```bash
PLAYWRIGHT_USE_WEB_SERVER=1 bun run playwright test
```

## Advisory Checks

React Doctor stays advisory through `.github/workflows/react-doctor.yml`.

Graduate advisory checks only after:

- the current baseline has been triaged,
- false positives are understood,
- owners agree on the rule,
- failures are actionable for PR authors.

## CD Roadmap

When the hosting target is chosen, add target-specific deployment jobs after the CI jobs pass.

Production deployment should use:

- GitHub Environments,
- least-privilege permissions,
- OIDC or short-lived credentials when the host supports it,
- protected branches or rulesets,
- rollback documentation.

## Merge Queue

The CI workflow already includes `merge_group`, so the same required checks can be used when GitHub merge queue is enabled.
