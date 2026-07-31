/**
 * intervals-icu-sdk: unofficial typed TypeScript SDK for the Intervals.icu API.
 *
 * Generated with @hey-api/openapi-ts from the official OpenAPI spec
 * (https://intervals.icu/api/v1/docs), normalized by spec/normalize.ts.
 * Zero runtime dependencies: the fetch client is bundled into ./gen.
 *
 * Usage:
 *   import { configureIntervals, getAthlete, listWellnessRecords } from "intervals-icu-sdk";
 *   configureIntervals();                                       // reads INTERVALS_API_KEY
 *   const { data } = await getAthlete({ path: { id: "0" } });   // "0" = the key's owner
 */
import { client } from "./gen/client.gen";

export interface IntervalsConfig {
  /**
   * Personal API key (Intervals.icu Settings, Developer section).
   * Sent as basic auth with the fixed username `API_KEY`.
   */
  apiKey?: string;
  /** OAuth bearer token, only for registered multi-user applications. */
  accessToken?: string;
  /** Override the API host (default https://intervals.icu). */
  baseUrl?: string;
  /**
   * Custom fetch implementation, for proxies, custom CAs, or instrumentation.
   * See the "Proxies and restricted networks" section of the README.
   */
  fetch?: typeof fetch;
}

/**
 * Configure the default client used by every SDK function.
 * Falls back to the INTERVALS_API_KEY / INTERVALS_ACCESS_TOKEN environment
 * variables when the corresponding option is omitted.
 */
export function configureIntervals(config: IntervalsConfig = {}): void {
  const env =
    (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
  const apiKey = config.apiKey ?? env.INTERVALS_API_KEY;
  const accessToken = config.accessToken ?? env.INTERVALS_ACCESS_TOKEN;
  if (!apiKey && !accessToken) {
    throw new Error(
      "intervals-icu-sdk: provide apiKey (or set INTERVALS_API_KEY) or accessToken (or set INTERVALS_ACCESS_TOKEN)",
    );
  }
  client.setConfig({
    ...(config.baseUrl ? { baseUrl: config.baseUrl } : {}),
    ...(config.fetch ? { fetch: config.fetch } : {}),
    // Operations advertise [basic, bearer]; the runtime base64-encodes basic credentials.
    auth: (auth) =>
      auth.scheme === "basic" ? (apiKey ? `API_KEY:${apiKey}` : undefined) : accessToken,
  });
}

export { client };
export * from "./gen";
