#!/usr/bin/env bun
/**
 * Read-only smoke test against the live Intervals.icu API.
 * Never run in CI by default; it needs a real personal API key.
 *
 * Usage:
 *   INTERVALS_API_KEY=xxx bun run smoke
 *   INTERVALS_ATHLETE_ID=i1234567 INTERVALS_API_KEY=xxx bun run smoke
 *
 * Makes GET requests only; it never writes to the account.
 */
import { configureIntervals, getAthlete, listActivities, listEvents, listWellnessRecords } from "../src/index";
import { createClient } from "../src/gen/client";

if (!process.env.INTERVALS_API_KEY) {
  console.log("SMOKE SKIPPED: set INTERVALS_API_KEY (and optionally INTERVALS_ATHLETE_ID) to run.");
  process.exit(0);
}

const ATHLETE = process.env.INTERVALS_ATHLETE_ID ?? "0";
configureIntervals();

const iso = (d: Date) => d.toISOString().slice(0, 10);
const daysFromNow = (n: number) => new Date(Date.now() + n * 864e5);
let failures = 0;
const check = (name: string, ok: boolean, detail: string) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name.padEnd(22)} ${detail}`);
  if (!ok) failures++;
};

// 1. auth + athlete
const a = await getAthlete({ path: { id: ATHLETE } });
check(
  "getAthlete",
  !!a.data?.id,
  a.data ? `${a.data.id}, ${a.data.sportSettings?.length ?? 0} sport settings` : `HTTP ${a.response?.status}`,
);

// 2. wellness, last 21 days
const w = await listWellnessRecords({
  path: { id: ATHLETE },
  query: { oldest: iso(daysFromNow(-21)), newest: iso(new Date()) },
});
check("listWellnessRecords", Array.isArray(w.data), `${w.data?.length ?? 0} days`);

// 3. activities, last 30 days
const acts = await listActivities({
  path: { id: ATHLETE },
  query: { oldest: iso(daysFromNow(-30)), limit: 5 },
});
check("listActivities", Array.isArray(acts.data), `${acts.data?.length ?? 0} returned`);

// 4. calendar events, coming week
const ev = await listEvents({
  path: { id: ATHLETE },
  query: { oldest: iso(new Date()), newest: iso(daysFromNow(7)) },
});
check("listEvents", Array.isArray(ev.data), `${ev.data?.length ?? 0} events in the next 7 days`);

// 5. an invalid key surfaces as an HTTP error, not a success
const bad = createClient({ baseUrl: "https://intervals.icu", auth: () => "API_KEY:not-a-real-key" });
const r = await getAthlete({ client: bad, path: { id: "0" } });
const badStatus = r.response?.status;
check("bad key rejected", !r.data && (badStatus === 401 || badStatus === 403), `HTTP ${badStatus}`);

console.log(failures === 0 ? "\nSMOKE PASS" : `\nSMOKE FAIL: ${failures} check(s) failed`);
if (failures > 0) process.exit(1);
