/**
 * Monaco Monarch language definition for Caddyfile.
 *
 * Based on the TextMate grammar from:
 * https://github.com/caddyserver/vscode-caddyfile
 */

import type * as Monaco from "monaco-editor";

export const caddyfileLanguageId = "caddyfile";

export const caddyfileLanguageConfig: Monaco.languages.LanguageConfiguration = {
  comments: {
    lineComment: "#",
  },
  brackets: [
    ["{", "}"],
    ["[", "]"],
    ["(", ")"],
  ],
  autoClosingPairs: [
    { open: "{", close: "}" },
    { open: "[", close: "]" },
    { open: "(", close: ")" },
    { open: '"', close: '"' },
    { open: "`", close: "`" },
  ],
  surroundingPairs: [
    { open: "{", close: "}" },
    { open: "[", close: "]" },
    { open: "(", close: ")" },
    { open: '"', close: '"' },
    { open: "`", close: "`" },
  ],
};

const DIRECTIVES = [
  "abort",
  "acme_server",
  "basicauth",
  "basic_auth",
  "bind",
  "encode",
  "error",
  "file_server",
  "forward_auth",
  "handle",
  "handle_errors",
  "handle_path",
  "header",
  "import",
  "invoke",
  "log",
  "map",
  "method",
  "metrics",
  "php_fastcgi",
  "push",
  "redir",
  "request_body",
  "request_header",
  "respond",
  "reverse_proxy",
  "rewrite",
  "root",
  "route",
  "templates",
  "tls",
  "try_files",
  "uri",
  "vars",
];

const GLOBAL_OPTIONS = [
  "debug",
  "http_port",
  "https_port",
  "default_bind",
  "order",
  "storage",
  "storage_clean_interval",
  "renew_interval",
  "ocsp_interval",
  "admin",
  "log",
  "grace_period",
  "shutdown_delay",
  "auto_https",
  "email",
  "default_sni",
  "local_certs",
  "skip_install_trust",
  "acme_ca",
  "acme_ca_root",
  "acme_eab",
  "acme_dns",
  "on_demand_tls",
  "key_type",
  "cert_issuer",
  "ocsp_stapling",
  "preferred_chains",
  "servers",
  "pki",
  "events",
];

export const caddyfileMonarchLanguage: Monaco.languages.IMonarchLanguage = {
  defaultToken: "",
  tokenPostfix: ".caddyfile",

  directives: DIRECTIVES,
  globalOptions: GLOBAL_OPTIONS,

  tokenizer: {
    root: [
      // Comments
      [/#.*$/, "comment"],

      // Strings
      [/"/, "string", "@string_double"],
      [/`/, "string", "@string_backtick"],

      // Matchers (@name)
      [/@[^\s]+/, "annotation"],

      // Placeholders {var}
      [/\{[\w.[\]$+-]+\}/, "variable"],

      // Brackets
      [/[{}]/, "@brackets"],

      // Status codes (3-digit numbers)
      [/\b\d{3}\b/, "number"],

      // Ports (:number)
      [/:\d+/, "number"],

      // URLs/domains
      [/https?:\/\/[^\s]+/, "keyword"],
      [/localhost(:\d+)?/, "keyword"],

      // IP addresses
      [/\b(?:\d{1,3}\.){3}\d{1,3}\b/, "keyword"],

      // Directives (at start of line, after optional whitespace)
      [
        /^\s*([a-zA-Z_][\w-]*)/,
        {
          cases: {
            "@directives": "entity.name.function",
            "@globalOptions": "support.constant",
            "@default": "identifier",
          },
        },
      ],

      // Paths
      [/\/[\w\-./*]+/, "string.link"],

      // Wildcard
      [/\*/, "variable"],

      // Other identifiers
      [/[a-zA-Z_][\w-]*/, "identifier"],

      // Numbers
      [/\d+/, "number"],
    ],

    string_double: [
      [/[^\\"]+/, "string"],
      [/\\./, "string.escape"],
      [/"/, "string", "@pop"],
    ],

    string_backtick: [
      [/[^`]+/, "string"],
      [/`/, "string", "@pop"],
    ],
  },
};
