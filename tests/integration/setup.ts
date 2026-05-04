/**
 * Per-test setup — resets Caddy config before each test for isolation.
 */

import { beforeEach } from "vitest";
import { configApi } from "./helpers/caddy-client.js";

const PORT = process.env["CADDY_TEST_URL"]
  ? new URL(process.env["CADDY_TEST_URL"]).port
  : "12019";

beforeEach(async () => {
  // Reset Caddy to a clean config before each test.
  // We must preserve the admin block to keep Caddy listening on the test port.
  await configApi.load({
    admin: {
      listen: `localhost:${PORT}`,
      enforce_origin: false,
    },
  });
});
