import { spawn } from "node:child_process";

const serverUrl = "http://127.0.0.1:3000";
const serverTimeoutMs = 60_000;
const serverCommand = ["bun", "./node_modules/vite/bin/vite.js", "--host", "127.0.0.1"];
const playwrightCommand = [
  "node",
  "./node_modules/@playwright/test/cli.js",
  "test",
  ...process.argv.slice(2),
];

function spawnProcess(command, args, options = {}) {
  return spawn(command, args, {
    stdio: "inherit",
    windowsHide: true,
    ...options,
  });
}

async function waitForServer() {
  const startedAt = Date.now();
  let lastError = "";

  while (Date.now() - startedAt < serverTimeoutMs) {
    try {
      const response = await fetch(serverUrl);

      if (response.ok) {
        return;
      }

      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Timed out waiting for ${serverUrl}: ${lastError}`);
}

function waitForExit(child) {
  return new Promise((resolve) => {
    child.once("exit", (code, signal) => {
      resolve({ code, signal });
    });
  });
}

async function stopProcess(child) {
  if (child.exitCode != null || child.signalCode != null) {
    return;
  }

  child.kill();

  const stopped = await Promise.race([
    waitForExit(child).then(() => true),
    new Promise((resolve) => setTimeout(() => resolve(false), 2_000)),
  ]);

  if (stopped || child.pid == null || process.platform !== "win32") {
    return;
  }

  await new Promise((resolve) => {
    const taskkill = spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], {
      stdio: "ignore",
      windowsHide: true,
    });

    taskkill.once("exit", resolve);
  });
}

const server = spawnProcess(serverCommand[0], serverCommand.slice(1), {
  env: { ...process.env, PLAYWRIGHT_SKIP_WEB_SERVER: "1" },
});

try {
  await waitForServer();

  const playwright = spawnProcess(playwrightCommand[0], playwrightCommand.slice(1), {
    env: { ...process.env, PLAYWRIGHT_SKIP_WEB_SERVER: "1" },
  });
  const { code, signal } = await waitForExit(playwright);

  if (signal != null) {
    console.error(`Playwright exited from signal ${signal}.`);
    process.exitCode = 1;
  } else {
    process.exitCode = code ?? 1;
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  await stopProcess(server);
}
