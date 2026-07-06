import { spawnSync } from "node:child_process";
import { constants, accessSync, existsSync } from "node:fs";
import { delimiter, join } from "node:path";

if (process.env.CI === "true") {
  console.log("Skipping Lefthook install in CI.");
  process.exit(0);
}

if (!existsSync(".git")) {
  console.log("Skipping Lefthook install outside a Git checkout.");
  process.exit(0);
}

const gitCommand = resolveGitCommand();

if (gitCommand == null) {
  console.log("Skipping Lefthook install because Git is not available on PATH.");
  process.exit(0);
}

if (!canWriteHooks()) {
  console.log("Skipping Lefthook install because .git/hooks is not writable.");
  process.exit(0);
}

const result = spawnSync("lefthook", ["install"], {
  env: gitCommand.env,
  shell: process.platform === "win32",
  stdio: "inherit",
});

if (result.status !== 0) {
  console.log("Skipping Lefthook install because lefthook install did not complete.");
}

function resolveGitCommand() {
  if (commandExists("git", process.env)) {
    return { env: process.env };
  }

  const windowsGitPaths = [
    "C:\\Program Files\\Git\\cmd",
    "C:\\Program Files\\Git\\bin",
    "C:\\Program Files (x86)\\Git\\cmd",
    "C:\\Program Files (x86)\\Git\\bin",
  ];

  for (const gitPath of windowsGitPaths) {
    const env = {
      ...process.env,
      PATH: `${gitPath}${delimiter}${process.env.PATH ?? ""}`,
      Path: `${gitPath}${delimiter}${process.env.Path ?? ""}`,
    };

    if (commandExists("git", env)) {
      return { env };
    }
  }

  return null;
}

function commandExists(command, env) {
  const result = spawnSync(command, ["--version"], {
    env,
    shell: process.platform === "win32",
    stdio: "ignore",
  });

  return result.status === 0;
}

function canWriteHooks() {
  const hooksPath = join(".git", "hooks");

  try {
    accessSync(hooksPath, constants.W_OK);
    return true;
  } catch {
    return false;
  }
}
