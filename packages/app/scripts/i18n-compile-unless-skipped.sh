#!/bin/sh
if [ -n "$PS_TEST_SKIP_I18N_COMPILE" ]; then
  echo "[predev] i18n:compile skipped (PS_TEST_SKIP_I18N_COMPILE set)"
  exit 0
fi
exec pnpm run i18n:compile
