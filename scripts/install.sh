#!/usr/bin/env sh
set -e

# SolForge installer (downloads GitHub release binary)
# Usage: curl -fsSL https://sh.solforge.sh | sh
# Optional: SOLFORGE_VERSION=v0.2.5 curl -fsSL https://sh.solforge.sh | sh

REPO="nitishxyz/solforge"
BIN_NAME="solforge"
VERSION="${SOLFORGE_VERSION:-latest}"

info() { printf "\033[1;34m[i]\033[0m %s\n" "$*"; }
warn() { printf "\033[1;33m[!]\033[0m %s\n" "$*"; }
err()  { printf "\033[1;31m[x]\033[0m %s\n" "$*" 1>&2; }

get_latest_version() {
  http_get "https://api.github.com/repos/$REPO/releases/latest" | grep '"tag_name":' | sed -E 's/.*"v?([^"]+)".*/\1/'
}

compare_versions() {
  [ "$1" = "$2" ] && return 0
  
  old_ifs=$IFS
  IFS=.
  set -- $1
  v1_major=$1 v1_minor=$2 v1_patch=$3
  set -- $2
  v2_major=$1 v2_minor=$2 v2_patch=$3
  IFS=$old_ifs
  
  [ "${v1_major:-0}" -gt "${v2_major:-0}" ] && return 1
  [ "${v1_major:-0}" -lt "${v2_major:-0}" ] && return 2
  [ "${v1_minor:-0}" -gt "${v2_minor:-0}" ] && return 1
  [ "${v1_minor:-0}" -lt "${v2_minor:-0}" ] && return 2
  [ "${v1_patch:-0}" -gt "${v2_patch:-0}" ] && return 1
  [ "${v1_patch:-0}" -lt "${v2_patch:-0}" ] && return 2
  return 0
}

# Detect downloader
http_get() {
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL "$1"
  elif command -v wget >/dev/null 2>&1; then
    wget -qO- "$1"
  else
    err "Need 'curl' or 'wget' to download binaries"
    exit 1
  fi
}

http_down() {
  dest="$2"
  if command -v curl >/dev/null 2>&1; then
    curl -fL --progress-bar -o "$dest" "$1"
  else
    wget -qO "$dest" "$1"
  fi
}

# OS/arch detection
uname_s=$(uname -s 2>/dev/null || echo unknown)
uname_m=$(uname -m 2>/dev/null || echo unknown)

case "$uname_s" in
  Linux)  os="linux" ;;
  Darwin) os="darwin" ;;
  *) err "Unsupported OS: $uname_s"; exit 1 ;;
esac

case "$uname_m" in
  x86_64|amd64) arch="x64" ;;
  arm64|aarch64) arch="arm64" ;;
  *) err "Unsupported architecture: $uname_m"; exit 1 ;;
esac

asset="${BIN_NAME}-${os}-${arch}"
ext=""
filename="$asset$ext"

# Build URL
if [ "$VERSION" = "latest" ]; then
  base="https://github.com/$REPO/releases/latest/download"
else
  base="https://github.com/$REPO/releases/download/$VERSION"
fi

url="$base/$filename"

info "Installing $BIN_NAME ($os/$arch) from: $url"



# Download
tmpdir=${TMPDIR:-/tmp}
tmpfile="$tmpdir/$filename"
http_down "$url" "$tmpfile"

# Make executable
chmod +x "$tmpfile"

# Install to ~/.local/bin (same as start.cjs)
install_dir="$HOME/.local/bin"
mkdir -p "$install_dir"
info "Moving binary to $install_dir"
mv "$tmpfile" "$install_dir/$BIN_NAME"

# Verify
if "$install_dir/$BIN_NAME" --version >/dev/null 2>&1; then
  ver=$("$install_dir/$BIN_NAME" --version 2>/dev/null || true)
  info "$BIN_NAME installed: $ver"
else
  warn "Installed, but failed to run --version"
fi

# PATH hint
case ":$PATH:" in
  *":$install_dir:"*) :;;
  *) warn "Add $install_dir to your PATH to use '$BIN_NAME'" ;;
esac

info "Done. Run: $BIN_NAME --help"
