import { describe, it, expect } from "bun:test";
import worker from "../src/index.ts";
import { createMockEnv, mockFetch } from "./test_utils.js";

function req(path: string, method = "GET"): Request {
  return new Request(`http://localhost${path}`, { method });
}

const ALBUM_HTML = `
  <script type="application/ld+json">
  {
    "name": "Aquemini",
    "byArtist": { "name": "OutKast", "url": "https://www.albumoftheyear.org/artist/100-outkast/" },
    "image": "https://cdn.albumoftheyear.org/album/2915.jpg",
    "datePublished": "1998-09-29",
    "genre": ["Hip Hop"]
  }
  </script>
  <button class="showImage" data-id="2915"></button>
  <div class="albumCriticScore"><a title="95.5">96</a></div>
  <div class="albumCriticScoreBox"><div class="text numReviews">20 reviews</div></div>
  <div class="albumUserScore"><a title="90.0">90</a></div>
  <div class="albumUserScoreBox"><div class="text numReviews">5,000 ratings</div></div>
  <div class="albumTopBox info">
    <div class="detailRow">Release Date</div><div class="detailRow">LP</div>
    <div class="detailRow"><a href="/label/1-laface/">LaFace</a></div>
    <div class="detailRow"><a href="/genre/3-hip-hop/">Hip Hop</a></div>
    <div class="detailRow"><a href="/tag/southern-hip-hop/">Southern Hip Hop</a></div>
  </div>
  <div class="albumLinksFlex"><a href="https://spotify.com/album/123" title="Spotify" rel="nofollow">Spotify</a></div>
  <div class="totalLength">Total Length: 1 hour, 14 minutes</div>
  <table class="trackListTable">
    <tr><td class="trackNumber">1</td><td class="trackTitle"><a href="/song/1-hold-on/">Hold On</a></td></tr>
    <tr><td class="trackNumber">2</td><td class="trackTitle"><a href="/song/2-rosa-parks/">Rosa Parks</a></td></tr>
  </table>
`;

describe("/status", () => {
  it("returns API metadata and is never cached", async () => {
    const env = createMockEnv();
    const res = await worker.fetch(req("/status"), env);
    expect(res.status).toBe(200);
    const json = (await res.json()) as { name: string; version: string; openapi: string; endpoints: number; timestamp: string };
    expect(json.name).toBe("aoty-api");
    expect(json.version).toBe("1.0.0");
    expect(json.openapi).toBe("3.1.0");
    expect(json.endpoints).toBeGreaterThan(100);
    expect(new Date(json.timestamp).getTime()).not.toBeNaN();
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });
});

describe("/health docs", () => {
  it("openapi.json documents /health, /status, /batch and /album/summary", async () => {
    const env = createMockEnv();
    const res = await worker.fetch(req("/openapi.json"), env);
    expect(res.status).toBe(200);
    const spec = (await res.json()) as { paths: Record<string, unknown> };
    for (const p of ["/health", "/status", "/batch", "/album/summary"]) {
      expect(spec.paths[p]).toBeDefined();
    }
  });
});

describe("/album/summary", () => {
  it("returns lightweight header without reviews/tracklist payload", async () => {
    const env = createMockEnv();
    const restore = mockFetch(async () => new Response(ALBUM_HTML, { status: 200 }));
    try {
      const res = await worker.fetch(req("/album/summary?slug=2915&minimal=true"), env);
      expect(res.status).toBe(200);
      const json = (await res.json()) as Record<string, unknown>;
      expect(json["title"]).toBe("Aquemini");
      expect(json["artist"]).toBe("OutKast");
      expect(json["criticScore"]).toBe(96);
      expect(json["trackCount"]).toBe(2);
      expect(json["stats"]).toBeNull();
      expect(json["mustHear"]).toBe(false);
      expect(json["commentCount"]).toBeNull();
      expect(json["genreLinks"]).toEqual([
        { name: "Hip Hop", url: "https://www.albumoftheyear.org/genre/3-hip-hop/" },
      ]);
      // heavy fields must not be present
      expect("tracklist" in json).toBe(false);
      expect("reviews" in json).toBe(false);
      expect("comments" in json).toBe(false);
      expect("credits" in json).toBe(false);
    } finally {
      restore();
    }
  });

  it("400s when neither slug nor artist+name given", async () => {
    const env = createMockEnv();
    const res = await worker.fetch(req("/album/summary"), env);
    expect(res.status).toBe(400);
  });
});

describe("/song/critic-lists", () => {
  const songHtml = `
    <table class="listTable">
      <tr><td class="rank">#<strong>1</strong></td><td class="divider">/</td><td><a href="/songs/list/1-decoy/">Decoy (before heading, ignored)</a></td></tr>
    </table>
    <div class="sectionHeading"><h2>Critic Lists</h2></div>
    <table class="listTable">
      <tr><td class="rank">#<strong>5</strong></td><td class="divider">/</td><td><a href="/songs/list/139-consequence-of-sounds-top-50-songs-of-2018/">Consequence of Sound</a></td></tr>
      <tr><td class="rank">#<strong>62</strong></td><td class="divider">/</td><td><a href="/songs/list/138-billboards-100-best-songs-of-2018/">Billboard</a></td></tr>
      <tr><td class="rank"></td><td class="divider">/</td><td><a href="/songs/list/173-clashs-top-40-songs-of-2018/">Clash</a></td></tr>
    </table>
  `;

  it("parses year-end placements from the song page table", async () => {
    const env = createMockEnv();
    const restore = mockFetch(async () => new Response(songHtml, { status: 200 }));
    try {
      const res = await worker.fetch(req("/song/critic-lists?slug=2580-ghost-town"), env);
      expect(res.status).toBe(200);
      const json = (await res.json()) as {
        slug: string;
        lists: Array<{ rank: number | null; publication: string; url: string }>;
      };
      expect(json.slug).toBe("2580-ghost-town");
      expect(json.lists.length).toBe(3);
      expect(json.lists[0]).toEqual({
        rank: 5,
        publication: "Consequence of Sound",
        url: "https://www.albumoftheyear.org/songs/list/139-consequence-of-sounds-top-50-songs-of-2018/",
      });
      expect(json.lists[1]?.rank).toBe(62);
      // unranked placement yields null rank, not NaN
      expect(json.lists[2]?.rank).toBeNull();
      expect(json.lists[2]?.publication).toBe("Clash");
    } finally {
      restore();
    }
  });

  it("400s when slug is missing", async () => {
    const env = createMockEnv();
    const res = await worker.fetch(req("/song/critic-lists"), env);
    expect(res.status).toBe(400);
  });
});

