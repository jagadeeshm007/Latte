#!/usr/bin/env bash
# Point git at the committed hooks. Idempotent. Run once per clone, or let
# `make setup` do it. Usage: install.sh [--force]
#
# A core.hooksPath already set to another directory that holds hooks (Husky's
# .husky, a team's own directory) is not replaced silently: git would stop
# running those hooks. It is reported and left, unless --force. A value whose
# directory no longer exists runs no hook at all, so it is replaced and named.
set -eu
root="$(git rev-parse --show-toplevel)"
force=0; [ "${1:-}" = "--force" ] && force=1
current="$(git -C "$root" config --get core.hooksPath || true)"
# Write only when the value differs: Claude Code's sandbox mounts .git/config
# read-only, and an unconditional write failed make setup there.
if [ "${current%/}" != ".githooks" ]; then
  if [ -n "$current" ]; then
    case "$current" in /*) dir="$current";; "~"/*) dir="$HOME/${current#"~/"}";; *) dir="$root/$current";; esac
    live="$(find "$dir" -maxdepth 1 -type f ! -name '*.sample' 2>/dev/null | head -1)"
    if [ -n "$live" ] && [ "$force" -eq 0 ]; then
      echo "core.hooksPath is $current, which holds hooks; left unchanged. Chain .githooks/<hook> from those hooks, or rerun with --force to replace it" >&2
      exit 1
    fi
    echo "core.hooksPath was $current ($([ -d "$dir" ] && echo replaced || echo 'directory missing, so no hook ran'))"
  fi
  git -C "$root" config core.hooksPath .githooks 2>/dev/null || {
    echo "could not set core.hooksPath=.githooks (.git/config is not writable); run: git config core.hooksPath .githooks" >&2; exit 1; }
fi
chmod +x "$root"/.githooks/commit-msg "$root"/.githooks/pre-commit "$root"/.githooks/pre-push
n=0
for h in commit-msg pre-commit pre-push; do [ -f "$root/.githooks/$h" ] && n=$((n+1)); done
[ "$n" -eq 3 ] || { echo "expected 3 hooks, found $n" >&2; exit 1; }
echo "git hooks installed: core.hooksPath=.githooks ($n hooks)"
