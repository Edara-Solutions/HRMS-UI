// `openapi:check` — the blocking self-consistency gate on UI pull requests.
//
// Asserts the vendored snapshot carries provenance, regenerates every artifact
// derived from it, and fails when a regenerated artifact differs from what is
// committed. It says nothing about whether the snapshot is *current*; detecting
// that is the scheduled contract-refresh workflow's job, because a UI author
// cannot fix a stale backend contract from inside their branch.

import { execFileSync } from "node:child_process";
import { relative } from "node:path";
import { reportAuditLabels } from "./check-audit-labels.mjs";
import { derivedArtifacts } from "./contract-artifacts.mjs";
import { frontendRoot, readProvenance } from "./contract-provenance.mjs";

const { commit, ref } = readProvenance();
console.log(`contract provenance -> ${ref} @ ${commit}`);

for (const { generator } of derivedArtifacts) {
  execFileSync(process.execPath, ["run", generator], { cwd: frontendRoot, stdio: "inherit" });
}

const trackedPaths = derivedArtifacts.flatMap(({ outputs }) =>
  outputs.map((output) => relative(frontendRoot, output).replaceAll("\\", "/")),
);

const untracked = execFileSync(
  "git",
  ["ls-files", "--others", "--exclude-standard", "--", ...trackedPaths],
  { cwd: frontendRoot, encoding: "utf-8" },
).trim();
if (untracked) {
  fail(`Generated artifacts are not tracked by git:\n${untracked}`);
}

try {
  execFileSync("git", ["diff", "--exit-code", "--", ...trackedPaths], {
    cwd: frontendRoot,
    stdio: "inherit",
  });
} catch {
  fail("Generated artifacts are out of date with contracts/openapi.json.");
}

console.log(`contract artifacts up to date -> ${trackedPaths.join(", ")}`);

// The key set is generated, but the labels behind it are hand-authored, so the drift
// gate above cannot see a catalog event nobody has named yet.
if (!reportAuditLabels()) {
  process.exit(1);
}

function fail(message) {
  console.error(`\n${message}`);
  console.error("Regenerate with `bun run openapi:gen` and commit the result.");
  process.exit(1);
}
