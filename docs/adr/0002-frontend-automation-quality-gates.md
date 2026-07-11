# ADR 0002: Frontend Automation Quality Gates

## Status

Accepted.

## Context

The frontend needs automated checks that are strong enough to protect `main` but light enough that developers still commit in small, frequent slices. The stack is Bun, Vite, React, TypeScript, Biome, Vitest, Playwright, and React Doctor.

The existing local baseline has separate owners for different concerns:

- TypeScript owns type correctness.
- Biome owns formatting and general linting.
- Vitest owns unit and component behavior.
- Playwright owns browser-level smoke coverage.
- React Doctor owns React, accessibility, performance, and maintainability advice.

## Decision

Use a tiered quality pyramid.

1. Local `pre-commit` hooks are fast feedback. They run only staged-file Biome checks and safe fixes.
2. Local `pre-push` hooks run the developer gate: typecheck, lint, and unit tests.
3. Pull request CI is the merge contract. It installs dependencies from `bun.lock`, then blocks on typecheck, Biome CI, unit tests, production build, and Playwright E2E.
4. React Doctor remains advisory at first. It can graduate to blocking only after the team has triaged the baseline and trusts the signal.
5. CD stays platform-neutral for now. Pushes to `main` produce a verified `dist` artifact, but deployment is added only after the hosting target is known.

## Consequences

Developers get quick local feedback without turning every commit into a full CI run.

`main` is protected by deterministic CI checks that reproduce from the committed lockfile.

Advisory tools can be introduced early without training the team to ignore red builds.

The project keeps one package manager story: Bun for dependency installation, scripts, hooks, and CI.

## Graduation Rules

A check can become blocking when:

- the current baseline is green or explicitly waived,
- the owner is unambiguous,
- false positives are rare,
- failures point to actionable work,
- the team agrees the signal is worth blocking merge.

## References

- Bun package manager and lockfile documentation: https://bun.sh/docs/pm/lockfile
- Biome CI guide: https://biomejs.dev/guides/continuous-integration/
- Biome git hooks recipe: https://biomejs.dev/recipes/git-hooks/
- Playwright CI guide: https://playwright.dev/docs/ci
- GitHub Actions security hardening: https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions
- GitHub merge queues: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-a-merge-queue
