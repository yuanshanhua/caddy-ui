#!/usr/bin/env bash
#
# Caddy UI - One-Click Deploy Script
#
# Downloads pre-built Caddy UI from GitHub Releases and generates
# a secure Caddyfile configuration with BasicAuth protection.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/yuanshanhua/caddy-ui/master/deploy.sh | bash
#   # or download first:
#   curl -fsSL https://raw.githubusercontent.com/yuanshanhua/caddy-ui/master/deploy.sh -o deploy.sh && bash deploy.sh
#
set -euo pipefail

# =============================================================================
# Constants
# =============================================================================

REPO="yuanshanhua/caddy-ui"
GITHUB_API="https://api.github.com/repos/${REPO}/releases/latest"
DEFAULT_INSTALL_DIR="/opt/caddy-ui"
DEFAULT_CADDYFILE="/etc/caddy/Caddyfile"
DEFAULT_ADMIN_PORT="2019"
MIN_CADDY_VERSION="2.7"
SCRIPT_VERSION="1.0.0"

# =============================================================================
# Colors & Formatting
# =============================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
DIM='\033[2m'
RESET='\033[0m'

# =============================================================================
# Utility Functions
# =============================================================================

info() {
  echo -e "${BLUE}[INFO]${RESET} $*"
}

warn() {
  echo -e "${YELLOW}[WARN]${RESET} $*"
}

error() {
  echo -e "${RED}[ERROR]${RESET} $*" >&2
}

success() {
  echo -e "${GREEN}[OK]${RESET} $*"
}

die() {
  error "$@"
  exit 1
}

# Cleanup temp files on exit
TEMP_FILES=()
cleanup() {
  for f in "${TEMP_FILES[@]:-}"; do
    rm -f "$f" 2>/dev/null || true
  done
}
trap cleanup EXIT

# Create a temp file and register it for cleanup
make_temp() {
  local tmp
  tmp=$(mktemp)
  TEMP_FILES+=("$tmp")
  echo "$tmp"
}

# Download a URL to a file (supports curl or wget)
download_file() {
  local url="$1"
  local dest="$2"
  local auth_header=""

  if [[ -n "${GITHUB_TOKEN:-}" ]]; then
    auth_header="Authorization: token ${GITHUB_TOKEN}"
  fi

  if command -v curl &>/dev/null; then
    if [[ -n "$auth_header" ]]; then
      curl -fsSL -H "$auth_header" -o "$dest" "$url"
    else
      curl -fsSL -o "$dest" "$url"
    fi
  elif command -v wget &>/dev/null; then
    if [[ -n "$auth_header" ]]; then
      wget -q --header="$auth_header" -O "$dest" "$url"
    else
      wget -q -O "$dest" "$url"
    fi
  else
    die "Neither curl nor wget found. Please install one of them."
  fi
}

# Fetch URL content to stdout
fetch_url() {
  local url="$1"
  local auth_header=""

  if [[ -n "${GITHUB_TOKEN:-}" ]]; then
    auth_header="Authorization: token ${GITHUB_TOKEN}"
  fi

  if command -v curl &>/dev/null; then
    if [[ -n "$auth_header" ]]; then
      curl -fsSL -H "$auth_header" "$url"
    else
      curl -fsSL "$url"
    fi
  elif command -v wget &>/dev/null; then
    if [[ -n "$auth_header" ]]; then
      wget -q --header="$auth_header" -O - "$url"
    else
      wget -q -O - "$url"
    fi
  fi
}

# Run a command with sudo if needed
run_privileged() {
  if [[ $EUID -eq 0 ]]; then
    "$@"
  else
    sudo "$@"
  fi
}

# Check if we need sudo for a given directory
needs_sudo() {
  local dir="$1"
  # Walk up to find the first existing parent
  while [[ ! -d "$dir" ]]; do
    dir=$(dirname "$dir")
  done
  [[ ! -w "$dir" ]]
}

