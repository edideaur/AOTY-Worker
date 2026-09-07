import { describe, it, expect } from "bun:test";
import worker from "../src/index.ts";
import { createMockEnv, mockFetch } from "./test_utils.js";

function req(path: string, method = "GET"): Request {
  return new Request(`http://localhost${path}`, { method });
}

describe("HTTP Methods & Cache HIT/MISS", () => {
  it("HEAD request returns empty body with headers", async () => {
    const env = createMockEnv();
    const res = await worker.fetch(req("/health", "HEAD"), env);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("");
  });

  it("POST request returns 405 Method Not Allowed", async () => {
    const env = createMockEnv();
    const res = await worker.fetch(req("/health", "POST"), env);
    expect(res.status).toBe(405);
    expect(res.headers.get("Allow")).toContain("GET");
  });

  it("DELETE request returns 405 Method Not Allowed", async () => {
    const env = createMockEnv();
    const res = await worker.fetch(req("/health", "DELETE"), env);
    expect(res.status).toBe(405);
  });

  it("serves from cache on HIT", async () => {
    const cachedData = JSON.stringify({ cached: true });
    const env = createMockEnv({
      "/discover": cachedData,
    });

    const res = await worker.fetch(req("/discover"), env);
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Cache")).toBe("HIT");
    const json = (await res.json()) as { cached: boolean };
    expect(json.cached).toBe(true);
  });

  it("bypasses cache when cache=false", async () => {
    const cachedData = JSON.stringify({ cached: true });
    const env = createMockEnv({
      "/discover": cachedData,
    });

    const restore = mockFetch(async () => new Response('<div class="albumBlock"><div class="albumTitle">Fresh</div></div>', { status: 200 }));
    try {
      const res = await worker.fetch(req("/discover?cache=false"), env);
      expect(res.status).toBe(200);
      expect(res.headers.get("X-Cache")).toBe("MISS");
    } finally {
      restore();
    }
  });
});

