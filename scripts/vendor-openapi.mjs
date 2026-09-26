import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isDelegatedOperation } from "./contract-audiences.mjs";
import {
  assertProducingCommit,
  assertProducingRef,
  audienceOpenApiPaths,
  contractsDir,
  frontendRoot,
  openApiPath,
  writeProvenance,
} from "./contract-provenance.mjs";

const sourceFiles = [
  "openapi.json",
  "openapi.company.json",
  "openapi.platform.json",
  "openapi.public.json",
];
const methods = new Set(["get", "post", "put", "patch", "delete", "head", "options", "trace"]);

/** Reads one committed snapshot; dirty checkout files cannot change its provenance. */
export function readBackendSnapshot(backendRepo, backendRef) {
  function git(...args) {
    return execFileSync("git", ["-c", `safe.directory=${backendRepo}`, ...args], {
      cwd: backendRepo,
      maxBuffer: 64 * 1024 * 1024,
    });
  }
  const commit = assertProducingCommit(git("rev-parse", "HEAD").toString("utf8").trim());
  const ref = assertProducingRef(
    backendRef ?? git("rev-parse", "--abbrev-ref", "HEAD").toString("utf8").trim(),
  );
  const files = new Map();
  for (const name of sourceFiles) {
    const bytes = git("show", `${commit}:${name}`);
    const document = JSON.parse(bytes.toString("utf8"));
    if (!document || typeof document !== "object" || !document.paths) {
      throw new Error(`Invalid committed OpenAPI document: ${name}`);
    }
    files.set(name, bytes);
  }
  return { commit, ref, files };
}

/** Derives support operations without changing the original Platform document. */
export function deriveDelegatedContract(platformDocument) {
  const paths = {};
  for (const [path, pathItem] of Object.entries(platformDocument.paths)) {
    const delegated = Object.fromEntries(
      Object.entries(pathItem).filter(
        ([method, operation]) => methods.has(method) && isDelegatedOperation(operation),
      ),
    );
    if (Object.keys(delegated).length === 0) continue;
    const metadata = Object.fromEntries(
      Object.entries(pathItem).filter(([method]) => !methods.has(method)),
    );
    paths[path] = { ...metadata, ...delegated };
  }
  return { ...platformDocument, paths };
}

function vendorOpenApi() {
  if (process.env.BACKEND_OPENAPI) {
    throw new Error(
      "BACKEND_OPENAPI overrides are unsupported: vendor all documents from one commit.",
    );
  }
  const backendRepo =
    process.env.BACKEND_REPO ??
    [
      resolve(frontendRoot, "..", "backend"),
      resolve(frontendRoot, "..", "..", "backend"),
      resolve(frontendRoot, "..", "..", "..", "backend"),
    ].find((candidate) => existsSync(join(candidate, "openapi.json")));
  if (!backendRepo) throw new Error("Unable to locate backend checkout; set BACKEND_REPO.");

  // Validate every committed input before replacing any existing contract.
  const snapshot = readBackendSnapshot(backendRepo, process.env.BACKEND_REF);
  const platformBytes = snapshot.files.get("openapi.platform.json");
  if (!platformBytes) throw new Error("Missing committed Platform document");
  const delegated = deriveDelegatedContract(JSON.parse(platformBytes.toString("utf8")));
  const destinations = new Map([
    ["openapi.json", openApiPath],
    ["openapi.company.json", audienceOpenApiPaths.company],
    ["openapi.platform.json", audienceOpenApiPaths.platform],
    ["openapi.public.json", audienceOpenApiPaths.public],
  ]);
  mkdirSync(contractsDir, { recursive: true });
  for (const [name, destination] of destinations)
    writeFileSync(destination, snapshot.files.get(name));
  writeFileSync(audienceOpenApiPaths.delegated, `${JSON.stringify(delegated, null, 2)}\n`);
  writeProvenance(snapshot);
  console.log(`vendored four committed documents -> ${snapshot.ref} @ ${snapshot.commit}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) vendorOpenApi();
