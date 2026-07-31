/**
 * Print the last 7 days of wellness data (resting HR, HRV, sleep, fitness).
 *
 * Run from a checkout:  INTERVALS_API_KEY=xxx bun examples/recent-wellness.ts
 * In your own project, import from the package instead:
 *   import { configureIntervals, listWellnessRecords } from "intervals-icu-sdk";
 */
import { configureIntervals, listWellnessRecords } from "../src/index";

configureIntervals(); // reads INTERVALS_API_KEY

const iso = (d: Date) => d.toISOString().slice(0, 10);
const { data, error } = await listWellnessRecords({
  path: { id: "0" }, // "0" = the athlete who owns the API key
  query: { oldest: iso(new Date(Date.now() - 7 * 864e5)), newest: iso(new Date()) },
});

if (error) throw new Error(`Intervals.icu request failed: ${JSON.stringify(error)}`);

for (const day of data ?? []) {
  const sleepH = day.sleepSecs ? (day.sleepSecs / 3600).toFixed(1) : "-";
  console.log(
    `${day.id}  restingHR=${day.restingHR ?? "-"}  hrv=${day.hrv ?? "-"}  sleep=${sleepH}h  fitness(ctl)=${day.ctl?.toFixed(1) ?? "-"}`,
  );
}
