import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = join(root, "src");
const assetsRoot = join(root, "dist", "assets");
const nonPublicOperationMarkers = sourceFiles(join(sourceRoot, "shared", "api", "generated"))
  .filter((path) => !path.split(/[\\/]/).includes("public"))
  .map((path) => readFileSync(path, "utf8").match(/key:\s*"([A-Z]+ [^"]+)"/)?.[1])
  .filter((marker) => marker !== undefined);

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(?:ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}

export function assertNoInternalRuntimeImports(files = sourceFiles(sourceRoot)) {
  const violations = [];
  for (const path of files) {
    const source = ts.createSourceFile(
      path,
      readFileSync(path, "utf8"),
      ts.ScriptTarget.Latest,
      true,
    );
    function inspect(node) {
      if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
        const specifier = node.moduleSpecifier;
        const typeOnly = node.isTypeOnly || node.importClause?.isTypeOnly;
        if (specifier && ts.isStringLiteral(specifier) && !typeOnly) {
          const runtimeSpecifiers =
            ts.isImportDeclaration(node) &&
            node.importClause?.namedBindings &&
            ts.isNamedImports(node.importClause.namedBindings)
              ? node.importClause.namedBindings.elements.filter((element) => !element.isTypeOnly)
              : [node];
          if (runtimeSpecifiers.length && specifier.text.includes("generated/internal")) {
            violations.push(`${path}: ${specifier.text}`);
          }
        }
      }
      if (
        ts.isCallExpression(node) &&
        node.expression.kind === ts.SyntaxKind.ImportKeyword &&
        node.arguments.length === 1 &&
        ts.isStringLiteral(node.arguments[0]) &&
        node.arguments[0].text.includes("generated/internal")
      ) {
        violations.push(`${path}: ${node.arguments[0].text}`);
      }
      ts.forEachChild(node, inspect);
    }
    inspect(source);
  }
  if (violations.length)
    throw new Error(`Internal generated runtime imports:\n${violations.join("\n")}`);
}

function directImports(chunk) {
  const imports = new Set();
  const source = ts.createSourceFile(
    "bundle.js",
    chunk,
    ts.ScriptTarget.Latest,
    false,
    ts.ScriptKind.JS,
  );
  for (const statement of source.statements) {
    if (
      (ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement)) &&
      statement.moduleSpecifier &&
      ts.isStringLiteral(statement.moduleSpecifier) &&
      statement.moduleSpecifier.text.startsWith("./")
    ) {
      imports.add(statement.moduleSpecifier.text.slice(2));
    }
  }
  function inspect(node) {
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length === 1 &&
      ts.isStringLiteral(node.arguments[0]) &&
      node.arguments[0].text.startsWith("./")
    ) {
      imports.add(node.arguments[0].text.slice(2));
    }
    ts.forEachChild(node, inspect);
  }
  inspect(source);
  return imports;
}

export function inspectPublicBundle(assets = assetsRoot) {
  if (!existsSync(assets))
    throw new Error("Production assets are missing; run `bun run build` first.");
  const chunks = new Map(
    readdirSync(assets)
      .filter((name) => extname(name) === ".js")
      .map((name) => [name, readFileSync(join(assets, name), "utf8")]),
  );
  const entry = [...chunks].filter(([, code]) =>
    code.includes("Clear plans that grow with your team"),
  );
  if (entry.length !== 1)
    throw new Error(`Expected one public plans chunk, found ${entry.length}.`);
  const reachable = new Set();
  const pending = [entry[0][0]];
  while (pending.length) {
    const name = pending.pop();
    if (reachable.has(name)) continue;
    const code = chunks.get(name);
    if (code === undefined) throw new Error(`Missing imported bundle chunk: ${name}`);
    reachable.add(name);
    for (const imported of directImports(code)) pending.push(imported);
  }
  for (const name of reachable) {
    const code = chunks.get(name);
    if (
      code.includes("generated/internal") ||
      nonPublicOperationMarkers.some((marker) => code.includes(marker))
    ) {
      throw new Error(`Public route bundle contains a non-public generated contract: ${name}`);
    }
  }
  const bytes = [...reachable].reduce(
    (total, name) => total + statSync(join(assets, name)).size,
    0,
  );
  return { entry: entry[0][0], chunks: [...reachable].sort(), bytes };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assertNoInternalRuntimeImports();
  const report = inspectPublicBundle();
  console.log(
    `Public route bundle: ${basename(report.entry)}, ${report.chunks.length} chunks, ${report.bytes} bytes.`,
  );
}
