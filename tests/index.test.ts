import { describe, it, expect } from "bun:test";
import worker from "../src/index.ts";
import { createMockEnv } from "./test_utils.js";

const mockEnv = createMockEnv();

function req(path: string, method = "GET"): Request {
  return new Request(`http://localhost${path}`, { method });
}

function fetch(path: string, method = "GET") {
  return worker.fetch(req(path, method), mockEnv);
}

describe("CORS", () => {
  it("OPTIONS returns 204 with CORS headers", async () => {
    const res = await fetch("/", "OPTIONS");
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
  });

  it("GET responses include CORS headers", async () => {
    const res = await fetch("/openapi.json");
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
  });
});

describe("GET /", () => {
  it("returns 200 HTML", async () => {
    const res = await fetch("/");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
  });

  it("includes Scalar script tag", async () => {
    const text = await (await fetch("/")).text();
    expect(text).toContain("scalar/api-reference");
  });

  it("includes AOTY API heading", async () => {
    const text = await (await fetch("/")).text();
    expect(text).toContain("AOTY API");
  });

  it("links to Discord", async () => {
    const text = await (await fetch("/")).text();
    expect(text).toContain("discord.gg/UdCUsd2X");
  });

  it("links to GitHub", async () => {
    const text = await (await fetch("/")).text();
    expect(text).toContain("github.com/edideaur");
  });

  it("links to Instagram", async () => {
    const text = await (await fetch("/")).text();
    expect(text).toContain("instagram.com/edideaur");
  });
});

describe("GET /openapi.json", () => {
  it("returns 200 JSON", async () => {
    const res = await fetch("/openapi.json");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
  });

  it("is valid OpenAPI 3.1.0", async () => {
    const body = await (await fetch("/openapi.json")).json() as Record<string, unknown>;
    expect(body.openapi).toBe("3.1.0");
    expect(body.paths).toBeDefined();
    expect(body.components).toBeDefined();
  });

  it("spec references /album endpoint", async () => {
    const body = await (await fetch("/openapi.json")).json() as { paths: Record<string, unknown> };
    expect(body.paths["/album"]).toBeDefined();
  });
});

describe("404", () => {
  it("unknown path returns 404", async () => {
    const res = await fetch("/does-not-exist");
    expect(res.status).toBe(404);
  });

  it("404 body has detail field (RFC 9457)", async () => {
    const body = await (await fetch("/does-not-exist")).json() as { detail: string; status: number };
    expect(body.detail).toBeDefined();
    expect(body.status).toBe(404);
  });
});

describe("GET /album parameter validation", () => {
  it("returns 400 when both params missing", async () => {
    const res = await fetch("/album");
    expect(res.status).toBe(400);
  });

  it("returns 400 when name missing", async () => {
    const res = await fetch("/album?artist=Kendrick+Lamar");
    expect(res.status).toBe(400);
  });

  it("returns 400 when artist missing", async () => {
    const res = await fetch("/album?name=GNX");
    expect(res.status).toBe(400);
  });

  it("400 body has detail field (RFC 9457)", async () => {
    const body = await (await fetch("/album")).json() as { detail: string; status: number };
    expect(body.detail).toContain("artist");
    expect(body.status).toBe(400);
  });
});

describe("GET /search parameter validation", () => {
  const searchPaths = ["/search", "/search/albums", "/search/artists", "/search/labels", "/search/lists", "/search/news", "/search/tags", "/search/users"];

  for (const path of searchPaths) {
    it(`${path} returns 400 without q`, async () => {
      const res = await fetch(path);
      expect(res.status).toBe(400);
    });

    it(`${path} 400 body has detail field (RFC 9457)`, async () => {
      const body = await (await fetch(path)).json() as { detail: string; status: number };
      expect(body.detail).toBeDefined();
      expect(body.status).toBe(400);
    });
  }
});

