import { BASE, FETCH_OPTS, decodeEntities, parseCount, parseId, parseRank, parseScore, parseExactScore, type FetchOpts } from "../constants.js";
import type { ChartItem, RatingGenresResult, RatingSourcesResult, SearchArtist } from "../types.js";

type RawChartItem = {
  rank: string;
  title: string;
  url: string;
  cover: string | null;
  date: string | null;
  genres: string[];
  score: string | null;
  scoreExact: string | null;
  ratingCount: string | null;
  mustHear: boolean;
};

export async function scrapeRatingsChart(aotyPath: string, opts: FetchOpts = FETCH_OPTS): Promise<ChartItem[]> {
  const res = await fetch(`${BASE}${aotyPath}`, opts);
  if (!res.ok) throw new Error(`Ratings fetch failed: ${res.status}`);
  const items: RawChartItem[] = [];
  let cur: RawChartItem | null = null;
  let inGenre = false;
  await new HTMLRewriter()
    .on(".albumListRow", {
      element(el) {
        const id = el.getAttribute("id") ?? "";
        cur = { rank: id.replace("rank-", ""), title: "", url: "", cover: null, date: null, genres: [], score: null, scoreExact: null, ratingCount: null, mustHear: false };
        items.push(cur);
        inGenre = false;
      },
    })
    .on(".albumListRow .mustHear", {
      element() {
        if (cur) cur.mustHear = true;
      },
    })
    .on(".albumListTitle a[itemprop='url']", {
      element(el) {
        const href = el.getAttribute("href") ?? "";
        if (cur && !cur.url && href) cur.url = href.startsWith("http") ? href : BASE + href;
      },
      text(t) {
        if (cur) cur.title = (cur.title ?? "") + t.text;
      },
    })
    .on(".albumListCover img", {
      element(el) {
        if (cur) cur.cover = el.getAttribute("src") ?? null;
      },
    })
    .on(".albumListDate", {
      text(t) {
        if (cur) cur.date = ((cur.date ?? "") as string) + t.text;
      },
    })
    .on(".albumListGenre", {
      element() {
        inGenre = true;
      },
      text(t) {
        void t;
      },
    })
    .on(".albumListGenre a", {
      text(t) {
        const v = t.text.trim().replace(/,$/, "");
        if (cur && inGenre && v) (cur.genres as string[]).push(v);
      },
    })
    .on(".albumListScoreContainer", {
      element() {
        inGenre = false;
      },
    })
    .on(".scoreValue", {
      text(t) {
        if (cur) cur.score = ((cur.score ?? "") as string) + t.text;
      },
    })
    .on(".scoreValueContainer", {
      element(el) {
        if (cur) cur.scoreExact = el.getAttribute("title") ?? null;
      },
    })
    .on(".scoreText", {
      text(t) {
        if (cur) cur.ratingCount = ((cur.ratingCount ?? "") as string) + t.text;
      },
    })
    .transform(res)
    .arrayBuffer();

  return items.map((i, idx) => {
    const rawTitle = decodeEntities((i.title ?? "").trim());
    const dashIdx = rawTitle.indexOf(" - ");
    const artist = dashIdx > -1 ? rawTitle.slice(0, dashIdx).trim() : "";
    const album = dashIdx > -1 ? rawTitle.slice(dashIdx + 3).trim() : rawTitle;
    return {
      rank: parseRank((i.rank ?? "").trim()) ?? idx + 1,
      artist,
      album,
      title: rawTitle,
      url: i.url ?? "",
      cover: i.cover ?? null,
      date: (i.date ?? "").trim() || null,
      genres: [...new Set((i.genres ?? []).map((g) => decodeEntities(g.trim())).filter(Boolean))],
      score: parseScore((i.score ?? "").trim()),
      scoreExact: parseExactScore(i.scoreExact),
      ratingCount: parseCount((i.ratingCount ?? "").replace(/ratings?/i, "").trim()),
      mustHear: i.mustHear ?? false,
    };
  });
}

