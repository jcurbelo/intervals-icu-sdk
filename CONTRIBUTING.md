# Contributing

Thanks for helping make this SDK better. Issues and pull requests are welcome.

## Development setup

The toolchain is [Bun](https://bun.sh) (>= 1.1). Node.js >= 18 is enough to consume the built package, but development scripts assume Bun.

```sh
git clone https://github.com/jcurbelo/intervals-icu-sdk.git
cd intervals-icu-sdk
bun install
bun run typecheck && bun run test && bun run build
```

## Project layout

| Path | What it is | Edit by hand? |
|---|---|---|
| `spec/intervals-openapi.json` | snapshot of the upstream OpenAPI spec | no (refresh with `bun run spec`) |
| `spec/normalize.ts` | every transformation applied to the upstream spec | yes |
| `spec/intervals-openapi.normalized.json` | generator input | no (output of normalize) |
| `src/gen/` | generated client, SDK functions, types | **never** (output of `bun run generate`) |
| `src/index.ts` | the hand-written public surface (`configureIntervals`) | yes |
| `test/` | unit tests with a stubbed fetch, no network | yes |
| `scripts/smoke.ts` | opt-in live API smoke test | yes |

If a change belongs in generated code, change the generator input instead: `spec/normalize.ts` or `openapi-ts.config.ts`, then run `bun run generate` and commit the result. CI regenerates and fails when `src/gen/` does not match the spec.

## Updating to a new upstream spec

```sh
bun run spec        # fetch + normalize; fails loudly on unrecognized drift
bun run generate
bun run typecheck && bun run test
```

If `normalize.ts` throws about an unclassified path or a missing rename, the upstream API changed shape: update the STRIP/KEEP/RENAME tables in `spec/normalize.ts` with the new operation and say so in the PR description.

## Pull request guidelines

- Keep PRs focused; separate spec refreshes from feature work.
- Add or update a test when behavior changes.
- `bun run typecheck && bun run test && bun run build` must pass.
- Update `CHANGELOG.md` under `Unreleased` for user-visible changes.
- Plain, human commit messages, present tense ("add retry example"), no attribution trailers.

## Running the live smoke test

Optional and never required for PRs. It performs read-only requests against your own account:

```sh
INTERVALS_API_KEY=your-key bun run smoke
```

## Releasing (maintainers)

1. Move the `Unreleased` notes in `CHANGELOG.md` to a new version section, bump `version` in `package.json`, and merge.
2. Create a GitHub release with tag `vX.Y.Z` (matching `package.json`).
3. The `release` workflow publishes to npm via [trusted publishing](https://docs.npmjs.com/trusted-publishers) (OIDC): no tokens, provenance generated automatically. The trusted publisher is configured on npmjs.com (package settings) as this repo + `release.yml`.

Note: npm cannot yet do a *first* publish of a new package via OIDC (npm/cli#8544), so brand-new package names must be published once manually with 2FA before the workflow can take over.
