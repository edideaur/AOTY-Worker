import { describe, it, expect } from "bun:test";
import fc from "fast-check";
import { decodeEntities } from "../src/constants.js";
import { buildCacheKey, getPage, normSlug, hasControlChars } from "../src/index.js";

describe("Property-Based Testing (fast-check)", () => {
  it("decodeEntities: strings without ampersand are identity", () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => !s.includes("&")),
        (s) => {
          expect(decodeEntities(s)).toBe(s);
        }
      )
    );
  });

  it("decodeEntities: never throws for arbitrary unicode / binary strings", () => {
    fc.assert(
      fc.property(fc.string({ unit: "binary" }), (s) => {
        expect(() => decodeEntities(s)).not.toThrow();
      })
    );
  });

  it("decodeEntities: is idempotent after initial decoding pass", () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        const pass1 = decodeEntities(s);
        const pass2 = decodeEntities(pass1);
        expect(decodeEntities(pass2)).toBe(pass2);
      })
    );
  });

  it("getPage: always returns an integer between 1 and 1000 for any search params", () => {
    fc.assert(
      fc.property(fc.string(), (val) => {
        const q = new URLSearchParams();
        q.set("page", val);
        const page = getPage(q);
        expect(Number.isInteger(page)).toBe(true);
        expect(page).toBeGreaterThanOrEqual(1);
        expect(page).toBeLessThanOrEqual(1000);
      })
    );
  });

  it("getPage: returns 1 when page param is omitted", () => {
    fc.assert(
      fc.property(fc.dictionary(fc.string(), fc.string()), (dict) => {
        const q = new URLSearchParams();
        for (const [k, v] of Object.entries(dict)) {
          if (k !== "page") q.set(k, v);
        }
        expect(getPage(q)).toBe(1);
      })
    );
  });

  it("buildCacheKey: never includes 'cache' query parameter", () => {
    fc.assert(
      fc.property(
        fc.webUrl(),
        fc.string(),
        (rawUrl, cacheVal) => {
          const u = new URL(rawUrl);
          u.searchParams.set("cache", cacheVal);
          const key = buildCacheKey(u);
          const parsed = new URL(`http://localhost${key}`);
          expect(parsed.searchParams.has("cache")).toBe(false);
        }
      )
    );
  });

  it("buildCacheKey: parameter ordering is deterministic regardless of insertion order", () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.tuple(fc.string({ minLength: 1 }), fc.string()), {
          selector: ([k]) => k,
        }),
        (pairs) => {
          const u1 = new URL("http://localhost/releases");
          for (const [k, v] of pairs) u1.searchParams.set(k, v);

          const u2 = new URL("http://localhost/releases");
          for (const [k, v] of [...pairs].reverse()) u2.searchParams.set(k, v);

          expect(buildCacheKey(u1)).toBe(buildCacheKey(u2));
        }
      )
    );
  });

  it("normSlug: throws on any string containing directory traversal '..'", () => {
    fc.assert(
      fc.property(
        fc.string(),
        fc.string(),
        (prefix, suffix) => {
          const slug = `${prefix}..${suffix}`;
          expect(() => normSlug(slug)).toThrow();
        }
      )
    );
  });

  it("normSlug: throws on any string containing control characters", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 31 }),
        fc.string(),
        (ctrlCode, suffix) => {
          const slug = `slug${String.fromCharCode(ctrlCode)}${suffix}`;
          expect(() => normSlug(slug)).toThrow();
        }
      )
    );
  });

  it("hasControlChars: accurately identifies control characters (0-31, 127)", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 127 }), (code) => {
        const char = String.fromCharCode(code);
        const isCtrl = (code >= 0 && code <= 31) || code === 127;
        expect(hasControlChars(char)).toBe(isCtrl);
      })
    );
  });
});