describe("POST /batch", () => {
  const albumHtml = `<div class="albumBlock"><div class="albumTitle">Test</div></div>`;

  function postReq(path: string, body: string): Request {
    return new Request(`http://localhost${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
  }

  it("executes a JSON path array", async () => {
    const env = createMockEnv();
    const restore = mockFetch(async () => new Response(albumHtml, { status: 200 }));
    try {
      const res = await worker.fetch(postReq("/batch", JSON.stringify({ paths: ["/discover", "/recently-added"] })), env);
      expect(res.status).toBe(200);
      const json = (await res.json()) as { count: number; results: Array<{ status: number }> };
      expect(json.count).toBe(2);
      expect(json.results[0]?.status).toBe(200);
      expect(json.results[1]?.status).toBe(200);
      expect(res.headers.get("Cache-Control")).toBe("no-store");
    } finally {
      restore();
    }
  });

  it("accepts a comma-separated string and isolates per-item errors", async () => {
    const env = createMockEnv();
    const restore = mockFetch(async () => new Response(albumHtml, { status: 200 }));
    try {
      const res = await worker.fetch(postReq("/batch", JSON.stringify({ paths: "/discover,/batch" })), env);
      expect(res.status).toBe(200);
      const json = (await res.json()) as { count: number; results: Array<{ status: number }> };
      expect(json.count).toBe(2);
      expect(json.results[0]?.status).toBe(200);
      expect(json.results[1]?.status).toBe(400);
    } finally {
      restore();
    }
  });

  it("400s on invalid JSON, missing paths, too many paths, and oversized bodies", async () => {
    const env = createMockEnv();
    expect((await worker.fetch(postReq("/batch", "{not json"), env)).status).toBe(400);
    expect((await worker.fetch(postReq("/batch", JSON.stringify({})), env)).status).toBe(400);
    expect((await worker.fetch(postReq("/batch", JSON.stringify({ paths: [] })), env)).status).toBe(400);
    const many = Array.from({ length: 11 }, () => "/discover");
    expect((await worker.fetch(postReq("/batch", JSON.stringify({ paths: many })), env)).status).toBe(400);
    expect((await worker.fetch(postReq("/batch", "x".repeat(9000)), env)).status).toBe(400);
  });

  it("still 405s POST to non-batch paths and allows POST in /batch preflight", async () => {
    const env = createMockEnv();
    const postAlbum = await worker.fetch(postReq("/album?slug=2915", JSON.stringify({})), env);
    expect(postAlbum.status).toBe(405);

    const preflight = await worker.fetch(
      new Request("http://localhost/batch", {
        method: "OPTIONS",
        headers: { Origin: "http://localhost", "Access-Control-Request-Method": "POST" },
      }),
      env,
    );
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get("Access-Control-Allow-Methods")).toContain("POST");
  });
});
describe("/batch", () => {
  const albumHtml = `<div class="albumBlock"><div class="albumTitle">Test</div></div>`;

  it("400s when paths param is missing", async () => {
    const env = createMockEnv();
    const res = await worker.fetch(req("/batch"), env);
    expect(res.status).toBe(400);
  });

  it("400s when more than 10 paths given", async () => {
    const env = createMockEnv();
    const many = Array.from({ length: 11 }, (_, i) => `/discover?page=${i + 1}`).join(",");
    const res = await worker.fetch(req(`/batch?paths=${encodeURIComponent(many)}`), env);
    expect(res.status).toBe(400);
  });

  it("executes multiple paths and isolates per-item failures", async () => {
    const env = createMockEnv();
    const restore = mockFetch(async () => new Response(albumHtml, { status: 200 }));
    try {
      const paths = encodeURIComponent("/discover,/recently-added,/batch,/openapi.json,/album/summary");
      const res = await worker.fetch(req(`/batch?paths=${paths}`), env);
      expect(res.status).toBe(200);
      const json = (await res.json()) as {
        count: number;
        results: Array<{ path: string; status: number; data: unknown; error?: string }>;
      };
      expect(json.count).toBe(5);
      // two cheap album-block endpoints succeed
      expect(json.results[0]?.status).toBe(200);
      expect(json.results[1]?.status).toBe(200);
      expect((json.results[0]?.data as { albums: unknown[] }).albums).toBeDefined();
      // nested /batch and static docs path are rejected per item, not overall
      expect(json.results[2]?.status).toBe(400);
      expect(json.results[3]?.status).toBe(400);
      // missing required album param surfaces as per-item 400
      expect(json.results[4]?.status).toBe(400);
      expect(res.headers.get("Cache-Control")).toBe("no-store");
    } finally {
      restore();
    }
  });
});
