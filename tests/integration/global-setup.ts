/**
 * Global setup/teardown for integration tests.
 *
 * Starts a Caddy instance before all tests and stops it after.
 *
 * Strategy:
 * 1. If CADDY_TEST_URL is set — use external Caddy (manual setup)
 * 2. Otherwise — find and start a local `caddy` binary
 *
 * CI installs the binary to /tmp/caddy before running tests.
 * Locally, the binary can be at /tmp/caddy, /usr/local/bin/caddy, or on PATH.
 */

import { type ChildProcess, execSync, spawn } from "node:child_process";
import { existsSync, writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const HOST_PORT = 12019;
const CONFIG_PATH = join(tmpdir(), "caddy-integration-test.json");

let caddyProcess: ChildProcess | null = null;
let startMethod: "external" | "binary" | null = null;

function findCaddyBinary(): string | null {
  const candidates = ["/tmp/caddy", "/usr/local/bin/caddy", "/usr/bin/caddy"];
  for (const path of candidates) {
    if (existsSync(path)) return path;
  }
  try {
    return execSync("which caddy", { encoding: "utf-8", stdio: "pipe" }).trim();
  } catch {
    return null;
  }
}

function waitForCaddy(url: string, maxRetries = 30, intervalMs = 500): Promise<void> {
  return new Promise((resolve, reject) => {
    let attempts = 0;

    const check = async () => {
      attempts++;
      try {
        const res = await fetch(`${url}/config/`, {
          headers: { Origin: url },
        });
        if (res.ok) {
          resolve();
          return;
        }
      } catch {
        // Not ready yet
      }

      if (attempts >= maxRetries) {
        reject(new Error(`Caddy did not become ready after ${maxRetries} attempts`));
        return;
      }

      setTimeout(check, intervalMs);
    };

    void check();
  });
}

export async function setup() {
  const url = `http://localhost:${HOST_PORT}`;

  // Strategy 1: External Caddy (manual setup)
  const externalUrl = process.env["CADDY_TEST_URL"];
  if (externalUrl) {
    startMethod = "external";
    console.log(`Using external Caddy at ${externalUrl}`);
    await waitForCaddy(externalUrl);
    return;
  }

  // Strategy 2: Local binary
  const caddyBin = findCaddyBinary();
  if (!caddyBin) {
    throw new Error(
      "Caddy binary not found. Install it to /tmp/caddy or /usr/local/bin/caddy, or set CADDY_TEST_URL.",
    );
  }

  startMethod = "binary";
  console.log(`Starting Caddy from binary: ${caddyBin}`);

  // Write a JSON config — enforce_origin false allows Node.js fetch
  const config = JSON.stringify({
    admin: { listen: `localhost:${HOST_PORT}`, enforce_origin: false },
  });
  writeFileSync(CONFIG_PATH, config);

  caddyProcess = spawn(caddyBin, ["run", "--config", CONFIG_PATH], {
    stdio: ["ignore", "pipe", "pipe"],
    detached: false,
  });

  caddyProcess.stderr?.on("data", (data: Buffer) => {
    const msg = data.toString().trim();
    if (msg) console.log(`[caddy] ${msg}`);
  });

  console.log("Waiting for Caddy Admin API...");
  await waitForCaddy(url);
  console.log("Caddy is ready.");
}

export async function teardown() {
  if (startMethod === "external") {
    return;
  }

  if (startMethod === "binary" && caddyProcess) {
    console.log("Stopping Caddy process...");
    caddyProcess.kill("SIGTERM");
    caddyProcess = null;
    try {
      unlinkSync(CONFIG_PATH);
    } catch {
      // Already cleaned up
    }
  }
}
