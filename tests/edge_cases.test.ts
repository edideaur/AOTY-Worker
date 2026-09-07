import { describe, it, expect } from "bun:test";
import worker from "../src/index.ts";
import { createMockEnv, mockFetch } from "./test_utils.js";
import { decodeEntities } from "../src/constants.js";
import { scrapeAlbumBlocks } from "../src/scrapers/albumBlock.js";

const env = createMockEnv();

function req(path: string, method = "GET"): Request {
  return new Request(`http://localhost${path}`, { method });
}

describe("Edge Case & Security Hunting: Boundaries & Malformed Input", () => {
  it("rejects path traversal in slug parameter with 400", async () => {
    const res1 = await worker.fetch(req("/album?slug=../../etc/passwd"), env);
    expect(res1.status).toBe(400);
    const body1 = (await res1.json()) as { title: string; detail: string };
    expect(body1.detail).toContain("Invalid slug");

    const res2 = await worker.fetch(req("/album/tags?slug=../../traversal"), env);
    expect(res2.status).toBe(400);

    const res3 = await worker.fetch(req("/album?slug=foo/../bar"), env);
    expect(res3.status).toBe(400);
  });

  it("rejects control characters in slug parameter with 400", async () => {
    const res = await worker.fetch(req("/album?slug=bad%00slug"), env);
    expect(res.status).toBe(400);
  });

  it("rejects empty slug parameter with 400", async () => {
    const res = await worker.fetch(req("/album?slug=   "), env);
    expect(res.status).toBe(400);
  });

  it("rejects invalid year formats in /must-hear with 400", async () => {
    const invalidYears = ["abc", "199", "20245", "../2024", "NaN", "-1"];
    for (const y of invalidYears) {
      const res = await worker.fetch(req(`/must-hear?year=${encodeURIComponent(y)}`), env);
      expect(res.status).toBe(400);
      const json = (await res.json()) as { detail: string };
      expect(json.detail).toContain("Invalid year format");
    }
  });

  it("rejects invalid decade formats in /must-hear with 400", async () => {
    const invalidDecades = ["2020", "2020ss", "abc", "199s"];
    for (const d of invalidDecades) {
      const res = await worker.fetch(req(`/must-hear?decade=${encodeURIComponent(d)}`), env);
      expect(res.status).toBe(400);
      const json = (await res.json()) as { detail: string };
      expect(json.detail).toContain("Invalid decade format");
    }
  });

  it("safely handles boundary and malformed page parameters", async () => {
    const restore = mockFetch(async () => new Response('<div class="albumBlock"><div class="albumTitle">OK</div></div>', { status: 200 }));
    try {
      const pages = ["0", "-1", "-9999", "NaN", "infinity", "abc", "1.5", ""];
      for (const p of pages) {
        const res = await worker.fetch(req(`/releases?page=${p}`), env);
        expect(res.status).toBe(200);
        const json = (await res.json()) as { page: number };
        expect(json.page).toBe(1);
      }

      // Clamps huge page numbers to max bound
      const resLarge = await worker.fetch(req("/releases?page=9999999"), env);
      expect(resLarge.status).toBe(200);
      const jsonLarge = (await resLarge.json()) as { page: number };
      expect(jsonLarge.page).toBe(1000);
    } finally {
      restore();
    }
  });

  it("returns 400 when required query parameter is missing", async () => {
    const res1 = await worker.fetch(req("/search"), env);
    expect(res1.status).toBe(400);
    const body1 = (await res1.json()) as { detail: string };
    expect(body1.detail).toContain("Missing required parameter: q");

    const res2 = await worker.fetch(req("/album/tags"), env);
    expect(res2.status).toBe(400);
    const body2 = (await res2.json()) as { detail: string };
    expect(body2.detail).toContain("Missing required parameter: slug");
  });

  it("returns 400 when /album has neither slug nor artist+name", async () => {
    const res = await worker.fetch(req("/album"), env);
    expect(res.status).toBe(400);
  });
});

describe("Entity Decoding & Scraper Resilience on Malformed HTML", () => {
  it("safely decodes bizarre and nested entities without crashing", () => {
    expect(decodeEntities("&amp;amp;")).toBe("&");
    expect(decodeEntities("&#xGGGG;")).toBe("&#xGGGG;");
    expect(decodeEntities("&nonexistent;")).toBe("&nonexistent;");
    expect(decodeEntities("")).toBe("");
    expect(decodeEntities("Normal text without entities")).toBe("Normal text without entities");
  });

  it("scraper handles empty response gracefully without throwing unhandled exceptions", async () => {
    const emptyRes = new Response("", { status: 200 });
    const blocks = await scrapeAlbumBlocks(emptyRes);
    expect(blocks).toEqual([]);
  });

  it("scraper handles truncated / incomplete album blocks gracefully", async () => {
    const truncatedHtml = '<div class="albumBlock"><div class="albumTitle">Incomplete';
    const res = new Response(truncatedHtml, { status: 200 });
    const blocks = await scrapeAlbumBlocks(res);
    expect(blocks.length).toBe(1);
    expect(blocks[0]?.title).toBe("Incomplete");
    expect(blocks[0]?.artist).toBe("");
    expect(blocks[0]?.criticScore).toBeNull();
  });

  it("serves ETag and responds 304 Not Modified when If-None-Match matches", async () => {
    const restore = mockFetch(async () => new Response('<div class="albumBlock"><div class="albumTitle">Album</div></div>', { status: 200 }));
    try {
      const res1 = await worker.fetch(req("/releases?page=1"), env);
      expect(res1.status).toBe(200);
      const etag = res1.headers.get("etag");
      expect(etag).toBeTruthy();

      const reqWithEtag = new Request("http://localhost/releases?page=1", {
        headers: { "If-None-Match": etag! },
      });
      const res2 = await worker.fetch(reqWithEtag, env);
      expect(res2.status).toBe(304);
      expect(await res2.text()).toBe("");
    } finally {
      restore();
    }
  });

  it("handles malformed percent-encoding in slug with 400 problem response", async () => {
    const res = await worker.fetch(req("/album?slug=%E0%A4%A"), env);
    expect(res.status).toBe(400);
    const json = (await res.json()) as { detail: string };
    expect(json.detail).toContain("Invalid URI encoding in slug");
  });
});
