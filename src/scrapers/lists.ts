import { BASE, FETCH_OPTS, decodeEntities, type FetchOpts } from "../constants.js";
import type {
  ListDetailItem,
  ListEntry,
  ListSummaryResult,
  CommunityYearEndResult,
  YearEndAggregateItem,
  YearEndAggregateBreakdown,
  StreamingLink,
} from "../types.js";

export async function scrapeListsIndex(url: string, opts: FetchOpts = FETCH_OPTS): Promise<ListEntry[]> {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`Lists fetch failed: ${res.status}`);

  const entries: ListEntry[] = [];
  let current: ListEntry | null = null;

  await new HTMLRewriter()
    .on(".listColumn .listPub", {
      element() {
        current = { url: "", title: "", publication: "", cover: null };
        entries.push(current);
      },
    })
    .on(".listColumn .listPub > a", {
      element(el) {
        if (current && !current.url) {
          const href = el.getAttribute("href");
          if (href) current.url = href.startsWith("http") ? href : BASE + href;
        }
      },
    })
    .on(".listColumn .listLogo img", {
      element(el) {
        if (current) {
          current.cover = el.getAttribute("src") ?? null;
          current.title = el.getAttribute("alt") ?? "";
        }
      },
    })
    .on(".listColumn .listText a", {
      text(t) { if (current) current.publication += t.text; },
    })
    .transform(res)
    .arrayBuffer();

  return entries.map((e) => ({
    ...e,
    title: decodeEntities((e.title ?? "").trim()),
    publication: decodeEntities((e.publication ?? "").trim()),
  }));
}

type RawListDetailItem = Omit<ListDetailItem, "artist" | "album">;

export async function scrapeListDetail(url: string, opts: FetchOpts = FETCH_OPTS): Promise<{ title: string; sourceUrl: string; items: ListDetailItem[] }> {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`List detail fetch failed: ${res.status}`);

  let listTitle = "";
  let sourceUrl = "";
  const items: RawListDetailItem[] = [];
  let current: RawListDetailItem | null = null;

  await new HTMLRewriter()
    .on(".listHeader h1.headline", {
      text(t) { listTitle += t.text; },
    })
    .on(".listHeader a[href*='http']", {
      element(el) { if (!sourceUrl) sourceUrl = el.getAttribute("href") ?? ""; },
    })
    .on(".albumListRow", {
      element() {
        current = {
          rank: "",
          title: "",
          url: "",
          cover: "",
          date: "",
          genres: [],
          score: null,
          scoreExact: null,
          ratingCount: null,
          blurb: null,
          otherLists: null,
        };
        items.push(current);
      },
    })
    .on(".albumListRank span[itemprop='position']", {
      text(t) { if (current) current.rank += t.text; },
    })
    .on(".albumListTitle a[itemprop='url']", {
      element(el) {
        if (current) {
          const href = el.getAttribute("href");
          if (href) current.url = href.startsWith("http") ? href : BASE + href;
        }
      },
      text(t) { if (current) current.title += t.text; },
    })
    .on(".albumListCover img", {
      element(el) { if (current) current.cover = el.getAttribute("src") ?? ""; },
    })
    .on(".albumListCover .otherLists", {
      text(t) {
        if (current) {
          const m = t.text.match(/(\d+)/);
          if (m?.[1]) current.otherLists = parseInt(m[1], 10);
        }
      },
    })
    .on(".albumListDate", {
      text(t) { if (current) current.date += t.text; },
    })
    .on(".albumListGenre a[href*='/genre/']", {
      text(t) {
        const name = t.text.trim();
        if (current && name) current.genres?.push(name);
      },
    })
    .on(".albumListScoreContainer .scoreValue", {
      text(t) {
        if (current) current.score = (current.score ?? "") + t.text;
      },
    })
    .on(".albumListScoreContainer .scoreValueContainer", {
      element(el) {
        if (current) current.scoreExact = el.getAttribute("title") ?? null;
      },
    })
    .on(".albumListScoreContainer .scoreText", {
      text(t) {
        if (current) current.ratingCount = (current.ratingCount ?? "") + t.text;
      },
    })
    .on(".albumListBlurb p", {
      text(t) {
        if (current) current.blurb = (current.blurb ?? "") + t.text;
      },
    })
    .transform(res)
    .arrayBuffer();

  return {
    title: decodeEntities(listTitle.trim()),
    sourceUrl,
    items: items.map((item) => {
      const rawTitle = decodeEntities((item.title ?? "").trim());
      const dashIdx = rawTitle.indexOf(" - ");
      const artist = dashIdx > -1 ? rawTitle.slice(0, dashIdx).trim() : "";
      const album = dashIdx > -1 ? rawTitle.slice(dashIdx + 3).trim() : rawTitle;
      return {
        rank: (item.rank ?? "").trim(),
        artist,
        album,
        title: rawTitle,
        url: item.url ?? "",
        cover: item.cover ?? "",
        date: (item.date ?? "").trim(),
        genres: [...new Set((item.genres ?? []).map((g) => g.trim()).filter(Boolean))],
        score: (item.score ?? "").trim() || null,
        scoreExact: item.scoreExact ?? null,
        ratingCount: (item.ratingCount ?? "").replace(/reviews?|ratings?/gi, "").trim() || null,
        blurb: item.blurb ? decodeEntities(item.blurb.trim()) : null,
        otherLists: item.otherLists ?? null,
      };
    }),
  };
}

