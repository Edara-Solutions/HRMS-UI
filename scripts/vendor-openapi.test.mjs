import { execFileSync } from "node:child_process";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { deriveDelegatedContract, readBackendSnapshot } from "./vendor-openapi.mjs";

vi.mock("node:child_process", async (importOriginal) => {
  const actual = await importOriginal();
  const execute = vi.fn();
  return {
    ...actual,
    execFileSync: execute,
    default: { ...actual.default, execFileSync: execute },
  };
});

const commit = "1234567890123456789012345678901234567890";
const repository = "F:/contract fixture with spaces";
const names = [
  "openapi.json",
  "openapi.company.json",
  "openapi.platform.json",
  "openapi.public.json",
];
let ref;

beforeEach(() => {
  ref = "fixture-contracts";
  vi.mocked(execFileSync)
    .mockReset()
    .mockImplementation((command, args) => {
      expect(command).toBe("git");
      expect(args.slice(0, 2)).toEqual(["-c", `safe.directory=${repository}`]);
      const operation = args.slice(2);
      if (operation.join(" ") === "rev-parse HEAD") return Buffer.from(commit);
      if (operation.join(" ") === "rev-parse --abbrev-ref HEAD") return Buffer.from(ref);
      if (operation[0] === "show") {
        const name = operation[1].replace(`${commit}:`, "");
        expect(names).toContain(name);
        return Buffer.from(`${JSON.stringify({ paths: {}, info: { title: name } })}\n`);
      }
      throw new Error("Unexpected Git operation");
    });
});

describe("committed contract vendoring", () => {
  it("requests every document from the same resolved SHA using argument-safe Git calls", () => {
    const snapshot = readBackendSnapshot(repository);
    expect(snapshot.commit).toBe(commit);
    expect(snapshot.ref).toBe(ref);
    expect(snapshot.files.size).toBe(4);
    for (const name of names) {
      expect(JSON.parse(snapshot.files.get(name).toString("utf8")).info.title).toBe(name);
      expect(execFileSync).toHaveBeenCalledWith(
        "git",
        ["-c", `safe.directory=${repository}`, "show", `${commit}:${name}`],
        expect.objectContaining({ cwd: repository }),
      );
    }
  });

  it("requires an explicit producing ref for a detached checkout", () => {
    ref = "HEAD";
    expect(() => readBackendSnapshot(repository)).toThrow("HEAD");
    expect(readBackendSnapshot(repository, "fixture-contracts").ref).toBe("fixture-contracts");
  });

  it("preserves the Platform document and includes untagged delegated operations", () => {
    const platform = {
      paths: {
        "/shared-path": {
          parameters: [{ name: "case" }],
          get: { "x-edara-authorization": "D" },
          post: { tags: ["Platform Companies"] },
        },
        "/direct-only": { get: { tags: ["Platform Companies"] } },
      },
      components: { schemas: { Contract: { type: "string" } } },
    };
    const original = JSON.stringify(platform);
    const delegated = deriveDelegatedContract(platform);
    expect(JSON.stringify(platform)).toBe(original);
    expect(Object.keys(delegated.paths)).toEqual(["/shared-path"]);
    expect(delegated.paths["/shared-path"]).toEqual({
      parameters: [{ name: "case" }],
      get: { "x-edara-authorization": "D" },
    });
    expect(delegated.components).toEqual(platform.components);
  });
});