# Detect the group that Caddy runs as (for file ownership)
detect_caddy_group() {
  # Method 1: Check systemd unit for Group= directive
  if command -v systemctl &>/dev/null; then
    local unit_group
    unit_group=$(systemctl show caddy -p Group 2>/dev/null | cut -d= -f2)
    if [[ -n "$unit_group" && "$unit_group" != "[not set]" ]]; then
      # Verify the group exists
      if getent group "$unit_group" &>/dev/null; then
        echo "$unit_group"
        return 0
      fi
    fi
  fi

  # Method 2: Check if a running caddy process reveals its group
  local caddy_pid
  caddy_pid=$(pgrep -x caddy | head -1)
  if [[ -n "$caddy_pid" ]]; then
    local proc_group
    proc_group=$(ps -o group= -p "$caddy_pid" 2>/dev/null | tr -d ' ')
    if [[ -n "$proc_group" && "$proc_group" != "root" ]]; then
      echo "$proc_group"
      return 0
    fi
  fi

  # Method 3: Check if 'caddy' group exists (common default)
  if getent group caddy &>/dev/null; then
    echo "caddy"
    return 0
  fi

  # No caddy group found
  return 1
}

# Set correct ownership on a config file so Caddy can read it
set_config_ownership() {
  local file="$1"
  local caddy_group

  if caddy_group=$(detect_caddy_group); then
    info "Detected Caddy group: ${BOLD}$caddy_group${RESET}"
    if needs_sudo "$(dirname "$file")"; then
      run_privileged chown "root:$caddy_group" "$file"
    else
      chown "root:$caddy_group" "$file" 2>/dev/null || true
    fi
  fi
  # chmod 640 is already set by the caller
}

# =============================================================================
# Prerequisite Checks
# =============================================================================

check_prerequisites() {
  echo ""
  info "Checking prerequisites..."
  echo ""

  # Check caddy binary
  local caddy_bin=""
  if command -v caddy &>/dev/null; then
    caddy_bin=$(command -v caddy)
  elif [[ -x /usr/bin/caddy ]]; then
    caddy_bin="/usr/bin/caddy"
  elif [[ -x /usr/local/bin/caddy ]]; then
    caddy_bin="/usr/local/bin/caddy"
  else
    die "Caddy not found. Please install Caddy first: https://caddyserver.com/docs/install"
  fi
  success "Caddy found: $caddy_bin"

  # Check caddy version
  local version_output
  version_output=$("$caddy_bin" version 2>/dev/null || echo "unknown")
  local version
  version=$(echo "$version_output" | head -1 | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1 || echo "0.0.0")

  local major minor
  major=$(echo "$version" | cut -d. -f1)
  minor=$(echo "$version" | cut -d. -f2)

  if [[ "$major" -lt 2 ]] || { [[ "$major" -eq 2 ]] && [[ "$minor" -lt 7 ]]; }; then
    die "Caddy version $version is too old. Minimum required: $MIN_CADDY_VERSION (found: $version)"
  fi
  success "Caddy version: $version"

  # Check download tools
  if command -v curl &>/dev/null; then
    success "curl available"
  elif command -v wget &>/dev/null; then
    success "wget available"
  else
    die "Neither curl nor wget found. Please install one of them."
  fi

  # Check tar
  if ! command -v tar &>/dev/null; then
    die "tar not found. Please install tar."
  fi
  success "tar available"

  # Store caddy binary path for later use
  CADDY_BIN="$caddy_bin"
}

# =============================================================================
# Existing Installation Detection
# =============================================================================

detect_existing_install() {
  local install_dir="${1:-$DEFAULT_INSTALL_DIR}"

  if [[ -f "$install_dir/dist/index.html" ]]; then
    return 0 # existing install found
  fi
  return 1 # no existing install
}

# =============================================================================
# Update Flow
# =============================================================================

