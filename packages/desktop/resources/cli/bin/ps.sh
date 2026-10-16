#!/usr/bin/env bash

function app_realpath() {
  SOURCE=$1
  while [ -h "$SOURCE" ]; do
    DIR=$(dirname "$SOURCE")
    SOURCE=$(readlink "$SOURCE")
    [[ $SOURCE != /* ]] && SOURCE=$DIR/$SOURCE
  done
  SOURCE_DIR="$( cd -P "$( dirname "$SOURCE" )" >/dev/null 2>&1 && pwd )"
  echo "${SOURCE_DIR%%${SOURCE_DIR#*.app}}"
}

if [ -n "$APP_BUNDLE_DIR" ]; then
  APP_PATH="$APP_BUNDLE_DIR"
else
  APP_PATH="$(app_realpath "${BASH_SOURCE[0]}")"
fi

if [ -z "$APP_PATH" ]; then
  echo "Palimpsest CLI cannot find its app bundle. Reinstall from the Palimpsest DMG." >&2
  echo "{\"error\":\"ps-wrapper-resolution-failed\",\"hint\":\"The ps.sh wrapper could not resolve its enclosing .app bundle. Reinstall Palimpsest from the DMG, or npm install -g @palimpsest/cli for terminal access.\",\"source\":\"${BASH_SOURCE[0]}\"}" >&2
  exit 69
fi

CONTENTS="$APP_PATH/Contents"
APP_NAME="$(basename "$APP_PATH" .app)"
ELECTRON="$CONTENTS/MacOS/$APP_NAME"
CLI="$CONTENTS/Resources/cli/dist/cli.mjs"

if [ ! -f "$CLI" ] || [ ! -x "$ELECTRON" ]; then
  echo "Palimpsest has been removed. Reinstall from the Palimpsest DMG." >&2
  PS_INIT_COMMAND="ps init"
  case "$(basename "${BASH_SOURCE[0]}")" in *-beta) PS_INIT_COMMAND="ps-beta init" ;; esac
  case "$PS_CHANNEL" in [Bb][Ee][Tt][Aa]) PS_INIT_COMMAND="ps-beta init" ;; esac
  echo '{"error":"ps-bundle-missing","hint":"Palimpsest app appears to have been removed. Reinstall from the DMG, or remove Palimpsest entries from your MCP config and rerun '"$PS_INIT_COMMAND"'."}' >&2
  exit 69
fi

# UPSTREAM(electron@44.5.1): an ELECTRON_RUN_AS_NODE boot reads its own basename
#   via _NSGetExecutablePath() and SIGTRAPs on anything but "<product> Helper",
#   so the executable name below is fixed by Electron, not by us.
RUNTIME="$ELECTRON"
case "$1" in
  mcp|start)
    HELPER="$CONTENTS/Frameworks/$APP_NAME Server.app/Contents/MacOS/$APP_NAME Helper"
    if [ -x "$HELPER" ]; then
      RUNTIME="$HELPER"
    fi
    ;;
esac

export PS_NODE_OPTIONS="$NODE_OPTIONS"
unset NODE_OPTIONS

ELECTRON_RUN_AS_NODE=1 "$RUNTIME" "$CLI" "$@"
exit $?
