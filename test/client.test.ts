import { beforeEach, describe, expect, test } from "bun:test";
import { client, configureIntervals } from "../src/index";
import { createClient } from "../src/gen/client";
import { getAthlete, listActivities } from "../src/gen/sdk.gen";

/** Fetch stub that records every request and replies with a canned response. */
function stub(replies: { status?: number; body?: unknown } = {}) {
  const requests: Request[] = [];
  const fetchFn = (async (input: Request | string | URL) => {
    const req = input instanceof Request ? input : new Request(input);
    requests.push(req);
    return new Response(JSON.stringify(replies.body ?? { id: "i0" }), {
      status: replies.status ?? 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;
  return { requests, fetchFn };
}

describe("auth", () => {
  test("api key is sent as basic auth with the fixed API_KEY username", async () => {
    const { requests, fetchFn } = stub();
    const c = createClient({
      baseUrl: "https://example.test",
      auth: (auth) => (auth.scheme === "basic" ? "API_KEY:secret123" : undefined),
      fetch: fetchFn,
    });
    await getAthlete({ client: c, path: { id: "0" } });
    expect(requests).toHaveLength(1);
    expect(requests[0]!.headers.get("authorization")).toBe(`Basic ${btoa("API_KEY:secret123")}`);
  });

  test("bearer token is used when no basic credential is available", async () => {
    const { requests, fetchFn } = stub();
    const c = createClient({
      baseUrl: "https://example.test",
      auth: (auth) => (auth.scheme === "bearer" ? "oauth-token" : undefined),
      fetch: fetchFn,
    });
    await getAthlete({ client: c, path: { id: "0" } });
    expect(requests[0]!.headers.get("authorization")).toBe("Bearer oauth-token");
  });

  test("configureIntervals throws without any credential", () => {
    const env = (globalThis as any).process?.env ?? {};
    const savedKey = env.INTERVALS_API_KEY;
    const savedToken = env.INTERVALS_ACCESS_TOKEN;
    delete env.INTERVALS_API_KEY;
    delete env.INTERVALS_ACCESS_TOKEN;
    try {
      expect(() => configureIntervals()).toThrow(/INTERVALS_API_KEY/);
    } finally {
      if (savedKey !== undefined) env.INTERVALS_API_KEY = savedKey;
      if (savedToken !== undefined) env.INTERVALS_ACCESS_TOKEN = savedToken;
    }
  });

  test("configureIntervals wires the default client", async () => {
    const { requests, fetchFn } = stub();
    configureIntervals({ apiKey: "k", baseUrl: "https://example.test" });
    client.setConfig({ fetch: fetchFn });
    await getAthlete({ path: { id: "0" } });
    expect(requests[0]!.headers.get("authorization")).toBe(`Basic ${btoa("API_KEY:k")}`);
    expect(requests[0]!.url).toBe("https://example.test/api/v1/athlete/0");
  });
});

describe("requests", () => {
  let c: ReturnType<typeof createClient>;
  let requests: Request[];

  beforeEach(() => {
    const s = stub({ body: [] });
    requests = s.requests;
    c = createClient({ baseUrl: "https://example.test", auth: () => "API_KEY:k", fetch: s.fetchFn });
  });

  test("path params are substituted", async () => {
    await getAthlete({ client: c, path: { id: "i12345" } });
    expect(new URL(requests[0]!.url).pathname).toBe("/api/v1/athlete/i12345");
  });

  test("query params are serialized", async () => {
    await listActivities({
      client: c,
      path: { id: "i12345" },
      query: { oldest: "2026-07-01", newest: "2026-07-31", limit: 5 },
    });
    const url = new URL(requests[0]!.url);
    expect(url.pathname).toBe("/api/v1/athlete/i12345/activities");
    expect(url.searchParams.get("oldest")).toBe("2026-07-01");
    expect(url.searchParams.get("newest")).toBe("2026-07-31");
    expect(url.searchParams.get("limit")).toBe("5");
  });
});

describe("responses", () => {
  test("2xx fills data and leaves error empty", async () => {
    const { fetchFn } = stub({ body: { id: "i1", name: "Athlete" } });
    const c = createClient({ baseUrl: "https://example.test", auth: () => "API_KEY:k", fetch: fetchFn });
    const r = await getAthlete({ client: c, path: { id: "0" } });
    expect(r.error).toBeUndefined();
    expect(r.data?.id).toBe("i1");
    expect(r.response?.status).toBe(200);
  });

  test("non-2xx fills error, not data", async () => {
    const { fetchFn } = stub({ status: 401, body: { error: "Unauthorized" } });
    const c = createClient({ baseUrl: "https://example.test", auth: () => "API_KEY:bad", fetch: fetchFn });
    const r = await getAthlete({ client: c, path: { id: "0" } });
    expect(r.data).toBeUndefined();
    expect(r.error).toBeDefined();
    expect(r.response?.status).toBe(401);
  });

  test("throwOnError rejects on non-2xx", async () => {
    const { fetchFn } = stub({ status: 500, body: { error: "boom" } });
    const c = createClient({ baseUrl: "https://example.test", auth: () => "API_KEY:k", fetch: fetchFn });
    await expect(getAthlete({ client: c, path: { id: "0" }, throwOnError: true })).rejects.toBeDefined();
  });
});