export function parseListSummaryRows(html: string): { totalLists: number | null; items: YearEndAggregateItem[] } {
  const m_total = html.match(/(?:obtained from the|based on)\s*<strong>([\d,]+)<\/strong>\s*lists/i);
  const totalLists = m_total?.[1] ? parseInt(m_total[1].replace(/,/g, ""), 10) : null;

  const items: YearEndAggregateItem[] = [];
  const rows = [...html.matchAll(/<div class="listSummaryRow">([\s\S]*?)(?=<div class="listSummaryRow"|<div id="comments"|<div class="footer"|$)/g)];

  for (const match of rows) {
    const r = match[1];
    if (!r) continue;

    const rankM = r.match(/<div class="listSummaryRank[^"]*">(\d+)<\/div>/);
    const rank = rankM?.[1] ? parseInt(rankM[1], 10) : 0;

    const coverM = r.match(/<div class="listSummaryCover[^"]*">[\s\S]*?<img [^>]*src="([^"]+)"/);
    const cover = coverM?.[1] ?? null;

    const albumM = r.match(/<h2 class="albumTitle[^"]*"><a [^>]*href="([^"]+)">([^<]+)<\/a><\/h2>/);
    const albumUrl = albumM?.[1] ? (albumM[1].startsWith("http") ? albumM[1] : BASE + albumM[1]) : "";
    const album = albumM?.[2] ? decodeEntities(albumM[2].trim()) : "";

    const artistM = r.match(/<h3 class="artistTitle[^"]*"><a [^>]*href="([^"]+)">([^<]+)<\/a><\/h3>/);
    const artistUrl = artistM?.[1] ? (artistM[1].startsWith("http") ? artistM[1] : BASE + artistM[1]) : "";
    const artist = artistM?.[2] ? decodeEntities(artistM[2].trim()) : "";

    const pointsM = r.match(/<div class="summaryPoints[^"]*">[\s\S]*?([\d,]+)\s*Points/i);
    const points = pointsM?.[1] ? parseInt(pointsM[1].replace(/,/g, ""), 10) : 0;

    const getCount = (head: string): number => {
      const escaped = head.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const m = r.match(new RegExp(`<div class="head">${escaped}<\\/div>\\s*<div class="count">([\\d,]+)<\\/div>`));
      return m?.[1] ? parseInt(m[1].replace(/,/g, ""), 10) : 0;
    };

    const breakdown: YearEndAggregateBreakdown = {
      firstPlace: getCount("1st Place"),
      secondPlace: getCount("2nd Place"),
      thirdPlace: getCount("3rd Place"),
      top10: getCount("Top 10"),
      top25: getCount("Top 25"),
      other: getCount("Other"),
    };

    const streamingLinks: StreamingLink[] = [];
    const linksIdx = r.indexOf('class="albumListLinks');
    if (linksIdx !== -1) {
      const linksChunk = r.slice(linksIdx);
      for (const link of linksChunk.matchAll(/<a [^>]*href="([^"]+)"[^>]*>\s*<div>([^<]+)<\/div>\s*<\/a>/g)) {
        if (link[1] && link[2]) {
          streamingLinks.push({
            platform: decodeEntities(link[2].trim()),
            url: link[1],
          });
        }
      }
    }

    if (album || artist) {
      items.push({
        rank,
        artist,
        artistUrl,
        album,
        albumUrl,
        cover,
        points,
        breakdown,
        streamingLinks,
      });
    }
  }

  return { totalLists, items };
}

export async function scrapeYearEndSummary(
  year: number,
  genre: string | null = null,
  opts: FetchOpts = FETCH_OPTS,
): Promise<ListSummaryResult> {
  const url = genre ? `${BASE}/list/summary/${year}/${encodeURIComponent(genre)}/` : `${BASE}/list/summary/${year}/`;
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`List summary fetch failed: ${res.status}`);
  const html = await res.text();
  const { totalLists, items } = parseListSummaryRows(html);
  return { year, genre, totalLists, items };
}

export async function scrapeCommunityYearEnd(
  year: number,
  opts: FetchOpts = FETCH_OPTS,
): Promise<CommunityYearEndResult> {
  const url = `${BASE}/year-end/${year}/`;
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`Community year-end fetch failed: ${res.status}`);
  const html = await res.text();
  const { totalLists, items } = parseListSummaryRows(html);
  return { year, totalLists, items };
}