describe("Query parameter routing & response shapes", () => {
  const env = createMockEnv();

  it("handles /songs/top with year alias and period", async () => {
    const songHtml = `
      <div class="songRow">
        <div class="songTitle"><a href="/song/1-runaway/">Runaway</a></div>
        <div class="artistTitle"><a href="/artist/1-kanye/">Kanye West</a></div>
        <div class="scoreValue">96</div>
      </div>
    `;
    const restore = mockFetch(async () => new Response(songHtml, { status: 200 }));

    try {
      const resYear = await worker.fetch(req("/songs/top?year=2025"), env);
      expect(resYear.status).toBe(200);
      const jsonYear = (await resYear.json()) as { period: string; page: number; songs: unknown[] };
      expect(jsonYear.period).toBe("2025");
      expect(jsonYear.page).toBe(1);

      const resPeriod = await worker.fetch(req("/songs/top?period=2024&page=2"), env);
      expect(resPeriod.status).toBe(200);
      const jsonPeriod = (await resPeriod.json()) as { period: string; page: number; songs: unknown[] };
      expect(jsonPeriod.period).toBe("2024");
      expect(jsonPeriod.page).toBe(2);
    } finally {
      restore();
    }
  });

  it("handles /releases/by-date with week, month, decade, and genre", async () => {
    const albumHtml = `<div class="albumBlock"><div class="albumTitle">Test</div></div>`;
    const restore = mockFetch(async () => new Response(albumHtml, { status: 200 }));

    try {
      const resWeek = await worker.fetch(req("/releases/by-date?year=2025&week=10&genre=rock"), env);
      expect(resWeek.status).toBe(200);
      const jsonWeek = (await resWeek.json()) as { year: string; week: string | null; page: number };
      expect(jsonWeek.year).toBe("2025");
      expect(jsonWeek.week).toBe("10");

      const resMonth = await worker.fetch(req("/releases/by-date?year=2025&month=january&page=2"), env);
      expect(resMonth.status).toBe(200);
      const jsonMonth = (await resMonth.json()) as { year: string; month: string | null; page: number };
      expect(jsonMonth.year).toBe("2025");
      expect(jsonMonth.month).toBe("january");
      expect(jsonMonth.page).toBe(2);

      const resDecade = await worker.fetch(req("/releases/by-date?decade=2010s"), env);
      expect(resDecade.status).toBe(200);
      const jsonDecade = (await resDecade.json()) as { decade: string | null };
      expect(jsonDecade.decade).toBe("2010s");
    } finally {
      restore();
    }
  });

  it("handles /releases/vibe with valid parameters", async () => {
    const albumHtml = `<div class="albumBlock"><div class="albumTitle">Vibe Album</div></div>`;
    const restore = mockFetch(async () => new Response(albumHtml, { status: 200 }));

    try {
      const res = await worker.fetch(req("/releases/vibe?vibe=chill&year=2024&sort=user&page=2"), env);
      expect(res.status).toBe(200);
      const json = (await res.json()) as { vibe: string; year: string; sort: string; page: number; albums: unknown[] };
      expect(json.vibe).toBe("chill");
      expect(json.year).toBe("2024");
      expect(json.sort).toBe("user");
      expect(json.page).toBe(2);
    } finally {
      restore();
    }
  });

  it("handles /must-hear with period combinations", async () => {
    const albumHtml = `<div class="albumBlock"><div class="albumTitle">Must Hear</div></div>`;
    const restore = mockFetch(async () => new Response(albumHtml, { status: 200 }));

    try {
      const resDecade = await worker.fetch(req("/must-hear?decade=2010s&page=2"), env);
      expect(resDecade.status).toBe(200);
      const jsonDecade = (await resDecade.json()) as { year: string; page: number };
      expect(jsonDecade.year).toBe("2010s");
      expect(jsonDecade.page).toBe(2);

      const resYear = await worker.fetch(req("/must-hear?year=2024"), env);
      expect(resYear.status).toBe(200);
      const jsonYear = (await resYear.json()) as { year: string; page: number };
      expect(jsonYear.year).toBe("2024");

      const resAll = await worker.fetch(req("/must-hear"), env);
      expect(resAll.status).toBe(200);
      const jsonAll = (await resAll.json()) as { year: string; page: number };
      expect(jsonAll.year).toBe("all");
    } finally {
      restore();
    }
  });

  it("handles /news and /lists with query filters", async () => {
    const newsHtml = `<div class="mediaContainer" id="link1"><div class="content"><div class="title"><a href="/l/1/">News</a></div></div></div>`;
    const listHtml = `<div class="listColumn"><div class="listPub"><a href="/list/1/">List</a></div></div>`;
    const restore = mockFetch(async (input) => {
      const url = typeof input === "string" ? input : input instanceof Request ? input.url : input.toString();
      if (url.includes("/lists.php")) return new Response(listHtml, { status: 200 });
      return new Response(newsHtml, { status: 200 });
    });

    try {
      const resNews = await worker.fetch(req("/news?type=new&page=2"), env);
      expect(resNews.status).toBe(200);
      const jsonNews = (await resNews.json()) as { page: number; type: string };
      expect(jsonNews.type).toBe("new");
      expect(jsonNews.page).toBe(2);

      const resLists = await worker.fetch(req("/lists?year=2024&sort=newest&page=3"), env);
      expect(resLists.status).toBe(200);
      const jsonLists = (await resLists.json()) as { year: number | null; sort: string | null; page: number };
      expect(jsonLists.year).toBe(2024);
      expect(jsonLists.sort).toBe("newest");
      expect(jsonLists.page).toBe(3);
    } finally {
      restore();
    }
  });

  it("handles /guidelines type parameter", async () => {
    const guideHtml = `<div class="heading">Comment Guidelines</div><div class="rules">Rule 1</div>`;
    const restore = mockFetch(async () => new Response(guideHtml, { status: 200 }));

    try {
      const res = await worker.fetch(req("/guidelines?type=comment"), env);
      expect(res.status).toBe(200);
      const json = (await res.json()) as { title: string };
      expect(json.title).toContain("Comment Guidelines");
    } finally {
      restore();
    }
  });
});