do_update() {
  local install_dir="${1:-$DEFAULT_INSTALL_DIR}"

  echo ""
  echo -e "${BOLD}========================================${RESET}"
  echo -e "${BOLD} Existing Caddy UI Installation Found${RESET}"
  echo -e "${BOLD}========================================${RESET}"
  echo ""
  info "Installation directory: ${BOLD}$install_dir${RESET}"
  echo ""

  # Fetch latest version info
  info "Fetching latest release information..."
  local release_json
  release_json=$(make_temp)
  if ! fetch_url "$GITHUB_API" > "$release_json" 2>/dev/null; then
    die "Failed to fetch release info from GitHub. Check network or set GITHUB_TOKEN."
  fi

  local latest_version
  latest_version=$(grep -o '"tag_name"[[:space:]]*:[[:space:]]*"[^"]*"' "$release_json" | head -1 | cut -d'"' -f4)

  if [[ -z "$latest_version" ]]; then
    die "Could not determine latest version from GitHub."
  fi

  echo ""
  info "Latest version: ${BOLD}$latest_version${RESET}"
  echo ""

  # Ask user to confirm
  read -rp "$(echo -e "${YELLOW}Do you want to update to $latest_version? [y/N]:${RESET} ")" confirm
  if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
    info "Update cancelled."
    exit 0
  fi

  # Get download URL
  local download_url
  download_url=$(grep -o '"browser_download_url"[[:space:]]*:[[:space:]]*"[^"]*dist\.tar\.gz"' "$release_json" | head -1 | cut -d'"' -f4)

  if [[ -z "$download_url" ]]; then
    die "Could not find dist.tar.gz in the latest release assets."
  fi

  # Download
  echo ""
  info "Downloading $latest_version..."
  local tarball
  tarball=$(make_temp)
  if ! download_file "$download_url" "$tarball"; then
    die "Download failed. URL: $download_url"
  fi
  success "Download complete."

  # Backup old dist
  local timestamp
  timestamp=$(date +%Y%m%d_%H%M%S)
  local backup_dir="$install_dir/dist.bak.$timestamp"

  info "Backing up current files to: $backup_dir"
  if needs_sudo "$install_dir"; then
    run_privileged mv "$install_dir/dist" "$backup_dir"
    run_privileged mkdir -p "$install_dir/dist"
  else
    mv "$install_dir/dist" "$backup_dir"
    mkdir -p "$install_dir/dist"
  fi

  # Extract new files
  info "Extracting new files..."
  if needs_sudo "$install_dir"; then
    run_privileged tar -xzf "$tarball" -C "$install_dir/dist"
    run_privileged find "$install_dir/dist" -type f -exec chmod 644 {} \;
    run_privileged find "$install_dir/dist" -type d -exec chmod 755 {} \;
  else
    tar -xzf "$tarball" -C "$install_dir/dist"
    find "$install_dir/dist" -type f -exec chmod 644 {} \;
    find "$install_dir/dist" -type d -exec chmod 755 {} \;
  fi

  echo ""
  echo -e "${GREEN}${BOLD}========================================${RESET}"
  echo -e "${GREEN}${BOLD} Update Successful!${RESET}"
  echo -e "${GREEN}${BOLD}========================================${RESET}"
  echo ""
  success "Caddy UI updated to $latest_version"
  info "Files: $install_dir/dist"
  info "Backup: $backup_dir"
  echo ""
  info "No Caddy restart required - new files are served immediately."
  echo ""
}

# =============================================================================
# Fresh Install - Parameter Collection
# =============================================================================

