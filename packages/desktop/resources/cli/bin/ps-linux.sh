#!/usr/bin/env bash

SOURCE="${BASH_SOURCE[0]}"
while [ -h "$SOURCE" ]; do
  DIR=$(dirname "$SOURCE")
  SOURCE=$(readlink "$SOURCE")
  [[ $SOURCE != /* ]] && SOURCE=$DIR/$SOURCE
done
BIN_DIR="$( cd -P "$( dirname "$SOURCE" )" >/dev/null 2>&1 && pwd )"

ROOT_DIR="$(cd -P "$BIN_DIR/../../.." >/dev/null 2>&1 && pwd)"
ELECTRON=""
for NAME in palimpsest palimpsest-beta; do
  if [ -x "$ROOT_DIR/$NAME" ]; then
    ELECTRON="$ROOT_DIR/$NAME"
    break
  fi
done
CLI="$BIN_DIR/../dist/cli.mjs"

if [ ! -f "$CLI" ] || [ ! -x "$ELECTRON" ]; then
  echo "Palimpsest has been removed. Reinstall the Palimpsest package." >&2
  PS_INIT_COMMAND="ps init"
  case "$(basename "${BASH_SOURCE[0]}")" in *-beta) PS_INIT_COMMAND="ps-beta init" ;; esac
  case "$PS_CHANNEL" in [Bb][Ee][Tt][Aa]) PS_INIT_COMMAND="ps-beta init" ;; esac
  echo '{"error":"ps-bundle-missing","hint":"Palimpsest app appears to have been removed. Reinstall it, or remove Palimpsest entries from your MCP config and rerun '"$PS_INIT_COMMAND"'."}' >&2
  exit 69
fi

export PS_NODE_OPTIONS="$NODE_OPTIONS"
unset NODE_OPTIONS

ELECTRON_RUN_AS_NODE=1 "$ELECTRON" "$CLI" "$@"
exit $?
