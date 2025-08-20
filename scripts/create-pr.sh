#!/usr/bin/env bash
set -euo pipefail

# create-pr.sh
# Usage:
#   ./scripts/create-pr.sh "Title of PR" "Optional body" "base_branch"
# Or via npm/yarn: npm run create:pr -- "Title" "Body" "main"

TITLE=${1:-}
BODY=${2:-}
BASE_BRANCH=${3:-${BASE_BRANCH:-main}}

if ! command -v gh >/dev/null 2>&1; then
  echo "Error: GitHub CLI 'gh' is not installed. Install from https://cli.github.com/" >&2
  exit 1
fi

# Ensure we're on a feature branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ "$CURRENT_BRANCH" == "$BASE_BRANCH" ]]; then
  echo "Error: You are on '$BASE_BRANCH'. Please create a feature branch first." >&2
  exit 1
fi

# Push branch
git push -u origin "$CURRENT_BRANCH" >/dev/null 2>&1 || git push -u origin "$CURRENT_BRANCH"

# Derive title/body if not provided
if [[ -z "$TITLE" ]]; then
  # Convert branch name like feature/add-cool-thing -> "Add cool thing"
  STRIPPED=${CURRENT_BRANCH#*/}
  TITLE=$(echo "$STRIPPED" | sed -E 's/[-_]+/ /g; s/\b([a-z])/\U\1/g')
fi

if [[ -z "$BODY" ]]; then
  BODY="Automated PR for branch $CURRENT_BRANCH"
fi

echo "Creating PR from $CURRENT_BRANCH -> $BASE_BRANCH ..."

# Ensure there are changes compared to base
git fetch origin "$BASE_BRANCH" >/dev/null 2>&1 || true
if git diff --quiet --exit-code "origin/$BASE_BRANCH"...HEAD; then
  echo "Error: No changes to open a PR against '$BASE_BRANCH'. Commit your changes and push, then re-run."
  exit 1
fi

# Create or reuse existing PR
set +e
EXISTING_URL=$(gh pr view --json url --jq .url 2>/dev/null)
set -e

if [[ -n "$EXISTING_URL" ]]; then
  echo "PR already exists: $EXISTING_URL"
  PR_URL="$EXISTING_URL"
else
  PR_URL=$(gh pr create \
    --base "$BASE_BRANCH" \
    --head "$CURRENT_BRANCH" \
    --title "$TITLE" \
    --body "$BODY" \
    --fill --json url --jq .url)
  echo "PR created: $PR_URL"
fi

# Try to enable auto-merge with squash
echo "Enabling auto-merge (squash) ..."
set +e
gh pr merge --squash --auto >/dev/null 2>&1
STATUS=$?
set -e

if [[ $STATUS -ne 0 ]]; then
  echo "Note: Could not enable auto-merge. Ensure auto-merge is enabled for the repo and you have permissions."
  echo "You can enable manually with: gh pr merge --squash --auto"
else
  echo "Auto-merge (squash) has been enabled for this PR. It will merge once checks pass."
fi

echo "$PR_URL"

