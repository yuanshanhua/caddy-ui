/**
 * Version utilities for reading and managing app version information.
 */

// In Vite, we can import package.json directly using a special syntax
// This will be handled by Vite's build system
import packageJson from "../../package.json";

export const APP_VERSION = packageJson.version;
export const GITHUB_URL = "https://github.com/yuanshanhua/caddy-ui";

export function getVersionInfo() {
  return {
    version: APP_VERSION,
    githubUrl: GITHUB_URL,
  };
}
