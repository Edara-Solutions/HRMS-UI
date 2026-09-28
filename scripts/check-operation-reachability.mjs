import { readFileSync, writeFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const senderArguments = {
  requestPlatformOperation: 0,
  sendPlatformCommand: 0,
  platformReadQuery: 1,
  requestCompanyOperation: 0,
  sendCompanyCommand: 0,
  companyReadQuery: 1,
  requestAudienceOperation: 1,
  sendAudienceCommand: 1,
  executeOperationRequest: 1,
  requestDelegatedOperation: 0,
  sendDelegatedCommand: 0,
  read: 0,
  request: 0,
  executePublicRequest: 0,
};
const ledgerPath = "contracts/ui-operation-ledger.json";
const portable = (path) => relative(process.cwd(), resolve(path)).replaceAll("\\", "/");
const productionSource = (path) => path.startsWith("src/") && !/\.test\.|^src\/test\//.test(path);

// Resolve operation values through re-exports, command maps and lazy contract loaders.
// Merely importing a generated module does not count as using its operation.
function operationResolver(program, options) {
  const checker = program.getTypeChecker();
  function declarations(symbol, seen) {
    if (symbol?.flags & ts.SymbolFlags.Alias) symbol = checker.getAliasedSymbol(symbol);
    return (symbol?.declarations ?? []).flatMap((declaration) => {
      if (ts.isShorthandPropertyAssignment(declaration))
        return declarations(checker.getShorthandAssignmentValueSymbol(declaration), seen);
      if (ts.isBindingElement(declaration))
        return values(declaration.parent.parent.initializer, seen);
      if (declaration.initializer) return values(declaration.initializer, seen);
      if (ts.isExportAssignment(declaration)) return values(declaration.expression, seen);
      return [];
    });
  }
  function values(node, seen = new Set()) {
    if (!node || seen.has(node)) return [];
    seen = new Set(seen).add(node);
    if (ts.isConditionalExpression(node))
      return [...values(node.whenTrue, seen), ...values(node.whenFalse, seen)];
    if (ts.isAwaitExpression(node) || ts.isAsExpression(node) || ts.isParenthesizedExpression(node))
      return values(node.expression, seen);
    if (ts.isObjectLiteralExpression(node))
      return node.properties.flatMap((property) =>
        ts.isShorthandPropertyAssignment(property)
          ? declarations(checker.getShorthandAssignmentValueSymbol(property), seen)
          : values(property.initializer, seen),
      );
    if (ts.isElementAccessExpression(node))
      return checker
        .getTypeAtLocation(node.expression)
        .getProperties()
        .flatMap((symbol) => declarations(symbol, seen));
    if (ts.isCallExpression(node)) {
      if (node.expression.getText() === "defineOperation") {
        const key = node.getText().match(/key:\s*"([A-Z]+ [^"]+)"/)?.[1];
        return key ? [key] : [];
      }
      if (
        node.expression.kind === ts.SyntaxKind.ImportKeyword &&
        ts.isStringLiteral(node.arguments[0])
      ) {
        const module = ts.resolveModuleName(
          node.arguments[0].text,
          node.getSourceFile().fileName,
          options,
          ts.sys,
        ).resolvedModule;
        const source = module && program.getSourceFile(module.resolvedFileName);
        const key = source?.text.match(/key:\s*"([A-Z]+ [^"]+)"/)?.[1];
        return key ? [key] : [];
      }
      let symbol = checker.getSymbolAtLocation(node.expression);
      if (symbol?.flags & ts.SymbolFlags.Alias) symbol = checker.getAliasedSymbol(symbol);
      return (symbol?.declarations ?? []).flatMap((declaration) => {
        const result = [];
        function returns(child) {
          if (ts.isReturnStatement(child)) result.push(...values(child.expression, seen));
          else ts.forEachChild(child, returns);
        }
        if (declaration.body) {
          if (ts.isBlock(declaration.body)) returns(declaration.body);
          else result.push(...values(declaration.body, seen));
        }
        return result;
      });
    }
    return declarations(
      checker.getSymbolAtLocation(ts.isPropertyAccessExpression(node) ? node.name : node),
      seen,
    );
  }
  return values;
}

function mountedFiles(program, options) {
  const graph = new Map();
  for (const source of program.getSourceFiles()) {
    const dependencies = new Set();
    function add(specifier) {
      const module = ts.resolveModuleName(
        specifier,
        source.fileName,
        options,
        ts.sys,
      ).resolvedModule;
      if (module && productionSource(portable(module.resolvedFileName)))
        dependencies.add(portable(module.resolvedFileName));
    }
    function visit(node) {
      if (
        (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
        node.moduleSpecifier &&
        ts.isStringLiteral(node.moduleSpecifier)
      ) {
        const bindings = node.importClause?.namedBindings ?? node.exportClause;
        const onlyTypes =
          node.isTypeOnly ||
          node.importClause?.isTypeOnly ||
          (bindings?.elements?.length && bindings.elements.every((element) => element.isTypeOnly));
        if (!onlyTypes) add(node.moduleSpecifier.text);
      }
      if (
        ts.isCallExpression(node) &&
        node.expression.kind === ts.SyntaxKind.ImportKeyword &&
        ts.isStringLiteral(node.arguments[0])
      )
        add(node.arguments[0].text);
      ts.forEachChild(node, visit);
    }
    visit(source);
    graph.set(portable(source.fileName), dependencies);
  }
  const entry = readFileSync("index.html", "utf8").match(/src="\/(src\/[^"]+)"/)?.[1];
  if (!entry) throw new Error("Missing HTML source entry point");
  const mounted = new Set();
  const pending = [entry];
  while (pending.length) {
    const file = pending.pop();
    if (mounted.has(file)) continue;
    mounted.add(file);
    pending.push(...(graph.get(file) ?? []));
  }
  return mounted;
}

