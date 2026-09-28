# S12: Legacy removal and reachability gate

Implements [issue 94](https://github.com/Edara-Solutions/HRMS-UI/issues/94) from `refactor/split-tier-users`. The checked-in [exact operation ledger](../contracts/ui-operation-ledger.json) assigns every operation in the vendored contract to its request consumer. There are 72 Company, 116 Platform, 19 delegated operations, one public plans operation and one headless health probe. Health is the only approved operation without product UI.

## What the gate proves

`bun run contract:check` rejects retired routes, unscoped API calls, old identity markers, old storage keys, generic client aliases and restored legacy files. Its operation check resolves generated operation values through re-exports, command maps and lazy contract loaders. An import alone is insufficient: each UI operation must be passed to a request/query/command function from a production consumer, and that file must be reachable from the HTML entry point through runtime imports. Type-only imports and tests are excluded. The committed exact consumer list must match; new operations, missing consumers, changed owners, unmounted consumers and incorrect audience assignments fail.

The ledger is review evidence rather than an automatically accepted count. To update it after a deliberate contract or ownership change, run `bun scripts/check-operation-reachability.mjs --write` and review the diff. The checker additionally verifies the current 209-operation audience inventory.

`bun scripts/check-audience-boundaries.mjs` checks source imports for internal generated runtime contracts and cross-audience pages, scans every emitted chunk for retired markers, and follows imports from the emitted public-plans route chunk to verify that its own dependency graph contains no authenticated operation contracts. CI runs the retired-surface/ownership gate before compilation and the bundle gate after the production build. Both Chromium presentation projects and a separate disabled-Platform build run in CI.

## Removed surface and preserved behavior

- Deleted the unmounted fixture dashboard/home slices, their unused chart helpers/dependencies and superseded unscoped Company email tools. `/platform/dashboard` continues to mount the existing supported workspace home.
- Deleted the generic API client, compatibility client aliases, monolithic declaration files, parallel Lead runtime validator, obsolete audit validator generator and skipped legacy activation browser suite. Supported activation repair and delegated email controls remain in their owning slices.
- Preferences read only the current versioned envelope. Old mixed identity/preferences storage is neither read nor migrated.
- Added the missing Company email-type detail read to the template page, validating both the requested key and Company context before any detail controls render.
- Regenerate audit metadata and bilingual labels from the current contract. All 79 events are represented, including Platform role/user and Access Session events; Platform actors retain `PLATFORM_USER`.
- Bound the audit filter chip to its available width so the Company catalogue lens remains usable at narrow widths with 200% text. The complete value remains available through its tooltip and accessible name.

## Narrow exclusions

The scanner's reviewed exclusions live beside its rules in `scripts/check-retired-surface.mjs`:

- Ten historical `platform_admin.*` audit event names remain exact backend wire constants, restricted to the two generated audit response modules, generated catalogue and bilingual audit label files. No UI actor identity receives this exemption.
- Three specific route-canary files may contain their exact retired `/admin` test inputs/assertion. New executable uses in those files still fail.
- Two exact negative assertions retain the old actor/disclosure canaries to prove Company audit and bounded refusal surfaces cannot expose them.
- Ordinary “administrator” product wording remains valid; it grants no authority.

Generated artifact drift and audit label completeness are checked independently. There is no broad generated-file or skipped-test exemption.

## Acceptance matrix and release boundary

The full test suite retains the [epic 81](https://github.com/Edara-Solutions/HRMS-UI/issues/81) invariants and A1–R1 acceptance matrix. Existing audience/authentication and refusal tests cover M01–M04 and wrong-audience/foreign scope (A1, A2, C1); page and transport tests cover exact permissions, protected/root actions, delegated grants and expiry (P1, D1, D2), conflict/refusal recovery and single-send commands (W2, E4), malformed contracts (E5), and disclosure canaries (R1). Existing S3–S11 slice documents describe each workflow's evidence. English/Arabic, crossed light/dark presentation, narrow layout, 200% text, keyboard/focus and reduced-motion checks cover Q1–Q3. S12 adds exact operation ownership, regression scans and audit catalogue presentation coverage.

This completes the reachability gate for the **existing vendored contract**. The separate Company synthetic diagnostics contract remains blocked on [UI issue 95](https://github.com/Edara-Solutions/HRMS-UI/issues/95) and backend issue 290. There is no preview/test-send fallback or placeholder in the delegated workspace. Epic 81 remains open until that extension lands or a product decision formally removes it; this change does not claim complete release parity or deployment approval.

## Validation

Run `bun run quality`, `bun run openapi:check`, `bun run contract:check`, `bun scripts/check-audience-boundaries.mjs`, and the full `bun run test:e2e --workers=1`. Run `platform-disabled.spec.ts` separately with `VITE_ENABLE_PLATFORM_PORTAL=false`. Final local evidence: typecheck, Biome, Steiger and production build passed; 113 unit test files / 790 tests passed; OpenAPI drift and all 79 audit label sets passed; all 209 exact operation entries and source/bundle gates passed. The public-plans route dependency graph contains seven chunks (622,618 bytes). React Doctor verbose changed-scope analysis against the origin base reported no issues (score disabled). English and Arabic Chromium projects passed 202 enabled-Platform cases, with the two disabled-only cases skipped; the separate disabled-Platform run passed both cases.
