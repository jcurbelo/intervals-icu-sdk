# intervals-icu-sdk

[![CI](https://github.com/jcurbelo/intervals-icu-sdk/actions/workflows/ci.yml/badge.svg)](https://github.com/jcurbelo/intervals-icu-sdk/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/intervals-icu-sdk.svg)](https://www.npmjs.com/package/intervals-icu-sdk)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

Unofficial TypeScript SDK for the [Intervals.icu](https://intervals.icu) API. Fully typed, zero runtime dependencies, generated from the [official OpenAPI spec](https://intervals.icu/api/v1/docs).

> **Not an official SDK.** This project is not affiliated with, endorsed by, or supported by Intervals.icu. It is a community project built on the public API that Intervals.icu generously provides. Please be considerate with your request volume (see [rate limits](#rate-limits-and-etiquette)).

## Features

- **Complete coverage**: all 148 operations of the Intervals.icu API v1 (activities, wellness, calendar events, workout library, sport settings, gear, power/pace/HR curves, and more).
- **Fully typed**: request paths, query params, bodies, and responses, straight from the spec.
- **Zero runtime dependencies**: the fetch-based client is bundled into the package.
- **Runs anywhere fetch does**: Node.js >= 18, Bun, Deno, edge runtimes. (Browsers work too, but never ship your API key to a browser.)
- **Honest generation pipeline**: the spec snapshot, the normalization script, and the generator config are all in this repo. Regenerate at any time and CI fails when the upstream spec drifts.

## Installation

```sh
npm install intervals-icu-sdk
# or
bun add intervals-icu-sdk
# or
pnpm add intervals-icu-sdk
```

## Quickstart

Get your personal API key from Intervals.icu: **Settings** (your profile) > **Developer**. Your athlete id is visible in the URL when you are logged in (for example `/athlete/i1234567/...`), and `"0"` always means "the athlete who owns the API key".

```ts
import { configureIntervals, getAthlete, listActivities, listWellnessRecords } from "intervals-icu-sdk";

configureIntervals(); // reads INTERVALS_API_KEY from the environment
// or explicitly: configureIntervals({ apiKey: "your-key" });

// Who am I?
const me = await getAthlete({ path: { id: "0" } });
console.log(me.data?.name);

// Last week of wellness (resting HR, HRV, sleep, fitness/fatigue, ...)
const wellness = await listWellnessRecords({
  path: { id: "0" },
  query: { oldest: "2026-07-01", newest: "2026-07-31" },
});
wellness.data?.forEach((d) => console.log(d.id, d.restingHR, d.hrv, d.ctl));

// Recent activities
const activities = await listActivities({
  path: { id: "0" },
  query: { oldest: "2026-07-01", limit: 10 },
});
```

Every function returns `{ data, error, request, response }` instead of throwing:

```ts
const { data, error, response } = await getAthlete({ path: { id: "0" } });
if (error) {
  console.error(`HTTP ${response?.status}`, error);
} else {
  console.log(data.name);
}
```

Prefer exceptions? Pass `throwOnError`:

```ts
const { data } = await getAthlete({ path: { id: "0" }, throwOnError: true });
// data is non-optional here; failures throw
```

More runnable examples live in [`examples/`](./examples).

## Authentication

Intervals.icu supports two schemes, and the SDK handles both:

| Scheme | Who it is for | How |
|---|---|---|
| API key (HTTP basic, username `API_KEY`) | personal scripts and tools | `configureIntervals({ apiKey })` or `INTERVALS_API_KEY` |
| OAuth bearer token | registered multi-user apps | `configureIntervals({ accessToken })` or `INTERVALS_ACCESS_TOKEN` |

See the [Intervals.icu API forum thread](https://forum.intervals.icu/t/api-access-to-intervals-icu/609) for how keys and OAuth apps work.

### Custom or multiple clients

`configureIntervals` configures a shared default client. For multiple accounts, custom fetch, interceptors, or full isolation, create your own client and pass it per call:

```ts
import { createClient } from "intervals-icu-sdk";
import { getAthlete } from "intervals-icu-sdk";

const client = createClient({
  baseUrl: "https://intervals.icu",
  auth: (auth) => (auth.scheme === "basic" ? `API_KEY:${myKey}` : undefined),
});

const me = await getAthlete({ client, path: { id: "0" } });
```

The client also exposes `interceptors.request` / `interceptors.response` for logging, retries, and similar concerns.

## API coverage

Function names mirror the API's operation ids, so the [official API docs](https://intervals.icu/api-docs.html) double as SDK docs. A taste of what is available:

| Area | Ops | Example functions |
|---|---|---|
| Activities | 52 | `listActivities`, `getActivity`, `getActivityStreams`, `getIntervals`, `uploadActivity`, `findBestEfforts` |
| Workout library | 19 | `listWorkouts`, `createWorkout`, `listFolders`, `applyPlan` |
| Calendar events | 16 | `listEvents`, `createEvent`, `createMultipleEvents`, `markEventAsDone`, `downloadEventWorkout` |
| Athletes | 10 | `getAthlete`, `updateAthlete`, `getAthleteSummary`, `getAthleteTrainingPlan` |
| Sport settings | 10 | `listSportSettings`, `getSportSettings`, `updateSportSettings` |
| Chats | 10 | `listChats`, `sendMessage`, `listActivityMessages` |
| Gear | 9 | `listGear`, `createGear`, `createReminder`, `replaceGear` |
| Custom items | 7 | `listCustomItems`, `createCustomItem` |
| Wellness | 6 | `listWellnessRecords`, `updateWellness`, `updateWellnessBulk`, `uploadWellness` |
| Routes | 4 | `listAthleteRoutes`, `getAthleteRoute` |
| Weather | 3 | `getForecast`, `updateWeatherConfig` |
| Shared events | 1 | `getSharedEvent` |

Notes on intentional choices:

- **JSON only**: the API offers CSV twins of some list endpoints via a `{ext}` path suffix. The SDK strips those toggles and always speaks JSON. For CSV exports, call the endpoint directly with `.csv` (curl works great).
- Workout downloads keep their `ext` parameter because there it selects the actual file format: `.zwo`, `.mrc`, `.erg`, or `.fit`.

## Rate limits and etiquette

Intervals.icu is run by a small team and offers this API for free. Published limits (see the [forum thread](https://forum.intervals.icu/t/api-access-to-intervals-icu/609)): about 5,000 requests per day per API key, 2,500 per rolling 15 minutes, and 10 requests per second per IP. Cache what you can and back off on HTTP 429.

## Regenerating from the spec

The whole pipeline is reproducible from this repo:

```sh
bun install
bun run spec        # fetch the latest upstream spec + normalize (fails loudly on drift)
bun run generate    # regenerate src/gen from the normalized spec
bun run typecheck   # tsc --noEmit
bun run test        # unit tests with a stubbed fetch (no network)
bun run build       # dual ESM/CJS bundle + type declarations
```

`spec/normalize.ts` documents every transformation applied to the upstream spec (partial-segment `{ext}` params, multipart fixes, wildcard media types, operationId renames). A scheduled CI job re-fetches the spec weekly and fails when Intervals.icu ships API changes, so the SDK stays honest about staleness.

## Versioning

Semantic versioning. While the package is `0.x`, minor versions may contain breaking changes; they will always be called out in the [changelog](./CHANGELOG.md).

## Contributing

Issues and PRs are welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md) for the development setup and guidelines.

## Related projects

- [Announcement and discussion thread](https://forum.intervals.icu/t/intervals-icu-sdk-typescript-sdk-generated-from-the-official-openapi-spec-open-source-unofficial/130850) for this SDK on the Intervals.icu forum
- [Intervals.icu API docs](https://intervals.icu/api-docs.html) and the [API forum thread](https://forum.intervals.icu/t/api-access-to-intervals-icu/609)
- [mvilanova/intervals-mcp-server](https://github.com/mvilanova/intervals-mcp-server): MCP server for using Intervals.icu data with AI assistants
- Community client libraries in other styles: [paladini/node-intervals-icu](https://github.com/paladini/node-intervals-icu), [yerzhansa/intervals-icu-api](https://github.com/yerzhansa/intervals-icu-api)

## Acknowledgements

- [Intervals.icu](https://intervals.icu), built by David Tinker, for an outstanding training platform and a clean, well-documented public API. If you find this SDK useful, consider [supporting Intervals.icu](https://intervals.icu/settings) with a subscription.
- [@hey-api/openapi-ts](https://heyapi.dev) for the code generation toolchain.

## License

[MIT](./LICENSE). The Intervals.icu name belongs to Intervals.icu; this project just points at their public API.
