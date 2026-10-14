#!/usr/bin/env bash
# Shared helpers for the committed git hooks. Sourced by each hook.
# shellcheck disable=SC2034  # the policy variables are read by the hooks
set -u

# Repository policy. The defaults are the kit standard. In a repository with
# its own CONTRIBUTING, ADRs or branch protection, set these from those
# documents when the hooks are installed: a hook that rejects what the team's
# own rules allow gets bypassed with --no-verify, and then it checks nothing.
COMMIT_TYPES='feat|fix|refactor|test|docs|chore|perf|build|ci|revert'
BRANCH_PREFIXES='feature|bugfix|hotfix|chore|docs|release'
PROTECTED_BRANCHES='main master develop'  # never pushed to or deleted from a clone
MAX_FILE_KB=5120        # staged file size limit in KiB (1 MB = 1024); 0 turns it off
BODY_MAX=100            # longest commit body line; 0 turns it off
NO_EM_DASH=1            # em dash refused in commit messages and staged prose
NO_AI_TRAILER=1         # AI co-author and "generated with" trailers refused
# Push confirmation. tty: a person types the branch name on a terminal, so a
#   push from an IDE or GUI client (no terminal) is refused. agents: refused
#   only when a coding agent's environment is detected. off: none.
PUSH_CONFIRM='tty'
GATE_CMD='make check'   # the full gate pre-push runs once

hook_fail() { printf 'hook %s: %s\n' "${HOOK_NAME:-?}" "$*" >&2; exit 1; }
hook_note() { printf 'hook %s: %s\n' "${HOOK_NAME:-?}" "$*"; }

# The em dash as bytes, so no hook file contains the character itself.
EM_DASH="$(printf '\342\200\224')"

# Task id: an upper-case prefix, then one or more dash-number groups, in
# whatever shape the configured tracker uses: PREFIX-123, PREFIX-00-017.
TASK_ID_RE='[A-Z][A-Z0-9]*(-[0-9]+)+'
# feature/PREFIX-123-ShortName, release/v1.2.3
BRANCH_RE="^(${BRANCH_PREFIXES})/(${TASK_ID_RE}-[A-Za-z0-9]+|v[0-9]+\.[0-9]+\.[0-9]+)$"
COMMIT_RE="^(${COMMIT_TYPES})(\([a-z0-9._/-]+\))?!?: .{1,72}( \[${TASK_ID_RE}\])?$"
AI_TRAILER_RE='^(Co-Authored-By|Co-authored-by): .*(Claude|Anthropic|Copilot|ChatGPT|Gemini|Cursor|Devin)|^(Generated with|🤖 Generated)'

# task_of <branch>: the task id a branch name carries, or nothing.
task_of() { printf '%s' "$1" | grep -oE "$TASK_ID_RE" | head -1; }

# is_protected <branch>
is_protected() { case " $PROTECTED_BRANCHES " in *" $1 "*) return 0;; esac; return 1; }

# message_problem <message file> <task id or empty>: prints why the message
# breaks the rules and returns 1, or prints nothing and returns 0. commit-msg
# runs it on the message being written; pre-push runs it on every commit being
# pushed, so a commit made with --no-verify is still caught before it leaves.
message_problem() {
  local file="$1" task="$2" subject long
  subject="$(sed -n '1p' "$file")"
  [ -n "$subject" ] || { echo "empty commit message"; return 1; }
  case "$subject" in
    Merge\ *|Revert\ \"*|fixup!\ *|squash!\ *) return 0 ;;  # subjects git writes
  esac
  printf '%s' "$subject" | grep -Eq "$COMMIT_RE" \
    || { echo "subject must be Conventional, 'type(scope): summary', type one of ${COMMIT_TYPES//|/, }. Got: $subject"; return 1; }
  if [ -n "$task" ] && ! printf '%s' "$subject" | grep -qF "[$task]"; then
    echo "branch carries $task; the subject must end with [$task]. Got: $subject"; return 1
  fi
  if [ "$NO_AI_TRAILER" = 1 ] && grep -Eq "$AI_TRAILER_RE" "$file"; then
    echo "AI attribution trailer found; a commit names a person who answers for it"; return 1
  fi
  if [ "$NO_EM_DASH" = 1 ] && grep -qF "$EM_DASH" "$file"; then
    echo "em dash in the commit message; rewrite the sentence"; return 1
  fi
  if [ "$BODY_MAX" -gt 0 ]; then
    long="$(sed -n '3,$p' "$file" | grep -v '^#' | awk -v m="$BODY_MAX" 'length > m' | wc -l | tr -d ' ')"
    [ "$long" -eq 0 ] || { echo "$long body line(s) over $BODY_MAX characters; wrap the body"; return 1; }
  fi
  return 0
}

# Staged paths, NUL-separated so a path with spaces survives. Consume with
# `while IFS= read -r -d '' f` or `xargs -0`.
staged_files0() { git diff --cached --name-only -z --diff-filter=ACMR; }
