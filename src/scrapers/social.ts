import { BASE, FETCH_OPTS, REQ_HEADERS, decodeEntities, type FetchOpts } from "../constants.js";
import type {
  AotyComment,
  ChangelogEntry,
  CriticListRank,
  FaqItem,
  NewsDetail,
  NewsSearchItem,
  SiteUpdate,
  SiteStats,
  SingleStat,
  LeaderboardModule,
  GuidelinesSection,
  TagItem,
  UserListEntry,
} from "../types.js";
import { scrapeAlbumBlocks } from "./albumBlock.js";
import { scrapeNewsPage } from "./news.js";
import { scrapeCommentRows } from "./commentRow.js";
import { scrapeUserListRows } from "./userListRow.js";
export { scrapeCommentRows };

export async function scrapeAlbumCriticLists(albumSlug: string, opts: FetchOpts = FETCH_OPTS, page = 1): Promise<{ slug: string; page: number; lists: CriticListRank[] }> {
  const url = page > 1 ? `${BASE}/album/${albumSlug}/critic-lists/${page}/` : `${BASE}/album/${albumSlug}/critic-lists/`;
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`Album critic lists fetch failed: ${res.status}`);
  const lists: CriticListRank[] = [];
  const st: { cur: CriticListRank | null } = { cur: null };
  await new HTMLRewriter()
    .on(".listPub", {
      element() {
        st.cur = { url: "", title: "", publication: "", publicationUrl: null, cover: null, rank: null };
        lists.push(st.cur);
      },
    })
    .on(".listPub > a", {
      element(el) {
        const href = el.getAttribute("href") ?? "";
        if (st.cur && !st.cur.url && href.includes("/list/")) st.cur.url = href.startsWith("http") ? href : BASE + href;
      },
    })
    .on(".listPub .listLogo img", {
      element(el) {
        if (st.cur) {
          st.cur.cover = el.getAttribute("src") ?? null;
          const alt = el.getAttribute("alt") ?? "";
          if (alt) st.cur.title = alt;
        }
      },
    })
    .on(".listPub .listText a", {
      element(el) {
        const href = el.getAttribute("href");
        if (st.cur && href) st.cur.publicationUrl = href.startsWith("http") ? href : BASE + href;
      },
      text(t) {
        if (st.cur) st.cur.publication = (st.cur.publication ?? "") + t.text;
      },
    })
    .on(".listPub .criticListRank", {
      text(t) {
        if (st.cur) st.cur.rank = ((st.cur.rank ?? "") as string) + t.text;
      },
    })
    .transform(res)
    .arrayBuffer();
  return {
    slug: albumSlug,
    page,
    lists: lists.map((l) => ({
      url: l.url ?? "",
      title: decodeEntities((l.title ?? "").trim()),
      publication: decodeEntities((l.publication ?? "").trim()),
      publicationUrl: l.publicationUrl ?? null,
      cover: l.cover ?? null,
      rank: (l.rank ?? "").replace("#", "").trim() || null,
    })),
  };
}

export async function scrapeFaq(opts: FetchOpts = FETCH_OPTS): Promise<FaqItem[]> {
  const res = await fetch(`${BASE}/faq/`, opts);
  if (!res.ok) throw new Error(`FAQ fetch failed: ${res.status}`);
  const html = await res.text();
  const out: FaqItem[] = [];
  for (const m of html.matchAll(/<div class="faqQuestion">(.*?)<\/div>\s*<div class="faqAnswer">(.*?)<\/div>/gs)) {
    const q = m[1];
    const a = m[2];
    if (q && a) {
      out.push({
        question: decodeEntities(q.replace(/<[^>]+>/g, "").trim()),
        answer: decodeEntities(a.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()),
      });
    }
  }
  return out;
}