describe("new endpoints parameter validation", () => {
  const cases: Array<[string, number]> = [
    ["/artist", 400],
    ["/artist/similar", 400],
    ["/artist/songs", 400],
    ["/label", 400],
    ["/genre", 400],
    ["/tag", 400],
    ["/tag?tag=hip+hop&type=bad", 400],
    ["/publication", 400],
    ["/publication/reviews", 400],
    ["/publication/lists", 400],
    ["/critic", 400],
    ["/song", 400],
    ["/song/ratings", 400],
    ["/user", 400],
    ["/user/ratings", 400],
    ["/user/reviews", 400],
    ["/user/lists", 400],
    ["/user/list?username=x", 400],
    ["/user/list", 400],
    ["/user/listened", 400],
    ["/user/library", 400],
    ["/user/tags", 400],
    ["/user/tags?username=x&scope=bad", 400],
    ["/user/tags?username=x&sort=bad", 400],
    ["/user/tag", 400],
    ["/user/tag?username=x", 400],
    ["/user/review?username=x", 400],
    ["/user/review", 400],
    ["/user-reviews?period=bad", 400],
    ["/user-reviews?period=month&page=2", 400],
    ["/top-artists?scope=bad", 400],
    ["/ratings?source=6-highest-rated&genre=hip-hop", 400],
    ["/news-item", 400],
    ["/album/similar", 400],
    ["/album/user-reviews", 400],
    ["/album/user-reviews?slug=x&sort=bad", 400],
    ["/album/comments", 400],
    ["/album/comments/replies", 400],
    ["/album/comments/replies?albumId=1998", 400],
    ["/album/critic-reviews", 400],
    ["/album/critic-reviews?slug=x&sort=bad", 400],
    ["/album/tags", 400],
    ["/album/user-lists", 400],
    ["/album/critic-lists", 400],
    ["/artist/news", 400],
    ["/artist/news?slug=x&type=bad", 400],
    ["/artist/credits", 400],
    ["/publication/perfect", 400],
    ["/user/followers", 400],
    ["/user/following", 400],
    ["/releases/vibe", 400],
    ["/releases/vibe?vibe=anthemic&sort=bad", 400],
    ["/album/rating-history", 400],
    ["/album/distribution", 400],
    ["/album/distribution?albumId=1998&format=bad", 400],
    ["/guidelines?type=bad", 400],
    ["/subgenres", 400],
    ["/album/tags/autocomplete", 400],
    ["/user/liked-albums", 400],
    ["/labels/autocomplete", 400],
    ["/label/autocomplete", 400],
    ["/search/autocomplete", 400],
    ["/user/genres", 400],
    ["/user/badges", 400],
  ];

  for (const [path, status] of cases) {
    it(`${path} returns ${status}`, async () => {
      const res = await fetch(path);
      expect(res.status).toBe(status);
    });
  }
});

describe("GET /openapi.json coverage", () => {
  it("spec includes all expected API endpoints", async () => {
    const body = await (await fetch("/openapi.json")).json() as { paths: Record<string, unknown> };
    const specPaths = Object.keys(body.paths);
    expect(specPaths.length).toBeGreaterThanOrEqual(76);

    const required = [
      "/album", "/album/similar", "/album/user-reviews", "/album/comments", "/album/comments/replies",
      "/album/critic-reviews", "/album/tags", "/album/tags/autocomplete", "/album/rating-history", "/album/distribution",
      "/album/user-lists", "/album/critic-lists",
      "/artist", "/artist/similar", "/artist/songs", "/artist/news", "/artist/credits", "/random/artist", "/random/album", "/artists",
      "/label", "/genres", "/genre", "/subgenres", "/tag",
      "/publication", "/publication/reviews", "/publication/lists", "/publication/perfect", "/critic",
      "/song", "/song/ratings", "/songs/top",
      "/user", "/user/ratings", "/user/reviews", "/user/lists", "/user/list", "/user/review",
      "/user/listened", "/user/library", "/user/liked-albums", "/user/tags", "/user/tag", "/user/followers", "/user/following",
      "/user/genres", "/user/badges",
      "/users", "/user-reviews", "/ratings", "/top-artists",
      "/releases", "/releases/singles", "/releases/this-week", "/releases/by-date", "/releases/vibe",
      "/recently-added", "/on-this-day", "/upcoming",
      "/discover", "/discover/singles", "/discover/anticipated", "/discover/under-radar", "/discover/top-rated", "/discover/people",
      "/must-hear", "/news", "/news-item", "/feed/news", "/feed/news.xml",
      "/lists", "/lists/users", "/updates", "/home", "/stats", "/faq", "/guidelines", "/changelog",
      "/search", "/search/albums", "/search/artists", "/search/labels", "/search/lists", "/search/news", "/search/tags", "/search/users",
      "/search/autocomplete", "/labels/autocomplete"
    ];

    for (const p of required) {
      expect(body.paths[p]).toBeDefined();
    }
  });
});

describe("response shape", () => {
  it("all errors return application/problem+json content-type", async () => {
    for (const path of ["/album", "/search", "/does-not-exist"]) {
      const res = await fetch(path);
      expect(res.headers.get("content-type")).toContain("application/problem+json");
    }
  });
});
