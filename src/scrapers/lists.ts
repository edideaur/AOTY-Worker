import { BASE, FETCH_OPTS, decodeEntities, type FetchOpts } from "../constants.js";
import type { ListDetailItem, ListEntry } from "../types.js";

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
    title: listTitle.trim(),
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