export async function scrapeGuidelines(type: "review" | "comment", opts: FetchOpts = FETCH_OPTS): Promise<GuidelinesSection> {
  const res = await fetch(`${BASE}/scripts/guidelines.php`, {
    ...opts,
    method: "POST",
    headers: {
      ...REQ_HEADERS,
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Requested-With": "XMLHttpRequest",
      Referer: `${BASE}/`,
    },
    body: `type=${encodeURIComponent(type)}`,
  });
  if (!res.ok) throw new Error(`Guidelines fetch failed: ${res.status}`);
  const html = await res.text();

  const headingMatch = html.match(/<div class="heading">(.*?)<\/div>/);
  const title = headingMatch?.[1] ? decodeEntities(headingMatch[1].replace(/<[^>]+>/g, "").trim()) : `${type} Guidelines`;

  if (type === "review") {
    const bestPractices: string[] = [];
    const whatToAvoid: string[] = [];

    const bpMatch = html.match(/<div class="sectionTitle">Best Practices<\/div>\s*<ul>(.*?)<\/ul>/s);
    if (bpMatch?.[1]) {
      for (const m of bpMatch[1].matchAll(/<li>(.*?)<\/li>/gs)) {
        if (m[1]) bestPractices.push(decodeEntities(m[1].replace(/<[^>]+>/g, "").trim()));
      }
    }

    const waMatch = html.match(/<div class="sectionTitle">What to Avoid<\/div>\s*<ul>(.*?)<\/ul>/s);
    if (waMatch?.[1]) {
      for (const m of waMatch[1].matchAll(/<li>(.*?)<\/li>/gs)) {
        if (m[1]) whatToAvoid.push(decodeEntities(m[1].replace(/<[^>]+>/g, "").trim()));
      }
    }

    const footnoteMatch = html.match(/<div class="footnote">(.*?)<\/div>/);
    const footnote = footnoteMatch?.[1] ? decodeEntities(footnoteMatch[1].replace(/<[^>]+>/g, "").trim()) : null;

    return {
      type,
      title,
      bestPractices,
      whatToAvoid,
      footnote,
    };
  } else {
    const sections: { title: string; text: string }[] = [];
    for (const m of html.matchAll(/<p>(?:<strong>(.*?):?<\/strong>)?\s*(.*?)<\/p>/gs)) {
      const titleChunk = m[1];
      const textChunk = m[2];
      const secTitle = titleChunk ? decodeEntities(titleChunk.replace(/<[^>]+>/g, "").replace(/:$/, "").trim()) : "General";
      const text = textChunk ? decodeEntities(textChunk.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()) : "";
      if (text) sections.push({ title: secTitle, text });
    }

    return {
      type,
      title,
      sections,
    };
  }
}

export async function scrapeChangelog(opts: FetchOpts = FETCH_OPTS): Promise<ChangelogEntry[]> {
  const res = await fetch(`${BASE}/changelog/`, opts);
  if (!res.ok) throw new Error(`Changelog fetch failed: ${res.status}`);
  const entries: ChangelogEntry[] = [];
  const st: { cur: ChangelogEntry | null; textBuf: string } = { cur: null, textBuf: "" };
  await new HTMLRewriter()
    .on(".changeSection", {
      element() {
        if (st.cur) st.cur.text = st.textBuf.trim();
        st.cur = { date: "", type: "", title: "", text: "" };
        entries.push(st.cur);
        st.textBuf = "";
      },
    })
    .on(".changeSection .changeDate", {
      text(t) {
        if (st.cur) st.cur.date = (st.cur.date ?? "") + t.text;
      },
    })
    .on(".changeSection .changeType", {
      text(t) {
        if (st.cur) st.cur.type = (st.cur.type ?? "") + t.text;
      },
    })
    .on(".changeSection .changeTitle", {
      text(t) {
        if (st.cur) st.cur.title = (st.cur.title ?? "") + t.text;
      },
    })
    .on(".changeSection .changeText", {
      text(t) {
        st.textBuf += `${t.text} `;
      },
    })
    .transform(res)
    .arrayBuffer();
  if (st.cur) st.cur.text = st.textBuf.trim();
  return entries.map((e) => ({
    date: (e.date ?? "").trim(),
    type: (e.type ?? "").trim(),
    title: decodeEntities((e.title ?? "").trim()),
    text: decodeEntities((e.text ?? "").replace(/\s+/g, " ").trim()),
  }));
}