export async function scrapeTopArtists(genre: string | null, scope: string, opts: FetchOpts = FETCH_OPTS, page = 1): Promise<SearchArtist[]> {
  let path = "/bands/top-artists/";
  if (genre) path += `${encodeURIComponent(genre)}/`;
  if (scope === "users") path += "users/";
  if (page > 1) path += `${page}/`;
  const res = await fetch(`${BASE}${path}`, opts);
  if (!res.ok) throw new Error(`Top artists fetch failed: ${res.status}`);
  const artists: SearchArtist[] = [];
  let cur: SearchArtist | null = null;
  await new HTMLRewriter()
    .on(".artistBlock", {
      element() {
        cur = { url: "", name: "", image: null };
        artists.push(cur);
      },
    })
    .on(".artistBlock a", {
      element(el) {
        const href = el.getAttribute("href") ?? "";
        if (cur && !cur.url && href.includes("/artist/")) cur.url = href.startsWith("http") ? href : BASE + href;
      },
    })
    .on(".artistBlock img", {
      element(el) {
        if (cur) cur.image = el.getAttribute("src") ?? null;
      },
    })
    .on(".artistBlock .name", {
      text(t) {
        if (cur) cur.name = (cur.name ?? "") + t.text;
      },
    })
    .transform(res)
    .arrayBuffer();
  return artists.map((a) => ({ ...a, name: decodeEntities((a.name ?? "").trim()) }));
}

export async function scrapeRatingSources(
  year: string | number = new Date().getFullYear(),
  opts: FetchOpts = FETCH_OPTS,
): Promise<RatingSourcesResult> {
  const res = await fetch(`${BASE}/scripts/sourceSelect.php`, {
    ...opts,
    method: "POST",
    headers: {
      ...opts.headers,
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Requested-With": "XMLHttpRequest",
    },
    body: new URLSearchParams({ year: String(year), sourceID: "6" }).toString(),
  });
  if (!res.ok) throw new Error(`Rating sources fetch failed: ${res.status}`);
  const html = await res.text();
  const sources: Array<{ slug: string; name: string; url: string }> = [];
  for (const m of html.matchAll(/<a href="(\/ratings\/([^/]+)\/[^"]*)">([^<]+)<\/a>/g)) {
    const url = m[1];
    const slug = m[2];
    const name = m[3];
    if (url && slug && name) {
      sources.push({
        slug,
        name: decodeEntities(name.trim()),
        url: BASE + url,
      });
    }
  }
  return { year: parseId(year) ?? new Date().getFullYear(), sources };
}

export async function scrapeRatingGenres(
  year: string | number = new Date().getFullYear(),
  type = "criticHighestRated",
  opts: FetchOpts = FETCH_OPTS,
): Promise<RatingGenresResult> {
  const res = await fetch(`${BASE}/scripts/genreSelect.php`, {
    ...opts,
    method: "POST",
    headers: {
      ...opts.headers,
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Requested-With": "XMLHttpRequest",
    },
    body: new URLSearchParams({ type, year: String(year), sourceID: "6", sort: "weighted" }).toString(),
  });
  if (!res.ok) throw new Error(`Rating genres fetch failed: ${res.status}`);
  const html = await res.text();
  const genres: Array<{ id: number; slug: string; name: string; url: string }> = [];
  for (const m of html.matchAll(/<a href="(\/genre\/([^/]+)\/[^"]*)">([^<]+)<\/a>/g)) {
    const url = m[1];
    const slug = m[2];
    const name = m[3];
    if (url && slug && name) {
      const idM = slug.match(/^(\d+)/);
      genres.push({
        id: parseId(idM?.[1]) ?? 0,
        slug,
        name: decodeEntities(name.trim()),
        url: BASE + url,
      });
    }
  }
  return { year: parseId(year) ?? new Date().getFullYear(), type, genres };
}

