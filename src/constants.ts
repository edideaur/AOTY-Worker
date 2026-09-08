export const BASE = "https://www.albumoftheyear.org";

export const REQ_HEADERS: HeadersInit = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
};

export type FetchOpts = {
  headers: HeadersInit;
  cf: { cacheTtl: number; cacheEverything?: boolean };
  signal?: AbortSignal;
};

export const FETCH_OPTS: FetchOpts = {
  headers: REQ_HEADERS,
  cf: { cacheTtl: 3600, cacheEverything: true },
};

export const FETCH_OPTS_FRESH: FetchOpts = {
  headers: REQ_HEADERS,
  cf: { cacheTtl: 0 },
};

const NAMED_ENTITIES: Record<string, string> = {
  quot: '"',
  apos: "'",
  lt: "<",
  gt: ">",
  amp: "&",
  nbsp: " ",
  ldquo: "\u201C",
  rdquo: "\u201D",
  lsquo: "\u2018",
  rsquo: "\u2019",
  laquo: "\u00AB",
  raquo: "\u00BB",
  mdash: "\u2014",
  ndash: "\u2013",
  hellip: "\u2026",
  bull: "\u2022",
  middot: "\u00B7",
  copy: "\u00A9",
  reg: "\u00AE",
  trade: "\u2122",
  eacute: "\u00E9",
  Eacute: "\u00C9",
};

export function decodeEntities(str: string): string {
  // Run twice to also collapse double-escaped entities (e.g. &amp;ldquo;).
  for (let i = 0; i < 2; i++) {
    const next = str
      .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
      .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
      .replace(/&([a-zA-Z]+);/g, (m, name) => NAMED_ENTITIES[name] ?? NAMED_ENTITIES[name.toLowerCase()] ?? m);
    if (next === str) break;
    str = next;
  }
  return str;
}

export function cleanImageUrl<T extends string | null | undefined>(url: T): T {
  if (!url) return url;
  return url
    .replace(/\/cdn-cgi\/image\/[^/]+\//g, "/")
    .replace(/\/\d+x\d+\//g, "/") as T;
}

export const RES_HEADERS: HeadersInit = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Expose-Headers": "X-Cache, Server-Timing, Cache-Control, Link, Allow",
  "Access-Control-Max-Age": "86400",
  "Allow": "GET, HEAD, OPTIONS",
  "Vary": "Accept-Encoding",
  "Timing-Allow-Origin": "*",
};

export const PROBLEM_HEADERS: HeadersInit = {
  "Content-Type": "application/problem+json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Vary": "Accept-Encoding",
};
