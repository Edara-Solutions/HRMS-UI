import fs from "node:fs";
import path from "node:path";
import fsd from "@feature-sliced/steiger-plugin";
import { defineConfig } from "steiger";

const recommendedRules = Object.assign(
  {},
  ...fsd.configs.recommended
    .filter((configItem) => "rules" in configItem)
    .map((configItem) => configItem.rules),
);
const findFolders = (folder, predicate) => {
  const matches = [];

  if (predicate(folder)) {
    matches.push(folder);
  }

  for (const child of folder.children) {
    if (child.type === "folder") {
      matches.push(...findFolders(child, predicate));
    }
  }

  return matches;
};

const findFiles = (folder, predicate) => {
  const matches = [];

  for (const child of folder.children) {
    if (child.type === "file" && predicate(child)) {
      matches.push(child);
    }

    if (child.type === "folder") {
      matches.push(...findFiles(child, predicate));
    }
  }

  return matches;
};

const normalizePath = (filePath) => filePath.split(path.sep).join("/");

const importPathPattern = /from\s+["']([^"']+)["']|import\s+["']([^"']+)["']/g;

const findImportSpecifiers = (source) =>
  [...source.matchAll(importPathPattern)].map((match) => match[1] ?? match[2]);

const noEntitiesLayerRule = {
  name: "edara/no-entities-layer",
  check(root) {
    const diagnostics = findFolders(
      root,
      (folder) => path.basename(folder.path) === "entities",
    ).map((folder) => ({
      message:
        "This frontend deliberately skips the entities layer; derive domain types from shared/api instead.",
      location: { path: folder.path },
    }));

    return { diagnostics };
  },
};

const noPortalCrossImportsRule = {
  name: "edara/no-admin-company-cross-imports",
  check(root) {
    const portalFiles = findFiles(
      root,
      (file) =>
        /\.(?:ts|tsx)$/.test(file.path) &&
        (file.path.includes(`${path.sep}pages${path.sep}admin${path.sep}`) ||
          file.path.includes(`${path.sep}pages${path.sep}company${path.sep}`)),
    );

    const diagnostics = portalFiles.flatMap((file) => {
      const source = fs.readFileSync(file.path, "utf8");
      const normalizedFilePath = normalizePath(file.path);
      const isAdminFile = normalizedFilePath.includes("/pages/admin/");
      const forbiddenPortalPath = isAdminFile ? "/pages/company" : "/pages/admin";

      const hasForbiddenImport = findImportSpecifiers(source).some((importSpecifier) => {
        if (importSpecifier.startsWith("@/pages/")) {
          return importSpecifier.startsWith(`@${forbiddenPortalPath}`);
        }

        if (!importSpecifier.startsWith(".")) {
          return false;
        }

        const resolvedImportPath = normalizePath(
          path.resolve(path.dirname(file.path), importSpecifier),
        );
        return resolvedImportPath.includes(`/src${forbiddenPortalPath}`);
      });

      if (!hasForbiddenImport) {
        return [];
      }

      return [
        {
          message:
            "Admin and Company page slices are isolated portals; move shared code to shared/ instead.",
          location: { path: file.path },
        },
      ];
    });

    return { diagnostics };
  },
};

const edaraArchitecturePlugin = {
  meta: {
    name: "edara-architecture",
    version: "0.1.0",
  },
  ruleDefinitions: [noEntitiesLayerRule, noPortalCrossImportsRule],
};

export default defineConfig([
  fsd.plugin,
  edaraArchitecturePlugin,
  {
    ignores: ["**/.gitkeep", "**/routeTree.gen.ts", "**/vite-env.d.ts"],
  },
  {
    rules: {
      ...recommendedRules,
      // ADR-0001 intentionally keeps features/auth for the reused password-change interaction
      // alongside shared/auth for session/token infrastructure.
      "fsd/ambiguous-slice-names": "off",
      "edara/no-admin-company-cross-imports": "error",
      "edara/no-entities-layer": "error",
    },
  },
  {
    // Documented exemption to docs/frontend-architecture.md §3: the notification center is one
    // slice both portals' shells mount (HRMS-UI#53), so app-shell is its only consumer by design.
    // Merging it there would bury portal-agnostic notification logic in a layout widget.
    files: ["./src/features/notification/**"],
    rules: {
      "fsd/insignificant-slice": "off",
    },
  },
]);
