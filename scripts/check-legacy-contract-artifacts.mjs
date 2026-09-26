import { existsSync } from "node:fs";
import {
  auditCatalogArtifact,
  auditLabelArtifacts,
  auditRuntimeContracts,
} from "./contract-artifacts.mjs";

const paths = [
  ...auditRuntimeContracts.map(({ outputPath }) => outputPath),
  auditLabelArtifacts.manifestPath,
  auditLabelArtifacts.enumFieldsPath,
  auditCatalogArtifact.metadataPath,
];
const missing = paths.filter((path) => !existsSync(path));
if (missing.length) {
  throw new Error(`Frozen legacy contract artifacts are missing:\n${missing.join("\n")}`);
}
console.log("legacy contract artifacts frozen until their migration slice");