export async function scrapeSiteStats(opts: FetchOpts = FETCH_OPTS): Promise<SiteStats> {
  const res = await fetch(`${BASE}/stats/`, opts);
  if (!res.ok) throw new Error(`Site stats fetch failed: ${res.status}`);

  const totals: SingleStat[] = [];
  const leaderboards: LeaderboardModule[] = [];

  let currentSingle: SingleStat | null = null;
  let currentLeaderboard: LeaderboardModule | null = null;
  let currentCells: string[] = [];

  await new HTMLRewriter()
    .on(".module.singleStat", {
      element() {
        currentSingle = { name: "", value: "" };
        totals.push(currentSingle);
      },
    })
    .on(".module.singleStat .heading", {
      text(t) {
        if (currentSingle) currentSingle.name = (currentSingle.name ?? "") + t.text;
      },
    })
    .on(".module.singleStat .statValue", {
      text(t) {
        if (currentSingle) currentSingle.value = (currentSingle.value ?? "") + t.text;
      },
    })
    .on(".module:not(.singleStat)", {
      element() {
        currentLeaderboard = { title: "", key: null, timestamp: null, items: [] };
        leaderboards.push(currentLeaderboard);
      },
    })
    .on(".module:not(.singleStat) .heading", {
      text(t) {
        if (currentLeaderboard) currentLeaderboard.title = (currentLeaderboard.title ?? "") + t.text;
      },
    })
    .on(".module:not(.singleStat) tr", {
      element() {
        currentCells = [];
      },
    })
    .on(".module:not(.singleStat) td", {
      element() {
        currentCells.push("");
      },
      text(t) {
        if (currentCells.length > 0) {
          const lastIndex = currentCells.length - 1;
          const currentCell = currentCells[lastIndex];
          if (currentCell !== undefined) {
            currentCells[lastIndex] = currentCell + t.text;
          }
          const c0 = currentCells[0];
          const c1 = currentCells[1];
          if (currentCells.length === 2 && currentLeaderboard && currentLeaderboard.items && c0 !== undefined && c1 !== undefined) {
            const existing = currentLeaderboard.items[currentLeaderboard.items.length - 1];
            if (!existing || existing.name !== decodeEntities(c0.trim())) {
              currentLeaderboard.items.push({
                name: decodeEntities(c0.trim()),
                value: c1.trim(),
              });
            } else {
              existing.value = c1.trim();
            }
          }
        }
      },
    })
    .on(".module:not(.singleStat) .refreshStats", {
      element(el) {
        if (currentLeaderboard) currentLeaderboard.key = el.getAttribute("data-key") ?? null;
      },
    })
    .on(".module:not(.singleStat) .stats-footer .timestamp", {
      text(t) {
        if (currentLeaderboard) currentLeaderboard.timestamp = ((currentLeaderboard.timestamp ?? "") as string) + t.text;
      },
    })
    .transform(res)
    .arrayBuffer();

  return {
    totals: totals.map((t) => ({
      name: decodeEntities((t.name ?? "").trim()),
      value: (t.value ?? "").trim(),
    })),
    leaderboards: leaderboards.map((l) => ({
      title: decodeEntities((l.title ?? "").trim()),
      key: l.key ?? null,
      timestamp: l.timestamp ? (l.timestamp as string).trim() : null,
      items: l.items ?? [],
    })),
  };
}

export async function scrapeCommentsPage(aotyPath: string, opts: FetchOpts = FETCH_OPTS): Promise<AotyComment[]> {
  const res = await fetch(`${BASE}${aotyPath}`, opts);
  if (!res.ok) throw new Error(`Comments fetch failed: ${res.status}`);
  return scrapeCommentRows(res);
}

