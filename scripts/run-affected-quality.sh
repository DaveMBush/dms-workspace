#!/usr/bin/env bash

set -euo pipefail

repo_root="$(pwd -P)"
export NX_DAEMON="${NX_DAEMON:-false}"
export NX_WORKSPACE_ROOT_PATH="${NX_WORKSPACE_ROOT_PATH:-$repo_root}"
export NX_WORKSPACE_ROOT="${NX_WORKSPACE_ROOT:-$repo_root}"

resolve_base_ref() {
  local candidate=""
  for candidate in "${NX_BASE:-}" origin/main main; do
    if [[ -n "$candidate" ]] && git rev-parse --verify "$candidate^{commit}" >/dev/null 2>&1; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done

  return 1
}

collect_changed_files() {
  local base_ref=""
  local merge_base=""

  if base_ref="$(resolve_base_ref 2>/dev/null)" && merge_base="$(git merge-base HEAD "$base_ref" 2>/dev/null)"; then
    {
      git diff --name-only "$merge_base...HEAD"
      git diff --name-only --cached
      git diff --name-only
      git ls-files --others --exclude-standard
    } | awk 'NF && !seen[$0]++'
    return 0
  fi

  {
    git diff --name-only --cached
    git diff --name-only
    git ls-files --others --exclude-standard
  } | awk 'NF && !seen[$0]++'
}

mapfile -t changed_files < <(collect_changed_files)

resolve_affected_projects() {
  if ((${#changed_files[@]} == 0)); then
    return 0
  fi

  local changed_files_arg=""
  changed_files_arg="$(IFS=,; printf '%s' "${changed_files[*]}")"
  pnpm exec nx show projects --affected --files="$changed_files_arg"
}

project_has_target() {
  local project_name="$1"
  local target_name="$2"

  pnpm exec nx show project "$project_name" --json | node -e '
    const fs = require("fs");
    const project = JSON.parse(fs.readFileSync(0, "utf8"));
    process.exit(project.targets && project.targets[process.argv[1]] ? 0 : 1);
  ' "$target_name"
}

filter_projects_for_target() {
  local target_name="$1"
  local project_name=""

  for project_name in "${affected_projects[@]}"; do
    if project_has_target "$project_name" "$target_name"; then
      printf '%s\n' "$project_name"
    fi
  done
}

run_many_for_target() {
  local target_name="$1"
  shift
  local target_projects=("$@")
  local projects_arg=""

  if ((${#target_projects[@]} == 0)); then
    return 0
  fi

  projects_arg="$(IFS=,; printf '%s' "${target_projects[*]}")"

  if [[ "$target_name" == "test" ]]; then
    pnpm exec nx run-many -t test --coverage --projects="$projects_arg" --parallel=16
    return 0
  fi

  pnpm exec nx run-many -t "$target_name" --projects="$projects_arg" --parallel=16
}

mapfile -t affected_projects < <(resolve_affected_projects)

if ((${#affected_projects[@]} > 0)); then
  mapfile -t lint_projects < <(filter_projects_for_target lint)
  mapfile -t build_projects < <(filter_projects_for_target build)
  mapfile -t test_projects < <(filter_projects_for_target test)

  run_many_for_target lint "${lint_projects[@]}"
  run_many_for_target build "${build_projects[@]}"
  run_many_for_target test "${test_projects[@]}"
  exit 0
fi

affected_args=(affected --parallel=16)
if ((${#changed_files[@]} > 0)); then
  files_arg="$(IFS=,; printf '%s' "${changed_files[*]}")"
  affected_args+=("--files=$files_arg")
fi

pnpm exec nx "${affected_args[@]}" -t lint build
pnpm exec nx "${affected_args[@]}" -t test --coverage