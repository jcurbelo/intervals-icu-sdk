/**
 * List planned workouts on the calendar for the next 7 days.
 *
 * Run from a checkout:  INTERVALS_API_KEY=xxx bun examples/upcoming-workouts.ts
 * In your own project, import from the package instead:
 *   import { configureIntervals, listEvents } from "intervals-icu-sdk";
 */
import { configureIntervals, listEvents } from "../src/index";

configureIntervals(); // reads INTERVALS_API_KEY

const iso = (d: Date) => d.toISOString().slice(0, 10);
const { data, error } = await listEvents({
  path: { id: "0" },
  query: { oldest: iso(new Date()), newest: iso(new Date(Date.now() + 7 * 864e5)) },
});

if (error) throw new Error(`Intervals.icu request failed: ${JSON.stringify(error)}`);

const workouts = (data ?? []).filter((e) => e.category === "WORKOUT");
if (workouts.length === 0) {
  console.log("No planned workouts in the next 7 days.");
}
for (const w of workouts) {
  const mins = w.moving_time ? Math.round(w.moving_time / 60) : "?";
  console.log(`${w.start_date_local?.slice(0, 10)}  [${w.type}] ${w.name} (${mins} min, load ${w.icu_training_load ?? "?"})`);
}
