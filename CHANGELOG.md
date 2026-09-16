# Changelog

All notable changes to this project are documented in this file.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.2.0] - 2026-09-16

### Changed

- **Breaking:** `listMatchingActivities` now returns `ActivitySearchResult[]` instead of `ActivityMini[]`, following the upstream API. The `ActivityMini` export has been removed; replace imports and type annotations with `ActivitySearchResult`.

### Added

- `updateChatBlocked` to block or unblock the other athlete in a private chat using its `on` query parameter.
- `Chat.blocked` and `SportSettings.p30s_exponent` fields from the refreshed upstream OpenAPI spec.

## [0.1.2] - 2026-08-24

### Added

- Types for the running-dynamics fields Intervals.icu added to `Activity`, `ActivityWithIntervals`, `Interval` and `IntervalGroup`: `average_stance_time_percent`, `average_stance_time_balance`, `average_vertical_speed`, `average_leg_spring_stiffness`, `average_impact_loading_rate` (upstream spec as of 2026-08-24).

### Changed

- The weekly spec-drift job now opens a pull request with the refreshed spec and regenerated SDK instead of only failing.

## [0.1.1] - 2026-07-31

### Changed

- Query params that the server defaults are no longer marked required, so callers can omit them: `upsertOnUid` on `createEvent` and `createMultipleEvents`, `updatePlanApplied` on `createMultipleEvents`, `reset` and `snoozeDays` on `updateReminder`, `recalcHrZones` on `updateSportSettings`. Verified against the live API; existing callers that pass these params are unaffected.

### Added

- `configureIntervals` accepts a custom `fetch` implementation (proxies, custom CAs, instrumentation), plus a README section on proxies and restricted networks.

## [0.1.0] - 2026-07-31

### Added

- Initial release: typed client for all 148 operations of the Intervals.icu API v1, generated with @hey-api/openapi-ts from the official OpenAPI spec.
- `configureIntervals()` helper wiring API-key (basic) and OAuth (bearer) auth, with `INTERVALS_API_KEY` / `INTERVALS_ACCESS_TOKEN` environment fallbacks.
- Spec normalization pipeline (`spec/normalize.ts`): JSON-only list endpoints, multipart upload fixes, wildcard media-type cleanup, human operationId names. Fails loudly on upstream drift.
- Dual ESM/CJS build with bundled type declarations, zero runtime dependencies.
- Unit tests (stubbed fetch), opt-in live smoke test, runnable examples.

[Unreleased]: https://github.com/jcurbelo/intervals-icu-sdk/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/jcurbelo/intervals-icu-sdk/compare/v0.1.2...v0.2.0
[0.1.2]: https://github.com/jcurbelo/intervals-icu-sdk/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/jcurbelo/intervals-icu-sdk/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/jcurbelo/intervals-icu-sdk/releases/tag/v0.1.0
