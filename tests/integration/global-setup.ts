/**
 * Global setup/teardown for integration tests.
 *
 * Starts a Caddy instance before all tests and stops it after.
 *
 * Strategy (in order of priority):
 * 1. If CADDY_TEST_URL is set — use external Caddy (CI or manual)
 * 2. If Docker is available — start a Caddy container
 * 3. If `caddy` binary is found — start a local Caddy process
 */

import { type ChildProcess, execSync, spawn } from "node:child_process";
import { existsSync, writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CONTAINER_NAME = "caddy-integration-test";
const HOST_PORT = 12019;
const CONFIG_PATH = join(tmpdir(), "caddy-integration-test.json");

let caddyProcess: ChildProcess | null = null;
let startMethod: "external" | "docker" | "binary" | null = null;

function exec(cmd: string): string {
  return execSync(cmd, { encoding: "utf-8", stdio: "pipe" }).trim();
}

function isDockerAvailable(): boolean {
  try {
    exec("docker info");
    return true;
  } catch {
    return false;
  }
}

function findCaddyBinary(): string | null {
  // Check common locations
  const candidates = ["/tmp/caddy", "/usr/local/bin/caddy", "/usr/bin/caddy"];
  for (const path of candidates) {
    if (existsSync(path)) return path;
  }
  // Check PATH
  try {
    return exec("which caddy");
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

  // Strategy 1: External Caddy (CI or manual)
  const externalUrl = process.env["CADDY_TEST_URL"];
  if (externalUrl) {
    startMethod = "external";
    console.log(`Using external Caddy at ${externalUrl}`);
    await waitForCaddy(externalUrl);
    return;
  }

  // Strategy 2: Docker
  if (isDockerAvailable()) {
    startMethod = "docker";

    // Clean up any leftover container
    try {
      exec(`docker rm -f ${CONTAINER_NAME}`);
    } catch {
      // Container doesn't exist — fine
    }

    console.log("Starting Caddy Docker container...");
    exec(
      `docker run -d --name ${CONTAINER_NAME} -p ${HOST_PORT}:2019 caddy:2 caddy run --resume`,
    );

    console.log("Waiting for Caddy Admin API...");
    await waitForCaddy(url);
    console.log("Caddy is ready (Docker).");
    return;
  }

  // Strategy 3: Local binary
  const caddyBin = findCaddyBinary();
  if (caddyBin) {
    startMethod = "binary";
    console.log(`Starting Caddy from binary: ${caddyBin}`);

    // Write a temp JSON config — enforce_origin false allows Node.js fetch
    const config = JSON.stringify({
      admin: { listen: `localhost:${HOST_PORT}`, enforce_origin: false },
    });
    writeFileSync(CONFIG_PATH, config);

    caddyProcess = spawn(caddyBin, ["run", "--config", CONFIG_PATH], {
      stdio: ["ignore", "pipe", "pipe"],
      detached: false,
    });

    // Log stderr for debugging
    caddyProcess.stderr?.on("data", (data: Buffer) => {
      const msg = data.toString().trim();
      if (msg) console.log(`[caddy] ${msg}`);
    });

    console.log("Waiting for Caddy Admin API...");
    await waitForCaddy(url);
    console.log("Caddy is ready (binary).");
    return;
  }

  throw new Error(
    "No Caddy instance available. Set CADDY_TEST_URL, install Docker, or install the caddy binary.",
  );
}

export async function teardown() {
  if (startMethod === "external") {
    return;
  }

  if (startMethod === "docker") {
    console.log("Stopping Caddy Docker container...");
    try {
      exec(`docker rm -f ${CONTAINER_NAME}`);
    } catch {
      // Container might already be gone
    }
    return;
  }

  if (startMethod === "binary" && caddyProcess) {
    console.log("Stopping Caddy process...");
    caddyProcess.kill("SIGTERM");
    caddyProcess = null;
    // Clean up temp Caddyfile
    try {
      unlinkSync(CONFIG_PATH);
    } catch {
      // Already cleaned up
    }
  }
}
