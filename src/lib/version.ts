/**
 * Version utilities for reading and managing app version information,
 * and checking for updates from GitHub releases.
 */

import packageJson from "../../package.json";

export const APP_VERSION = packageJson.version;
export const GITHUB_URL = "https://github.com/yuanshanhua/caddy-ui";

export function getVersionInfo() {
  return {
    version: APP_VERSION,
    githubUrl: GITHUB_URL,
  };
}

/** GitHub release shape from the public API. */
export interface GitHubRelease {
  tag_name: string;
  html_url: string;
}

/**
 * Fetch the latest release from GitHub. Returns null on failure (rate limit, network, etc.)
 * so callers can fail silently.
 */
export async function fetchLatestRelease(): Promise<GitHubRelease | null> {
  try {
    const res = await fetch("https://api.github.com/repos/yuanshanhua/caddy-ui/releases/latest");
    if (!res.ok) return null;
    return (await res.json()) as GitHubRelease;
  } catch {
    return null;
  }
}

/** Parse a semver-ish string "0.3.0" or "v0.3.0" into [major, minor, patch]. */
function parseVersion(v: string): [number, number, number] {
  const cleaned = v.replace(/^v/, "");
  const parts = cleaned.split(".").map(Number);
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
}

/** Returns true if `latest` is strictly greater than `current`. */
export function isNewer(latest: string, current: string): boolean {
  const [aMajor, aMinor, aPatch] = parseVersion(latest);
  const [bMajor, bMinor, bPatch] = parseVersion(current);
  if (aMajor !== bMajor) return aMajor > bMajor;
  if (aMinor !== bMinor) return aMinor > bMinor;
  return aPatch > bPatch;
}
