# Changelog

All notable changes to this project are documented in this file.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.1.0] - 2026-07-31

### Added

- Initial release: typed client for all 148 operations of the Intervals.icu API v1, generated with @hey-api/openapi-ts from the official OpenAPI spec.
- `configureIntervals()` helper wiring API-key (basic) and OAuth (bearer) auth, with `INTERVALS_API_KEY` / `INTERVALS_ACCESS_TOKEN` environment fallbacks.
- Spec normalization pipeline (`spec/normalize.ts`): JSON-only list endpoints, multipart upload fixes, wildcard media-type cleanup, human operationId names. Fails loudly on upstream drift.
- Dual ESM/CJS build with bundled type declarations, zero runtime dependencies.
- Unit tests (stubbed fetch), opt-in live smoke test, runnable examples.

[Unreleased]: https://github.com/jcurbelo/intervals-icu-sdk/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/jcurbelo/intervals-icu-sdk/releases/tag/v0.1.0