export function inspectOperationConsumers() {
  const config = ts.readConfigFile("tsconfig.app.json", ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, ".");
  const program = ts.createProgram(parsed.fileNames, parsed.options);
  const resolveOperations = operationResolver(program, parsed.options);
  const inventory = new Map();
  for (const source of program.getSourceFiles()) {
    const file = portable(source.fileName);
    const key = source.text.match(/key:\s*"([A-Z]+ [^"]+)"/)?.[1];
    if (file.startsWith("src/shared/api/generated/") && key)
      inventory.set(key, {
        key,
        audience: source.text.match(/audience:\s*"([^"]+)"/)?.[1],
        consumers: [],
      });
  }
  for (const source of program.getSourceFiles()) {
    const file = portable(source.fileName);
    if (!productionSource(file) || file.startsWith("src/shared/api/generated/")) continue;
    function visit(node) {
      if (ts.isCallExpression(node)) {
        const name = ts.isIdentifier(node.expression)
          ? node.expression.text
          : ts.isPropertyAccessExpression(node.expression)
            ? node.expression.name.text
            : "";
        const argument = senderArguments[name];
        if (argument !== undefined)
          for (const key of resolveOperations(node.arguments[argument]))
            inventory.get(key)?.consumers.push(file);
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  const operations = [...inventory.values()]
    .map((operation) => ({ ...operation, consumers: [...new Set(operation.consumers)].sort() }))
    .sort((left, right) => left.key.localeCompare(right.key));
  return { operations, mounted: mountedFiles(program, parsed.options) };
}

export function assertOperationLedger(operations, ledger, mounted) {
  if (new Set(ledger.map(({ key }) => key)).size !== ledger.length)
    throw new Error("Duplicate operation ownership");
  const declared = new Map(ledger.map((operation) => [operation.key, operation]));
  if (declared.size !== operations.length)
    throw new Error("Operation inventory changed; review the exact ledger");
  for (const operation of operations) {
    const entry = declared.get(operation.key);
    if (!entry || entry.audience !== operation.audience)
      throw new Error(`Missing or incorrect audience assignment: ${operation.key}`);
    if (entry.headless) {
      if (operation.key !== "GET /health" || !entry.reason || operation.consumers.length)
        throw new Error(`Unapproved headless operation: ${operation.key}`);
      continue;
    }
    if (!operation.consumers.length)
      throw new Error(`Operation has no request consumer: ${operation.key}`);
    if (JSON.stringify(entry.consumers) !== JSON.stringify(operation.consumers))
      throw new Error(`Consumer ownership changed: ${operation.key}`);
    for (const file of operation.consumers) {
      if (!mounted.has(file))
        throw new Error(`Operation consumer is not mounted: ${operation.key} in ${file}`);
      if (operation.audience === "company" && file.startsWith("src/pages/platform/"))
        throw new Error(`Company operation in Platform slice: ${operation.key}`);
      if (
        ["platform", "delegated"].includes(operation.audience) &&
        file.startsWith("src/pages/company/")
      )
        throw new Error(`Platform operation in Company slice: ${operation.key}`);
    }
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { operations, mounted } = inspectOperationConsumers();
  if (process.argv.includes("--write")) {
    const ledger = operations.map((operation) =>
      operation.key === "GET /health"
        ? {
            key: operation.key,
            audience: operation.audience,
            headless: true,
            reason: "Operational health probe; no product UI",
          }
        : operation,
    );
    assertOperationLedger(operations, ledger, mounted);
    writeFileSync(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
  }
  const ledger = JSON.parse(readFileSync(ledgerPath, "utf8"));
  assertOperationLedger(operations, ledger, mounted);
  const counts = Object.fromEntries(
    ["company", "platform", "delegated", "public"].map((audience) => [
      audience,
      operations.filter((operation) => operation.audience === audience).length,
    ]),
  );
  if (
    operations.length !== 209 ||
    counts.company !== 72 ||
    counts.platform !== 116 ||
    counts.delegated !== 19 ||
    counts.public !== 2
  )
    throw new Error(`Unexpected audience inventory: ${JSON.stringify(counts)}`);
  console.log(
    "Exact operation ledger passed: 72 Company, 116 Platform, 19 delegated, 1 public UI, 1 headless health.",
  );
}
