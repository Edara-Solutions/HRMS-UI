// Vendors the backend OpenAPI doc as the frontend's sole network contract (#146).
// Copies ../backend/openapi.json -> contracts/openapi.json and records the backend
// commit and branch that produced it, so generation runs offline against a pinned,
// traceable snapshot. Override the backend path with BACKEND_REPO when the repos
// aren't siblings, and BACKEND_REF when its checkout is detached.
//
// contracts/openapi.json is a copy, not a source file: this script overwrites it
// wholesale, and the scheduled contract-refresh workflow reverts any hand-edit.

import { execSync } from "node:child_process";
import { copyFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  contractsDir,
  frontendRoot,
  openApiPath,
  producingCommitPath,
  producingRefPath,
  writeProvenance,
} from "./contract-provenance.mjs";

const backendRepo = process.env.BACKEND_REPO ?? resolve(frontendRoot, "..", "backend");
const sourceOpenApi = process.env.BACKEND_OPENAPI ?? join(backendRepo, "openapi.json");

const commit = backendGit("rev-parse HEAD");
const ref = process.env.BACKEND_REF ?? backendGit("rev-parse --abbrev-ref HEAD");

mkdirSync(contractsDir, { recursive: true });
copyFileSync(sourceOpenApi, openApiPath);
writeProvenance({ commit, ref });

console.log(`vendored OpenAPI -> ${openApiPath}`);
console.log(`producing commit -> ${producingCommitPath} (${commit})`);
console.log(`producing ref    -> ${producingRefPath} (${ref})`);

function backendGit(command) {
  return execSync(`git ${command}`, { cwd: backendRepo, encoding: "utf-8" }).trim();
}
