// Where the vendored OpenAPI snapshot lives, and the provenance recorded beside it:
// which backend commit produced it, and which backend branch it tracks. The commit
// alone cannot distinguish a stale snapshot from a deliberately pinned one, so both
// are recorded, and `openapi:check` asserts both.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

export const frontendRoot = resolve(here, "..");
export const contractsDir = join(frontendRoot, "contracts");
export const openApiPath = join(contractsDir, "openapi.json");
export const producingCommitPath = join(contractsDir, "PRODUCING_COMMIT");
export const producingRefPath = join(contractsDir, "PRODUCING_REF");

const commitPattern = /^[0-9a-f]{40}$/;
const refPattern = /^[A-Za-z0-9][A-Za-z0-9._-]*(?:\/[A-Za-z0-9][A-Za-z0-9._-]*)*$/;

/** Throws unless `commit` is a full 40-character backend commit SHA. */
export function assertProducingCommit(commit) {
  if (!commitPattern.test(commit)) {
    throw new Error(`PRODUCING_COMMIT is not a 40-character commit SHA: ${JSON.stringify(commit)}`);
  }
  return commit;
}

/** Throws unless `ref` is a plain branch name — a detached `HEAD` records nothing. */
export function assertProducingRef(ref) {
  if (ref === "HEAD") {
    throw new Error(
      'PRODUCING_REF is "HEAD": set BACKEND_REF to the branch the backend checkout tracks.',
    );
  }
  if (!refPattern.test(ref)) {
    throw new Error(`PRODUCING_REF is not a branch name: ${JSON.stringify(ref)}`);
  }
  return ref;
}

/** Reads and validates both provenance files, failing loudly when either is absent. */
export function readProvenance() {
  return {
    commit: assertProducingCommit(readTrimmed(producingCommitPath, "PRODUCING_COMMIT")),
    ref: assertProducingRef(readTrimmed(producingRefPath, "PRODUCING_REF")),
  };
}

/** Writes both provenance files after validating them. */
export function writeProvenance({ commit, ref }) {
  assertProducingCommit(commit);
  assertProducingRef(ref);
  writeFileSync(producingCommitPath, `${commit}\n`, "utf-8");
  writeFileSync(producingRefPath, `${ref}\n`, "utf-8");
}

function readTrimmed(path, name) {
  try {
    return readFileSync(path, "utf-8").trim();
  } catch {
    throw new Error(`contracts/${name} is missing — run \`bun run openapi:vendor\` to record it.`);
  }
}
