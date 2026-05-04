/**
 * Reusable config fixtures for integration tests.
 */

/** A minimal HTTP server that listens on a test port. */
export const MINIMAL_SERVER = {
  listen: [":18080"],
  routes: [
    {
      handle: [
        {
          handler: "static_response",
          body: "hello from test",
        },
      ],
    },
  ],
};

/** A basic route with a static response handler (no host matcher to avoid port binding issues). */
export const SAMPLE_ROUTE = {
  handle: [
    {
      handler: "static_response",
      body: "test route",
      status_code: 200,
    },
  ],
};

/** Another route for testing multiple routes. */
export const SAMPLE_ROUTE_B = {
  handle: [
    {
      handler: "static_response",
      body: "route b",
      status_code: 200,
    },
  ],
};

/** A log configuration object. */
export const SAMPLE_LOG = {
  writer: {
    output: "stdout",
  },
  level: "INFO",
};

/** Another log config for testing updates. */
export const SAMPLE_LOG_UPDATED = {
  writer: {
    output: "stdout",
  },
  level: "DEBUG",
};

/** A TLS automation policy. */
export const SAMPLE_TLS_POLICY = {
  subjects: ["example.com"],
  issuers: [
    {
      module: "internal",
    },
  ],
};

/** Another TLS policy for testing. */
export const SAMPLE_TLS_POLICY_B = {
  subjects: ["other.com"],
  issuers: [
    {
      module: "internal",
    },
  ],
};