export async function scrapeNewsDetail(slug: string, opts: FetchOpts = FETCH_OPTS): Promise<NewsDetail> {
  const url = `${BASE}/l/${slug}/`;
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`News item fetch failed: ${res.status}`);
  const [detailRes, commentsRes] = await Promise.all([fetch(url, opts), fetch(url, opts)]);
  if (!detailRes.ok || !commentsRes.ok) throw new Error("News item fetch failed");
  const s = {
    title: "",
    source: "",
    sourceUrl: "",
    date: "",
    image: null as string | null,
    text: "",
    likes: "",
    embedUrl: null as string | null,
    related: [] as Array<{ name: string; url: string }>,
    streamingLinks: [] as Array<{ platform: string; url: string }>,
  };
  await new HTMLRewriter()
    .on(".mediaHeader h1 a, h1.headline a", {
      element(el) {
        if (!s.sourceUrl) s.sourceUrl = el.getAttribute("href") ?? "";
      },
      text(t) {
        s.title += t.text;
      },
    })
    .on(".mediaHeader .image img", {
      element(el) {
        if (!s.image) s.image = el.getAttribute("src") ?? null;
      },
    })
    .on(".mediaByline .mediaDate", {
      text(t) {
        s.date += t.text;
      },
    })
    .on(".mediaByline a", {
      element(el) {
        const href = el.getAttribute("href") ?? "";
        if (href.startsWith("http") && !s.sourceUrl) s.sourceUrl = href;
      },
      text(t) {
        s.source += t.text;
      },
    })
    .on(".mediaText", {
      text(t) {
        s.text += t.text;
      },
    })
    .on(".media_like, .points", {
      text(t) {
        s.likes += t.text;
      },
    })
    .on(".mediaEmbed iframe", {
      element(el) {
        if (!s.embedUrl) s.embedUrl = el.getAttribute("src") ?? null;
      },
    })
    .on(".inlineRelated a", {
      element(el) {
        const href = el.getAttribute("href") ?? "";
        if (href) s.related.push({ name: "", url: href.startsWith("http") ? href : BASE + href });
      },
      text(t) {
        const last = s.related[s.related.length - 1];
        if (last) last.name += t.text;
      },
    })
    .on(".listenOn a", {
      element(el) {
        const href = el.getAttribute("href") ?? "";
        if (href.startsWith("http")) {
          const host = href.replace(/^https?:\/\//, "").split("/")[0] ?? "";
          const platform = host.includes("spotify") ? "Spotify" : host.includes("apple") ? "Apple Music" : host.includes("amazon") ? "Amazon" : host.includes("bandcamp") ? "Bandcamp" : host.includes("soundcloud") ? "SoundCloud" : host;
          s.streamingLinks.push({ platform, url: href });
        }
      },
    })
    .transform(detailRes)
    .arrayBuffer();
  const comments = await scrapeCommentRows(commentsRes);
  const idM = slug.match(/^(\d+)/);
  return {
    url,
    id: idM?.[1] ?? "",
    title: decodeEntities(s.title.trim()),
    source: decodeEntities(s.source.trim()),
    sourceUrl: s.sourceUrl,
    date: s.date.trim(),
    image: s.image,
    text: decodeEntities(s.text.trim()),
    likes: s.likes.trim() || "0",
    embedUrl: s.embedUrl,
    related: s.related.map((r) => ({ name: decodeEntities(r.name.trim()), url: r.url })),
    streamingLinks: s.streamingLinks,
    comments,
  };
}

export async function scrapeSearchNews(query: string, opts: FetchOpts = FETCH_OPTS, page = 1): Promise<{ query: string; page: number; news: NewsSearchItem[] }> {
  const p = page > 1 ? `&p=${page}` : "";
  const res = await fetch(`${BASE}/search/news/?q=${encodeURIComponent(query)}${p}`, opts);
  if (!res.ok) throw new Error(`News search failed: ${res.status}`);
  const items: NewsSearchItem[] = [];
  let cur: NewsSearchItem | null = null;
  await new HTMLRewriter()
    .on(".newsBlockLarge", {
      element() {
        cur = { title: "", url: "", source: null, image: null };
        items.push(cur);
      },
    })
    .on(".newsBlockLarge a", {
      element(el) {
        const href = el.getAttribute("href") ?? "";
        if (cur && href.includes("/l/") && !cur.url) cur.url = href.startsWith("http") ? href : BASE + href;
      },
      text(t) {
        if (cur) cur.title = (cur.title ?? "") + t.text;
      },
    })
    .on(".newsBlockLarge img", {
      element(el) {
        if (cur) cur.image = el.getAttribute("data-src") || el.getAttribute("src") || null;
      },
    })
    .on(".newsBlockLarge .domain", {
      text(t) {
        if (cur) cur.source = ((cur.source ?? "") as string) + t.text;
      },
    })
    .transform(res)
    .arrayBuffer();
  return {
    query,
    page,
    news: items
      .filter((i) => (i.title ?? "").trim())
      .map((i) => ({
        title: decodeEntities((i.title ?? "").trim()),
        url: i.url ?? "",
        source: (i.source ?? "").trim() || null,
        image: i.image && !i.image.includes("white.gif") ? i.image : null,
      })),
  };
}