collect_params() {
  echo ""
  echo -e "${BOLD}========================================${RESET}"
  echo -e "${BOLD} Caddy UI - Fresh Installation${RESET}"
  echo -e "${BOLD}========================================${RESET}"
  echo ""

  # Domain
  while true; do
    read -rp "$(echo -e "${BLUE}Domain name${RESET} (e.g., example.com): ")" DOMAIN
    if [[ -n "$DOMAIN" ]]; then
      # Basic validation - must look like a domain
      if echo "$DOMAIN" | grep -qE '^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$'; then
        break
      else
        warn "Invalid domain format. Please enter a valid domain (e.g., example.com)"
      fi
    else
      warn "Domain is required."
    fi
  done

  # Username
  read -rp "$(echo -e "${BLUE}Username${RESET} [admin]: ")" AUTH_USER
  AUTH_USER="${AUTH_USER:-admin}"

  # Password
  while true; do
    echo -en "${BLUE}Password${RESET}: "
    read -rs AUTH_PASS
    echo ""

    if [[ ${#AUTH_PASS} -lt 8 ]]; then
      warn "Password must be at least 8 characters."
      continue
    fi

    echo -en "${BLUE}Confirm password${RESET}: "
    read -rs AUTH_PASS_CONFIRM
    echo ""

    if [[ "$AUTH_PASS" != "$AUTH_PASS_CONFIRM" ]]; then
      warn "Passwords do not match. Please try again."
    else
      break
    fi
  done

  # Admin API port
  read -rp "$(echo -e "${BLUE}Admin API port${RESET} [$DEFAULT_ADMIN_PORT]: ")" ADMIN_PORT
  ADMIN_PORT="${ADMIN_PORT:-$DEFAULT_ADMIN_PORT}"

  # Caddyfile path
  read -rp "$(echo -e "${BLUE}Caddyfile path${RESET} [$DEFAULT_CADDYFILE]: ")" CADDYFILE_PATH
  CADDYFILE_PATH="${CADDYFILE_PATH:-$DEFAULT_CADDYFILE}"
  # Expand ~ to $HOME
  if [[ "$CADDYFILE_PATH" == "~/"* ]]; then
    CADDYFILE_PATH="$HOME/${CADDYFILE_PATH:2}"
  elif [[ "$CADDYFILE_PATH" == "~" ]]; then
    CADDYFILE_PATH="$HOME"
  fi

  # Confirm settings
  echo ""
  echo -e "${BOLD}Configuration Summary:${RESET}"
  echo -e "  Domain:      ${GREEN}$DOMAIN${RESET}"
  echo -e "  Username:    ${GREEN}$AUTH_USER${RESET}"
  echo -e "  Password:    ${DIM}********${RESET}"
  echo -e "  Install dir: ${GREEN}$INSTALL_DIR${RESET}"
  echo -e "  Admin port:  ${GREEN}$ADMIN_PORT${RESET}"
  echo -e "  Caddyfile:   ${GREEN}$CADDYFILE_PATH${RESET}"
  echo ""

  read -rp "$(echo -e "${YELLOW}Proceed with these settings? [Y/n]:${RESET} ")" proceed
  if [[ "$proceed" == "n" || "$proceed" == "N" ]]; then
    info "Installation cancelled."
    exit 0
  fi
}

# =============================================================================
# Password Hashing
# =============================================================================

hash_password() {
  info "Generating password hash..."

  PASS_HASH=$("$CADDY_BIN" hash-password --plaintext "$AUTH_PASS" 2>/dev/null)

  if [[ -z "$PASS_HASH" ]]; then
    die "Failed to generate password hash. Ensure caddy hash-password works."
  fi

  success "Password hash generated."
}

# =============================================================================
# Caddyfile Generation
# =============================================================================

generate_caddyfile() {
  GENERATED_CONFIG=$(cat <<EOF
{
    admin localhost:${ADMIN_PORT}
}

${DOMAIN} {
    basic_auth {
        ${AUTH_USER} ${PASS_HASH}
    }

    # API reverse proxy → Caddy Admin API
    handle /api/* {
        uri strip_prefix /api
        reverse_proxy localhost:${ADMIN_PORT} {
            header_up Host localhost:${ADMIN_PORT}
            header_up Origin http://localhost:${ADMIN_PORT}
        }
    }

    # Static files (SPA)
    handle {
        root * ${INSTALL_DIR}/dist
        try_files {path} /index.html
        file_server
    }
}
EOF
)
}

# =============================================================================
# Config Write Decision
# =============================================================================

is_caddy_running() {
  # Check via systemctl first
  if command -v systemctl &>/dev/null; then
    if systemctl is-active --quiet caddy 2>/dev/null; then
      return 0
    fi
  fi
  # Fallback to pgrep
  if pgrep -x caddy &>/dev/null; then
    return 0
  fi
  return 1
}

apply_config() {
  echo ""

  local caddyfile_dir
  caddyfile_dir=$(dirname "$CADDYFILE_PATH")

  if is_caddy_running && [[ -f "$CADDYFILE_PATH" ]]; then
    # Case A: Caddy is running AND existing Caddyfile exists - print only
    echo -e "${YELLOW}${BOLD}========================================${RESET}"
    echo -e "${YELLOW}${BOLD} Caddy is currently running${RESET}"
    echo -e "${YELLOW}${BOLD}========================================${RESET}"
    echo ""
    warn "For safety, this script will NOT modify the existing Caddy configuration"
    warn "while Caddy is running. Please apply the config manually."
    echo ""
    echo -e "${BOLD}Generated Caddyfile:${RESET}"
    echo -e "${DIM}────────────────────────────────────────${RESET}"
    echo "$GENERATED_CONFIG"
    echo -e "${DIM}────────────────────────────────────────${RESET}"
    echo ""

    # Save to a reference file
    local ref_file="${INSTALL_DIR}/caddy-ui.caddyfile"
    if needs_sudo "$INSTALL_DIR"; then
      echo "$GENERATED_CONFIG" | run_privileged tee "$ref_file" >/dev/null
      run_privileged chmod 640 "$ref_file"
    else
      echo "$GENERATED_CONFIG" > "$ref_file"
      chmod 640 "$ref_file"
    fi

    echo -e "${BOLD}Manual steps:${RESET}"
    echo ""
    echo "  1. Backup your current config:"
    echo -e "     ${DIM}cp $CADDYFILE_PATH ${CADDYFILE_PATH}.bak${RESET}"
    echo ""
    echo "  2. Add the UI configuration to your Caddyfile."
    echo -e "     A copy has been saved to: ${GREEN}$ref_file${RESET}"
    echo ""
    echo "  3. Reload Caddy:"
    echo -e "     ${DIM}caddy reload --config $CADDYFILE_PATH${RESET}"
    echo ""

    CONFIG_WRITTEN=false

  elif [[ -f "$CADDYFILE_PATH" ]]; then
    # Case B: Caddy is NOT running but existing Caddyfile exists - warn before overwrite
    echo ""
    echo -e "${RED}${BOLD}╔══════════════════════════════════════════════════════╗${RESET}"
    echo -e "${RED}${BOLD}║                                                      ║${RESET}"
    echo -e "${RED}${BOLD}║   WARNING: EXISTING CONFIGURATION DETECTED           ║${RESET}"
    echo -e "${RED}${BOLD}║                                                      ║${RESET}"
    echo -e "${RED}${BOLD}║   This will OVERWRITE your current Caddyfile at:     ║${RESET}"
    echo -e "${RED}${BOLD}║   ${CADDYFILE_PATH}$(printf '%*s' $((37 - ${#CADDYFILE_PATH})) '')║${RESET}"
    echo -e "${RED}${BOLD}║                                                      ║${RESET}"
    echo -e "${RED}${BOLD}║   ALL existing configuration will be LOST!           ║${RESET}"
    echo -e "${RED}${BOLD}║                                                      ║${RESET}"
    echo -e "${RED}${BOLD}╚══════════════════════════════════════════════════════╝${RESET}"
    echo ""
    echo -e "${RED}Type ${BOLD}YES${RESET}${RED} (uppercase) to confirm overwrite, or anything else to cancel:${RESET}"
    read -rp "> " overwrite_confirm

    if [[ "$overwrite_confirm" != "YES" ]]; then
      warn "Overwrite cancelled."
      echo ""
      echo -e "${BOLD}Generated Caddyfile:${RESET}"
      echo -e "${DIM}────────────────────────────────────────${RESET}"
      echo "$GENERATED_CONFIG"
      echo -e "${DIM}────────────────────────────────────────${RESET}"
      echo ""

      # Save reference file
      local ref_file="${INSTALL_DIR}/caddy-ui.caddyfile"
      if needs_sudo "$INSTALL_DIR"; then
        echo "$GENERATED_CONFIG" | run_privileged tee "$ref_file" >/dev/null
        run_privileged chmod 640 "$ref_file"
      else
        echo "$GENERATED_CONFIG" > "$ref_file"
        chmod 640 "$ref_file"
      fi
      info "Config saved to: $ref_file"
      echo ""

      CONFIG_WRITTEN=false
      return
    fi

    # Backup existing Caddyfile
    local timestamp
    timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_path="${CADDYFILE_PATH}.bak.${timestamp}"
    info "Backing up existing Caddyfile to: $backup_path"
    if needs_sudo "$caddyfile_dir"; then
      run_privileged cp "$CADDYFILE_PATH" "$backup_path"
    else
      cp "$CADDYFILE_PATH" "$backup_path"
    fi
    success "Backup created."

    # Write new Caddyfile
    info "Writing Caddyfile to: $CADDYFILE_PATH"
    if needs_sudo "$caddyfile_dir"; then
      run_privileged mkdir -p "$caddyfile_dir"
      echo "$GENERATED_CONFIG" | run_privileged tee "$CADDYFILE_PATH" >/dev/null
      run_privileged chmod 640 "$CADDYFILE_PATH"
    else
      mkdir -p "$caddyfile_dir"
      echo "$GENERATED_CONFIG" > "$CADDYFILE_PATH"
      chmod 640 "$CADDYFILE_PATH"
    fi
    # Set ownership so non-root Caddy can read the config
    set_config_ownership "$CADDYFILE_PATH"
    success "Caddyfile written."

    CONFIG_WRITTEN=true

  else
    # Case C: No existing Caddyfile - write directly
    info "Writing Caddyfile to: $CADDYFILE_PATH"
    if needs_sudo "$caddyfile_dir"; then
      run_privileged mkdir -p "$caddyfile_dir"
      echo "$GENERATED_CONFIG" | run_privileged tee "$CADDYFILE_PATH" >/dev/null
      run_privileged chmod 640 "$CADDYFILE_PATH"
    else
      mkdir -p "$caddyfile_dir"
      echo "$GENERATED_CONFIG" > "$CADDYFILE_PATH"
      chmod 640 "$CADDYFILE_PATH"
    fi
    # Set ownership so non-root Caddy can read the config
    set_config_ownership "$CADDYFILE_PATH"
    success "Caddyfile written."

    CONFIG_WRITTEN=true
  fi
}

# =============================================================================
# File Download & Installation
# =============================================================================

download_and_install() {
  echo ""
  info "Fetching latest release information..."

  local release_json
  release_json=$(make_temp)
  if ! fetch_url "$GITHUB_API" > "$release_json" 2>/dev/null; then
    # Retry once
    warn "First attempt failed, retrying..."
    sleep 2
    if ! fetch_url "$GITHUB_API" > "$release_json" 2>/dev/null; then
      echo ""
      error "Failed to fetch release info from GitHub."
      error "Manual download: https://github.com/${REPO}/releases/latest"
      echo ""
      if [[ -n "${GITHUB_TOKEN:-}" ]]; then
        error "GITHUB_TOKEN is set but may be invalid."
      else
        info "Tip: Set GITHUB_TOKEN env var if you hit rate limits."
      fi
      exit 1
    fi
  fi

  local latest_version
  latest_version=$(grep -o '"tag_name"[[:space:]]*:[[:space:]]*"[^"]*"' "$release_json" | head -1 | cut -d'"' -f4)
  info "Latest version: ${BOLD}$latest_version${RESET}"

  # Get download URL
  local download_url
  download_url=$(grep -o '"browser_download_url"[[:space:]]*:[[:space:]]*"[^"]*dist\.tar\.gz"' "$release_json" | head -1 | cut -d'"' -f4)

  if [[ -z "$download_url" ]]; then
    die "Could not find dist.tar.gz in the latest release. Check: https://github.com/${REPO}/releases"
  fi

  # Download
  info "Downloading dist.tar.gz..."
  local tarball
  tarball=$(make_temp)
  if ! download_file "$download_url" "$tarball"; then
    die "Download failed. URL: $download_url"
  fi
  success "Download complete."

  # Create install directory
  info "Installing to: $INSTALL_DIR/dist"
  if needs_sudo "$INSTALL_DIR"; then
    run_privileged mkdir -p "$INSTALL_DIR/dist"
    run_privileged tar -xzf "$tarball" -C "$INSTALL_DIR/dist"
    run_privileged find "$INSTALL_DIR/dist" -type f -exec chmod 644 {} \;
    run_privileged find "$INSTALL_DIR/dist" -type d -exec chmod 755 {} \;
    # Set group ownership so non-root Caddy can read files
    local caddy_group
    if caddy_group=$(detect_caddy_group); then
      run_privileged chown -R "root:$caddy_group" "$INSTALL_DIR"
    fi
  else
    mkdir -p "$INSTALL_DIR/dist"
    tar -xzf "$tarball" -C "$INSTALL_DIR/dist"
    find "$INSTALL_DIR/dist" -type f -exec chmod 644 {} \;
    find "$INSTALL_DIR/dist" -type d -exec chmod 755 {} \;
  fi

  success "Files installed to: $INSTALL_DIR/dist"
}

# =============================================================================
# Completion Summary
# =============================================================================

print_summary() {
  echo ""
  echo -e "${GREEN}${BOLD}================================================${RESET}"
  echo -e "${GREEN}${BOLD}  Caddy UI deployed successfully!${RESET}"
  echo -e "${GREEN}${BOLD}================================================${RESET}"
  echo ""
  echo -e "  URL:      ${BOLD}https://${DOMAIN}/${RESET}"
  echo -e "  User:     ${BOLD}${AUTH_USER}${RESET}"
  echo -e "  Files:    ${BOLD}${INSTALL_DIR}/dist${RESET}"
  if [[ "${CONFIG_WRITTEN:-false}" == "true" ]]; then
    echo -e "  Config:   ${BOLD}${CADDYFILE_PATH}${RESET}"
  fi
  echo ""

  if [[ "${CONFIG_WRITTEN:-false}" == "true" ]]; then
    echo -e "${BOLD}Next steps:${RESET}"
    echo "  1. Start Caddy:"
    echo -e "     ${DIM}caddy start --config $CADDYFILE_PATH${RESET}"
    echo ""
    echo "  2. Or run as a system service:"
    echo -e "     ${DIM}sudo systemctl start caddy${RESET}"
    echo ""
    echo "  3. Access the UI at: https://${DOMAIN}/"
    echo ""
  else
    echo -e "${BOLD}Next steps:${RESET}"
    echo "  1. Apply the generated configuration (see above)"
    echo "  2. Reload or start Caddy"
    echo "  3. Access the UI at: https://${DOMAIN}/"
    echo ""
  fi
}

# =============================================================================
# Main
# =============================================================================

main() {
  echo ""
  echo -e "${BOLD}Caddy UI Deploy Script v${SCRIPT_VERSION}${RESET}"
  echo -e "${DIM}https://github.com/${REPO}${RESET}"
  echo ""

  # Check if terminal is available for interactive input
  if [[ ! -t 0 ]] && [[ ! -c /dev/tty ]]; then
    die "This script requires interactive input but no terminal is available."
  fi

  # Reclaim stdin from pipe so all reads get the terminal with line-editing
  if [[ ! -t 0 ]]; then
    exec < /dev/tty
  fi

  # Check prerequisites
  check_prerequisites

  # Check for existing installation
  # First check the default path
  if detect_existing_install "$DEFAULT_INSTALL_DIR"; then
    do_update "$DEFAULT_INSTALL_DIR"
    exit 0
  fi

  # Default path has no install - ask user for their install directory
  echo ""
  read -rp "$(echo -e "${BLUE}Install directory${RESET} [$DEFAULT_INSTALL_DIR]: ")" INSTALL_DIR
  INSTALL_DIR="${INSTALL_DIR:-$DEFAULT_INSTALL_DIR}"
  # Expand ~ to $HOME
  if [[ "$INSTALL_DIR" == "~/"* ]]; then
    INSTALL_DIR="$HOME/${INSTALL_DIR:2}"
  elif [[ "$INSTALL_DIR" == "~" ]]; then
    INSTALL_DIR="$HOME"
  fi

  # Check user-specified path for existing install
  if [[ "$INSTALL_DIR" != "$DEFAULT_INSTALL_DIR" ]] && detect_existing_install "$INSTALL_DIR"; then
    do_update "$INSTALL_DIR"
    exit 0
  fi

  # Fresh install flow
  collect_params

  # Generate password hash
  hash_password

  # Generate Caddyfile
  generate_caddyfile

  # Download and install static files
  download_and_install

  # Apply configuration
  apply_config

  # Print summary
  print_summary
}

main "$@"
