// Vendors the backend OpenAPI doc as the frontend's sole network contract (#146).
// Copies ../backend/openapi.json -> contracts/openapi.json and records the
// producing backend commit so generation runs offline against a pinned snapshot.
// Override the backend path with BACKEND_REPO when the repos aren't siblings.

import { execSync } from "node:child_process";
import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const frontendRoot = resolve(here, "..");
const contractsDir = join(frontendRoot, "contracts");

const backendRepo = process.env.BACKEND_REPO ?? resolve(frontendRoot, "..", "backend");
const sourceOpenApi = process.env.BACKEND_OPENAPI ?? join(backendRepo, "openapi.json");

const targetOpenApi = join(contractsDir, "openapi.json");
const targetCommit = join(contractsDir, "PRODUCING_COMMIT");

const producingCommit = execSync("git rev-parse HEAD", {
	cwd: backendRepo,
	encoding: "utf-8",
}).trim();

if (!/^[0-9a-f]{40}$/.test(producingCommit)) {
  throw new Error(`Resolved an invalid backend commit SHA: ${producingCommit}`);
}

mkdirSync(contractsDir, { recursive: true });
copyFileSync(sourceOpenApi, targetOpenApi);
writeFileSync(targetCommit, `${producingCommit}\n`, "utf-8");

console.log(`vendored OpenAPI -> ${targetOpenApi}`);
console.log(`producing commit  -> ${targetCommit} (${producingCommit})`);