export async function scrapeSearchTags(query: string, opts: FetchOpts = FETCH_OPTS, page = 1): Promise<{ query: string; page: number; tags: TagItem[] }> {
  const p = page > 1 ? `&p=${page}` : "";
  const res = await fetch(`${BASE}/search/tags/?q=${encodeURIComponent(query)}${p}`, opts);
  if (!res.ok) throw new Error(`Tag search failed: ${res.status}`);
  const tags: TagItem[] = [];
  let cur: TagItem | null = null;
  await new HTMLRewriter()
    .on(".tagRow", {
      element() {
        cur = { name: "", url: "" };
        tags.push(cur);
      },
    })
    .on(".tagRow a", {
      element(el) {
        const href = el.getAttribute("href") ?? "";
        if (cur && !cur.url && href.includes("/tag/")) cur.url = href.startsWith("http") ? href : BASE + href;
      },
      text(t) {
        if (cur) cur.name = (cur.name ?? "") + t.text;
      },
    })
    .transform(res)
    .arrayBuffer();
  return { query, page, tags: tags.map((t) => ({ name: decodeEntities(t.name.trim()), url: t.url })) };
}

export async function scrapeSiteUpdates(opts: FetchOpts = FETCH_OPTS, filter: string | null = null, page = 1): Promise<{ filter: string | null; page: number; updates: SiteUpdate[] }> {
  let url = filter ? `${BASE}/updates/?f=${encodeURIComponent(filter)}` : `${BASE}/updates/`;
  if (page > 1) {
    url = filter ? `${BASE}/updates/${page}/?f=${encodeURIComponent(filter)}` : `${BASE}/updates/${page}/`;
  }
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`Updates fetch failed: ${res.status}`);
  const updates: SiteUpdate[] = [];
  let cur: SiteUpdate | null = null;
  let linkKind: "title" | "artist" | null = null;
  await new HTMLRewriter()
    .on(".upd", {
      element() {
        cur = { kind: "", title: "", url: "", artist: null, artistUrl: null, image: null, meta: null, timeAgo: null };
        updates.push(cur);
        linkKind = null;
      },
    })
    .on(".upd .updHead", {
      text(t) {
        if (cur) cur.kind = (cur.kind ?? "") + t.text;
      },
    })
    .on(".upd .updText a", {
      element(el) {
        const href = el.getAttribute("href") ?? "";
        if (!cur) return;
        if (href.includes("/album/") || href.includes("/song/") || href.includes("/list/") || href.includes("/l/")) {
          if (!cur.url) {
            linkKind = "title";
            cur.url = href.startsWith("http") ? href : BASE + href;
          } else linkKind = null;
        } else if (href.includes("/artist/")) {
          linkKind = "artist";
          if (!cur.artistUrl) cur.artistUrl = href.startsWith("http") ? href : BASE + href;
        } else linkKind = null;
      },
      text(t) {
        if (!cur || !linkKind) return;
        if (linkKind === "title") cur.title = (cur.title ?? "") + t.text;
        else if (linkKind === "artist") cur.artist = ((cur.artist ?? "") as string) + t.text;
      },
    })
    .on(".upd .updImage img", {
      element(el) {
        if (cur) cur.image = el.getAttribute("src") ?? null;
      },
    })
    .on(".upd .updText p", {
      text(t) {
        if (cur) cur.meta = ((cur.meta ?? "") as string) + t.text;
      },
    })
    .on(".upd .small-font", {
      text(t) {
        if (cur) cur.timeAgo = ((cur.timeAgo ?? "") as string) + t.text;
      },
    })
    .transform(res)
    .arrayBuffer();
  return {
    filter,
    page,
    updates: updates.map((u) => ({
      kind: (u.kind ?? "").trim(),
      title: decodeEntities((u.title ?? "").trim()),
      url: u.url ?? "",
      artist: u.artist ? decodeEntities((u.artist as string).trim()) : null,
      artistUrl: u.artistUrl ?? null,
      image: u.image ?? null,
      meta: (u.meta ?? "").trim() || null,
      timeAgo: (u.timeAgo ?? "").trim() || null,
    })),
  };
}

