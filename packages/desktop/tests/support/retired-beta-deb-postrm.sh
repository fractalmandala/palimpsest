#!/bin/bash

case "$1" in
    upgrade | failed-upgrade | abort-upgrade | [1-9]*) exit 0 ;;
esac

if type update-alternatives >/dev/null 2>&1; then
    update-alternatives --remove 'palimpsest-beta' '/usr/bin/palimpsest-beta'
else
    rm -f '/usr/bin/palimpsest-beta'
fi

APPARMOR_PROFILE_DEST='/etc/apparmor.d/palimpsest-beta'

if [ -f "$APPARMOR_PROFILE_DEST" ]; then
  rm -f "$APPARMOR_PROFILE_DEST"
fi

for link in /usr/bin/ps-beta /usr/bin/palimpsest-beta; do
  if [ -L "$link" ]; then
    target=$(readlink "$link")
    case "$target" in
      '/opt/Palimpsest Beta/'*) rm -f "$link" ;;
    esac
  fi
done
