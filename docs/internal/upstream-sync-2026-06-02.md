# Upstream Sync 2026-06-02

## Upstream

- Remote: https://github.com/MoonshotAI/kimi-code
- Local remote name: `upstream`
- Last known upstream `main` from the initial planning check: `7a47045af2790eba0e68d5406c670ac759b21755`
- Upstream `main` merged by the later retry: `7ffb5dd9b3f12b5d205f974f82c3eaa57d14d57f`
- Local base before the successful sync branch: `0884df3`

## Summary

The `upstream` remote was configured locally so future Kimi Code sync work has a stable target.

Fetching upstream was attempted twice through Git:

```powershell
git -C F:\AI_Workspace\repos\aitp-agent fetch upstream main
git ls-remote https://github.com/MoonshotAI/kimi-code HEAD refs/heads/main
```

Both attempts failed because the local environment could not reach GitHub over HTTPS:

```text
fatal: unable to access 'https://github.com/MoonshotAI/kimi-code/': Failed to connect to github.com port 443
```

No upstream merge was performed in the first slice.

On the later retry, GitHub HTTPS connectivity succeeded:

```powershell
Test-NetConnection github.com -Port 443
git ls-remote --symref upstream HEAD
git fetch upstream
```

The successful retry found `upstream/main` at `7ffb5dd9b3f12b5d205f974f82c3eaa57d14d57f`. The branch relationship before merge was:

```text
main...upstream/main: 31 local commits / 34 upstream commits
merge-base: 933cf6727efa74a3ac99d2c325f540439d65a5cd
```

The merge was performed on `sync/upstream-main-2026-06-02` before being fast-forwarded back to `main`.

## AITP Feature-Flag Interaction

The successful retry had three real conflict points:

- `package.json`: kept local Windows-friendly `corepack pnpm --config.engine-strict=false` scripts, accepted upstream's removal of the Nix release helper.
- `packages/agent-core/src/flags/registry.ts`: preserved AITP experimental flags and added upstream's `micro-compaction` flag.
- `packages/agent-core/test/tools/background/persist.test.ts`: accepted upstream's move from `tools/background` to `agent/background`.

AITP feature flags remain present. Upstream's `KIMI_CODE_EXPERIMENTAL_MICRO_COMPACTION` flag was added beside them.

## Verification

Verification for the concurrent ActionBinding slice passed:

- focused tests: 7 files passed, 26 tests passed;
- `@moonshot-ai/agent-core` typecheck: passed;
- focused oxlint: 0 warnings, 0 errors.
- full `@moonshot-ai/agent-core` suite: 183 test files passed, 1 skipped; 2319 tests passed, 7 skipped, 1 todo.
- root `corepack pnpm --config.engine-strict=false run build`: passed.
- `corepack pnpm --config.engine-strict=false run dev:cli -- --help`: passed.
- `node apps/kimi-code/dist/main.mjs --help`: passed.

The local Node version remains `v24.14.0`, while package metadata requests `>=24.15.0`; commands used `--config.engine-strict=false`.

Verification after the successful upstream merge:

- `git diff --check`: passed.
- `@moonshot-ai/agent-core` typecheck: passed.
- focused AITP/upstream-boundary tests: 40 files passed, 243 tests passed.
- full `@moonshot-ai/agent-core` suite: 188 files passed, 1 skipped; 2313 tests passed, 6 skipped, 1 todo.
- root `corepack pnpm --config.engine-strict=false run build`: passed.
- `node apps/kimi-code/dist/main.mjs --help`: passed.
- `corepack pnpm --config.engine-strict=false run dev:cli -- --help`: passed.

One upstream POSIX permission assertion in `packages/agent-core/test/agent/background/persist.test.ts` was narrowed to POSIX because Windows reports directory mode differently.

## Follow-Ups

- Keep future upstream syncs on dedicated `sync/upstream-main-<date>` branches.
- Re-run AITP focused tests whenever upstream changes session, agent records, tools, compaction, background tasks, or flags.
- Re-check root scripts when upstream changes `package.json`, because local Windows development currently depends on `corepack pnpm --config.engine-strict=false`.