export async function scrapeAlbumCommentReplies(albumId: string, commentId: string, opts: FetchOpts = FETCH_OPTS): Promise<{ albumId: string; commentId: string; replies: AotyComment[] }> {
  const res = await fetch(`${BASE}/scripts/showAlbumCommentReplies.php`, {
    ...opts,
    method: "POST",
    headers: { ...REQ_HEADERS, "Content-Type": "application/x-www-form-urlencoded", "X-Requested-With": "XMLHttpRequest", Referer: `${BASE}/album/${albumId}/` },
    body: new URLSearchParams({ id: commentId, albumID: albumId }).toString(),
  });
  if (!res.ok) throw new Error(`Comment replies fetch failed: ${res.status}`);
  return { albumId, commentId, replies: await scrapeCommentRows(res) };
}

export async function scrapeHomepage(opts: FetchOpts = FETCH_OPTS): Promise<{
  newReleases: import("../types.js").AlbumBlock[];
  news: import("../types.js").NewsItem[];
  anticipated: import("../types.js").AlbumBlock[];
  criticsBest: import("../types.js").ChartItem[];
  usersBest: import("../types.js").ChartItem[];
  popular: import("../types.js").AlbumBlock[];
  popularReviews: import("../types.js").UserReview[];
  underRadar: import("../types.js").AlbumBlock[];
  onThisDay: import("../types.js").AlbumBlock[];
  recentlyAdded: import("../types.js").AlbumBlock[];
  topSongs: import("../types.js").TopSong[];
}> {
  const { scrapeRatingsChart } = await import("./charts.js");
  const { scrapeUserReviewBlocks } = await import("./user.js");
  const { scrapeTopSongs } = await import("./song.js");
  const year = new Date().getFullYear();
  const [
    newReleasesRes,
    newsItems,
    anticipatedRes,
    criticsBest,
    usersBest,
    popularRes,
    popularReviewsRes,
    underRadarRes,
    onThisDayRes,
    recentlyAddedRes,
    topSongs,
  ] = await Promise.all([
    fetch(`${BASE}/releases/this-week/`, opts),
    scrapeNewsPage(`${BASE}/l/newsworthy/1/`, opts),
    fetch(`${BASE}/discover/anticipated/`, opts),
    scrapeRatingsChart(`/ratings/6-highest-rated/${year}/1`, opts),
    scrapeRatingsChart(`/ratings/user-highest-rated/${year}/1`, opts),
    fetch(`${BASE}/discover/`, opts),
    fetch(`${BASE}/user-reviews/`, opts),
    fetch(`${BASE}/discover/under-radar/`, opts),
    fetch(`${BASE}/on-this-day/`, opts),
    fetch(`${BASE}/recently-added/`, opts),
    scrapeTopSongs(String(year), 1, opts),
  ]);
  const blocks = (res: Response) => scrapeAlbumBlocks(res);
  const [newReleases, anticipated, popular, underRadar, onThisDay, recentlyAdded, popularReviews] = await Promise.all([
    blocks(newReleasesRes),
    blocks(anticipatedRes),
    blocks(popularRes),
    blocks(underRadarRes),
    blocks(onThisDayRes),
    blocks(recentlyAddedRes),
    scrapeUserReviewBlocks(popularReviewsRes),
  ]);
  return {
    newReleases,
    news: newsItems,
    anticipated,
    criticsBest,
    usersBest,
    popular,
    popularReviews,
    underRadar,
    onThisDay,
    recentlyAdded,
    topSongs: topSongs.songs,
  };
}

export async function scrapeAlbumSubAlbums(albumSlug: string, sub: string, opts: FetchOpts = FETCH_OPTS, page = 1): Promise<{ slug: string; page: number; albums: import("../types.js").AlbumBlock[] }> {
  const url = page > 1 ? `${BASE}/album/${albumSlug}/${sub}/${page}/` : `${BASE}/album/${albumSlug}/${sub}/`;
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`Album ${sub} fetch failed: ${res.status}`);
  return { slug: albumSlug, page, albums: await scrapeAlbumBlocks(res) };
}

export async function scrapeAlbumUserLists(albumSlug: string, opts: FetchOpts = FETCH_OPTS, page = 1): Promise<UserListEntry[]> {
  const url = page > 1 ? `${BASE}/album/${albumSlug}/user-lists/${page}/` : `${BASE}/album/${albumSlug}/user-lists/`;
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`Album user lists fetch failed: ${res.status}`);
  return scrapeUserListRows(res);
}
