import { BASE, FETCH_OPTS, REQ_HEADERS, decodeEntities, parseCount, parseScore, parseRank, type FetchOpts } from "../constants.js";
import type { AlbumBlock, ArtistDetail, DiscographySection, NewsItem, SearchArtist, TopSong } from "../types.js";
import { scrapeAlbumBlocks } from "./albumBlock.js";
import { scrapeNewsPage } from "./news.js";

async function scrapeArtistBlocksFrom(res: Response): Promise<SearchArtist[]> {
  const artists: SearchArtist[] = [];
  let current: SearchArtist | null = null;
  await new HTMLRewriter()
    .on(".artistBlock", {
      element() {
        current = { url: "", name: "", image: null };
        artists.push(current);
      },
    })
    .on(".artistBlock a", {
      element(el) {
        if (current && !current.url) {
          const href = el.getAttribute("href");
          if (href?.includes("/artist/")) current.url = href.startsWith("http") ? href : BASE + href;
        }
      },
    })
    .on(".artistBlock img", {
      element(el) {
        if (current) current.image = el.getAttribute("src") ?? null;
      },
    })
    .on(".artistBlock .name", {
      text(t) {
        if (current) current.name = (current.name ?? "") + t.text;
      },
    })
    .transform(res)
    .arrayBuffer();
  return artists.map((a) => ({ ...a, name: decodeEntities((a.name ?? "").trim()) }));
}

export async function scrapeSimilarArtists(slug: string, opts: FetchOpts = FETCH_OPTS, page = 1): Promise<SearchArtist[]> {
  const url = page > 1 ? `${BASE}/artist/${slug}/similar/${page}/` : `${BASE}/artist/${slug}/similar/`;
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`Similar artists fetch failed: ${res.status}`);
  return scrapeArtistBlocksFrom(res);
}

export async function scrapeArtistTopSongs(url: string, opts: FetchOpts = FETCH_OPTS): Promise<TopSong[]> {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`Artist songs fetch failed: ${res.status}`);
  const songs: Array<{ rank: string; title: string; url: string; artist: string; artistUrl: string; album: string | null; albumUrl: string | null; cover: string | null; score: string | null; ratingCount: string | null }> = [];
  let cur: { rank: string; title: string; url: string; artist: string; artistUrl: string; album: string | null; albumUrl: string | null; cover: string | null; score: string | null; ratingCount: string | null } | null = null;
  let inSongCell = false;
  let songLinkKind: "song" | "artist" | "album" | null = null;
  await new HTMLRewriter()
    .on(".trackListTable tr", {
      element() {
        cur = { rank: "", title: "", url: "", artist: "", artistUrl: "", album: null, albumUrl: null, cover: null, score: null, ratingCount: null };
        songs.push(cur);
      },
    })
    .on(".coverart img", {
      element(el) {
        if (cur) cur.cover = el.getAttribute("src") ?? null;
      },
    })
    .on(".songAlbum", {
      element() {
        inSongCell = true;
      },
      text(t) {
        void t;
      },
    })
    .on(".songAlbum a", {
      element(el) {
        const href = el.getAttribute("href") ?? "";
        if (!cur) return;
        if (href.includes("/song/")) {
          songLinkKind = "song";
          if (!cur.url) cur.url = href.startsWith("http") ? href : BASE + href;
        } else if (href.includes("/artist/")) {
          songLinkKind = "artist";
          if (!cur.artistUrl) cur.artistUrl = href.startsWith("http") ? href : BASE + href;
        } else if (href.includes("/album/")) {
          songLinkKind = "album";
          if (!cur.albumUrl) cur.albumUrl = href.startsWith("http") ? href : BASE + href;
        } else songLinkKind = null;
      },
      text(t) {
        if (!cur || !songLinkKind) return;
        const v = t.text;
        if (songLinkKind === "song") cur.title = (cur.title ?? "") + v;
        else if (songLinkKind === "artist") cur.artist = (cur.artist ?? "") + v;
        else if (songLinkKind === "album") cur.album = ((cur.album ?? "") as string) + v;
      },
    })
    .on(".songAlbum .rank", {
      text(t) {
        if (cur) cur.rank = (cur.rank ?? "") + t.text;
      },
    })
    .on(".trackRating .green-font, .trackRating .yellow-font, .trackRating .red-font, .trackRating span", {
      text(t) {
        if (cur && !cur.score) cur.score = (cur.score ?? "") + t.text;
      },
    })
    .on(".trackRating .gray-font", {
      text(t) {
        if (cur) cur.ratingCount = ((cur.ratingCount ?? "") as string) + t.text;
      },
    })
    .transform(res)
    .arrayBuffer();
  void inSongCell;
  return songs
    .filter((s) => (s.title ?? "").trim())
    .map((s, idx) => ({
      rank: parseRank((s.rank ?? "").replace(".", "").trim()) ?? idx + 1,
      title: decodeEntities((s.title ?? "").trim()),
      url: s.url ?? "",
      artist: decodeEntities((s.artist ?? "").trim()),
      artistUrl: s.artistUrl ?? "",
      album: s.album ? decodeEntities((s.album as string).trim()) : null,
      albumUrl: s.albumUrl ?? null,
      cover: s.cover ?? null,
      score: parseScore((s.score ?? "").trim()),
      ratingCount: parseCount((s.ratingCount ?? "").trim()),
    }));
}

export async function scrapeArtistPage(pageUrl: string, opts: FetchOpts = FETCH_OPTS): Promise<ArtistDetail> {
  const res = await fetch(pageUrl, opts);
  if (!res.ok) throw new Error(`Artist fetch failed: ${res.status}`);
  const html = await res.text();

  const s = {
    name: "",
    image: null as string | null,
    criticScore: "",
    criticCount: "",
    userScore: "",
    userCount: "",
    followers: "",
    genres: [] as Array<{ name: string; url: string }>,
    aka: [] as string[],
    akaBuf: "",
    inAkaRow: false,
    memberOf: [] as Array<{ name: string; url: string }>,
    formerlyOf: [] as Array<{ name: string; url: string }>,
    website: null as string | null,
    detailLinkBuf: null as { name: string; url: string } | null,
    detailLinkKind: null as "member" | "former" | "genre" | null,
    sections: [] as Array<{ title: string; albums: Array<{ url: string; artist: string; title: string; cover: string; mediaType: string; releaseDate: string; criticScore: string | null; criticCount: string | null; userScore: string | null; userCount: string | null; mustHear: boolean }> }>,
    section: null as { title: string; albums: Array<{ url: string; artist: string; title: string; cover: string; mediaType: string; releaseDate: string; criticScore: string | null; criticCount: string | null; userScore: string | null; userCount: string | null; mustHear: boolean }> } | null,
    similarArtists: [] as SearchArtist[],
    simCurrent: null as SearchArtist | null,
    topSongs: [] as Array<{ rank: string; title: string; url: string; artist: string; artistUrl: string; album: string | null; albumUrl: string | null; cover: string | null; score: string | null; ratingCount: string | null }>,
    songCurrent: null as { rank: string; title: string; url: string; artist: string; artistUrl: string; album: string | null; albumUrl: string | null; cover: string | null; score: string | null; ratingCount: string | null } | null,
    songLinkKind: null as "song" | "artist" | "album" | null,
  };

  await new HTMLRewriter()
    .on("h1.artistHeadline", {
      text(t) {
        s.name += t.text;
      },
    })
    .on(".artistImage img", {
      element(el) {
        if (!s.image) s.image = el.getAttribute("src") ?? null;
      },
    })
    .on(".artistCriticScore", {
      text(t) {
        s.criticScore += t.text;
      },
    })
    .on(".artistCriticScoreBox .text", {
      text(t) {
        s.criticCount += t.text;
      },
    })
    .on(".artistUserScoreBox .artistUserScore", {
      text(t) {
        s.userScore += t.text;
      },
    })
    .on(".artistUserScoreBox .text", {
      text(t) {
        s.userCount += t.text;
      },
    })
    .on(".followCount", {
      text(t) {
        s.followers += t.text;
      },
    })
    .on(".artistTopBox.info .detailRow", {
      element(el) {
        void el;
        s.inAkaRow = true;
        s.akaBuf = "";
        s.detailLinkBuf = null;
        s.detailLinkKind = null;
      },
      text(t) {
        s.akaBuf += t.text;
      },
    })
    .on(".artistTopBox.info .detailRow a", {
      element(el) {
        const href = el.getAttribute("href") ?? "";
        const url = href.startsWith("http") ? href : href ? BASE + href : "";
        s.detailLinkBuf = { name: "", url };
        if (href.includes("/genre/")) s.detailLinkKind = "genre";
        else if (href.includes("/artist/")) {
          // member vs former decided by row suffix text at cleanup
          s.detailLinkKind = "member";
        } else if (href.startsWith("//") || href.startsWith("http")) {
          if (!s.website) s.website = href.startsWith("//") ? `https:${href}` : href;
          s.detailLinkKind = null;
        } else s.detailLinkKind = null;
      },
      text(t) {
        if (s.detailLinkBuf) s.detailLinkBuf.name += t.text;
      },
    })
    .on("h2.subHeadline", {
      element() {
        s.section = { title: "", albums: [] };
        s.sections.push(s.section);
      },
      text(t) {
        if (s.section && !s.section.albums.length) s.section.title += t.text;
      },
    })
    .on(".sectionHeading h2 a", {
      text(t) {
        void t;
      },
    })
    .on(".section.relatedArtists .artistBlock", {
      element() {
        s.simCurrent = { url: "", name: "", image: null };
        if (s.simCurrent) s.similarArtists.push(s.simCurrent);
      },
    })
    .on(".section.relatedArtists .artistBlock a", {
      element(el) {
        const href = el.getAttribute("href") ?? "";
        if (s.simCurrent && !s.simCurrent.url && href.includes("/artist/"))
          s.simCurrent.url = href.startsWith("http") ? href : BASE + href;
      },
    })
    .on(".section.relatedArtists .artistBlock img", {
      element(el) {
        if (s.simCurrent) s.simCurrent.image = el.getAttribute("src") ?? null;
      },
    })
    .on(".section.relatedArtists .artistBlock .name", {
      text(t) {
        if (s.simCurrent) s.simCurrent.name = (s.simCurrent.name ?? "") + t.text;
      },
    })
    .on(".trackListTable tr", {
      element() {
        s.songCurrent = { rank: "", title: "", url: "", artist: "", artistUrl: "", album: null, albumUrl: null, cover: null, score: null, ratingCount: null };
        if (s.songCurrent) s.topSongs.push(s.songCurrent);
        s.songLinkKind = null;
      },
    })
    .on(".trackListTable .coverart img", {
      element(el) {
        if (s.songCurrent) s.songCurrent.cover = el.getAttribute("src") ?? null;
      },
    })
    .on(".trackListTable .songAlbum a", {
      element(el) {
        const href = el.getAttribute("href") ?? "";
        if (!s.songCurrent) return;
        if (href.includes("/song/")) {
          s.songLinkKind = "song";
          if (!s.songCurrent.url) s.songCurrent.url = href.startsWith("http") ? href : BASE + href;
        } else if (href.includes("/artist/")) {
          s.songLinkKind = "artist";
          if (!s.songCurrent.artistUrl) s.songCurrent.artistUrl = href.startsWith("http") ? href : BASE + href;
        } else if (href.includes("/album/")) {
          s.songLinkKind = "album";
          if (!s.songCurrent.albumUrl) s.songCurrent.albumUrl = href.startsWith("http") ? href : BASE + href;
        } else s.songLinkKind = null;
      },
      text(t) {
        if (!s.songCurrent || !s.songLinkKind) return;
        const v = t.text;
        if (s.songLinkKind === "song") s.songCurrent.title = (s.songCurrent.title ?? "") + v;
        else if (s.songLinkKind === "artist") s.songCurrent.artist = (s.songCurrent.artist ?? "") + v;
        else if (s.songLinkKind === "album") s.songCurrent.album = ((s.songCurrent.album ?? "") as string) + v;
      },
    })
    .on(".trackListTable .songAlbum .rank", {
      text(t) {
        if (s.songCurrent) s.songCurrent.rank = (s.songCurrent.rank ?? "") + t.text;
      },
    })
    .on(".trackListTable .trackRating .green-font, .trackListTable .trackRating .yellow-font, .trackListTable .trackRating .red-font, .trackListTable .trackRating span", {
      text(t) {
        if (s.songCurrent && !s.songCurrent.score) s.songCurrent.score = (s.songCurrent.score ?? "") + t.text;
      },
    })
    .on(".trackListTable .trackRating .gray-font", {
      text(t) {
        if (s.songCurrent) s.songCurrent.ratingCount = ((s.songCurrent.ratingCount ?? "") as string) + t.text;
      },
    })
    .transform(new Response(html))
    .arrayBuffer();

  const rowMatches = [...html.matchAll(/<div class="detailRow">(.*?)<\/div>/gs)].map((m) => m[1]);
  const members: Array<{ name: string; url: string }> = [];
  const formerMembers: Array<{ name: string; url: string }> = [];
  const memberOf: Array<{ name: string; url: string }> = [];
  const formerlyOf: Array<{ name: string; url: string }> = [];
  const relatedArtists: Array<{ name: string; url: string }> = [];
  const genres: Array<{ name: string; url: string }> = [];
  let aka: string[] = [];
  let website: string | null = s.website;
  for (const row of rowMatches) {
    if (!row) continue;
    const links = [...row.matchAll(/<a href="([^"]+)">([^<]*)<\/a>/g)].flatMap((m) => {
      const href = m[1];
      const name = m[2];
      if (!href || name === undefined) return [];
      return [{ href, name: decodeEntities(name.trim()) }];
    });
    if (row.includes("/ Members") || row.includes("/&nbsp;Members")) {
      for (const l of links)
        if (l.href.includes("/artist/")) members.push({ name: l.name, url: l.href.startsWith("http") ? l.href : BASE + l.href });
    } else if (row.includes("Former Members")) {
      for (const l of links)
        if (l.href.includes("/artist/")) formerMembers.push({ name: l.name, url: l.href.startsWith("http") ? l.href : BASE + l.href });
    } else if (row.includes("Member Of")) {
      for (const l of links)
        if (l.href.includes("/artist/")) memberOf.push({ name: l.name, url: l.href.startsWith("http") ? l.href : BASE + l.href });
    } else if (row.includes("Formerly Of")) {
      for (const l of links)
        if (l.href.includes("/artist/")) formerlyOf.push({ name: l.name, url: l.href.startsWith("http") ? l.href : BASE + l.href });
    } else if (row.includes("Related Artists")) {
      for (const l of links)
        if (l.href.includes("/artist/")) relatedArtists.push({ name: l.name, url: l.href.startsWith("http") ? l.href : BASE + l.href });
    } else if (row.includes("Genre")) {
      for (const l of links)
        if (l.href.includes("/genre/")) genres.push({ name: l.name, url: l.href.startsWith("http") ? l.href : BASE + l.href });
    } else if (row.includes("Also Known As")) {
      const textOnly = decodeEntities(row.replace(/<[^>]+>/g, " ")).replace(/ /g, " ");
      aka = textOnly
        .replace(/\s*\/\s*Also Known As.*$/s, "")
        .split(",")
        .map((x) => x.replace(/\+\d+\s*more\.\.\./, "").trim())
        .filter(Boolean);
    } else if (row.includes("Website")) {
      const m = row.match(/<a href="([^"]+)"/);
      if (m?.[1] && !website) website = m[1].startsWith("//") ? `https:${m[1]}` : m[1];
    }
  }

  const tags: Array<{ name: string; url: string }> = [];
  for (const m of html.matchAll(/<div class="tag[^"]*">\s*<a href="([^"]+)">([^<]*)<\/a>\s*<\/div>/g)) {
    const href = m[1];
    const name = m[2];
    if (href && name !== undefined) {
      tags.push({
        url: href.startsWith("http") ? href : BASE + href,
        name: decodeEntities(name.trim()),
      });
    }
  }

  // Discography sections: scrape album blocks per section with a section-aware pass.
  type RawBlock = { url: string; artist: string; title: string; cover: string; mediaType: string; releaseDate: string; criticScore: string | null; criticCount: string | null; userScore: string | null; userCount: string | null; mustHear: boolean };
  const sections: Array<{ title: string; albums: RawBlock[] }> = [];
  let curSection: { title: string; albums: RawBlock[] } | null = null;
  let cur: RawBlock | null = null;
  let ratingValue = "";
  let lastRatingType: "critic" | "user" | null = null;
  await new HTMLRewriter()
    .on("h2.subHeadline", {
      element() {
        curSection = { title: "", albums: [] };
        sections.push(curSection);
      },
      text(t) {
        if (curSection) curSection.title += t.text;
      },
    })
    .on(".albumBlock", {
      element(el) {
        cur = { url: "", artist: "", title: "", cover: "", mediaType: el.getAttribute("data-type") ?? "", releaseDate: "", criticScore: null, criticCount: null, userScore: null, userCount: null, mustHear: false };
        if (curSection) curSection.albums.push(cur);
        lastRatingType = null;
        ratingValue = "";
      },
    })
    .on(".albumBlock .image a", {
      element(el) {
        if (cur && !cur.url) {
          const href = el.getAttribute("href");
          if (href) cur.url = BASE + href;
        }
      },
    })
    .on(".albumBlock .image img", {
      element(el) {
        if (cur) cur.cover = el.getAttribute("src") || el.getAttribute("data-src") || "";
      },
    })
    .on(".albumBlock .image .mustHear", {
      element() {
        if (cur) cur.mustHear = true;
      },
    })
    .on(".albumBlock .artistTitle", {
      text(t) {
        if (cur) cur.artist = (cur.artist ?? "") + t.text;
      },
    })
    .on(".albumBlock .albumTitle", {
      text(t) {
        if (cur) cur.title = (cur.title ?? "") + t.text;
      },
    })
    .on(".albumBlock .type", {
      text(t) {
        if (cur) cur.releaseDate = (cur.releaseDate ?? "") + t.text;
      },
    })
    .on(".albumBlock .ratingRow", {
      element() {
        ratingValue = "";
      },
    })
    .on(".albumBlock .ratingBlock .rating", {
      text(t) {
        ratingValue += t.text;
      },
    })
    .on(".albumBlock .ratingText", {
      text(t) {
        const text = t.text.trim().toLowerCase();
        if (text === "critic score") {
          if (cur) cur.criticScore = ratingValue.trim() || null;
          lastRatingType = "critic";
        } else if (text === "user score") {
          if (cur) cur.userScore = ratingValue.trim() || null;
          lastRatingType = "user";
        } else if (text.startsWith("(") && lastRatingType) {
          const count = text.replace(/[()]/g, "").trim();
          if (lastRatingType === "critic" && cur) cur.criticCount = count || null;
          else if (lastRatingType === "user" && cur) cur.userCount = count || null;
          lastRatingType = null;
        }
      },
    })
    .transform(new Response(html))
    .arrayBuffer();

  const cleanedSections: DiscographySection[] = sections.map((sec) => ({
    title: sec.title.replace(/View All/g, "").trim(),
    albums: sec.albums.map((a) => ({
      url: a.url,
      artist: decodeEntities(a.artist.trim()) || decodeEntities(s.name.trim()),
      title: decodeEntities(a.title.trim()),
      cover: a.cover,
      mediaType: a.mediaType,
      releaseDate: a.releaseDate.trim(),
      criticScore: parseScore(a.criticScore),
      criticCount: parseCount(a.criticCount),
      userScore: parseScore(a.userScore),
      userCount: parseCount(a.userCount),
      mustHear: a.mustHear,
    })),
  }));

  // Merge section-aware blocks with the earlier h2 pass (s.sections holds raw too)
  for (const sec of s.sections) {
    const existing = cleanedSections.find((x) => x.title === sec.title.replace(/View All/g, "").trim());
    if (!existing && (sec.title || sec.albums.length)) {
      cleanedSections.push({
        title: sec.title.replace(/View All/g, "").trim(),
        albums: sec.albums.map((a) => ({
          url: a.url,
          artist: decodeEntities(a.artist.trim()) || decodeEntities(s.name.trim()),
          title: decodeEntities(a.title.trim()),
          cover: a.cover,
          mediaType: a.mediaType,
          releaseDate: a.releaseDate.trim(),
          criticScore: parseScore(a.criticScore),
          criticCount: parseCount(a.criticCount),
          userScore: parseScore(a.userScore),
          userCount: parseCount(a.userCount),
          mustHear: a.mustHear,
        })),
      });
    }
  }

  return {
    url: pageUrl,
    name: decodeEntities(s.name.trim()),
    image: s.image,
    criticScore: parseScore(s.criticScore.trim()),
    criticCount: parseCount(s.criticCount),
    userScore: parseScore(s.userScore.trim()),
    userCount: parseCount(s.userCount),
    followers: parseCount(s.followers.replace(/Followers/i, "").trim()),
    genres,
    alsoKnownAs: aka,
    members,
    formerMembers,
    memberOf,
    formerlyOf,
    relatedArtists,
    tags,
    website,
    sections: cleanedSections.filter((x) => x.title || x.albums.length),
    topSongs: s.topSongs
      .filter((song) => (song.title ?? "").trim())
      .map((song, idx) => ({
        rank: parseRank((song.rank ?? "").replace(".", "").trim()) ?? idx + 1,
        title: decodeEntities((song.title ?? "").trim()),
        url: song.url ?? "",
        artist: decodeEntities((song.artist ?? "").trim()) || decodeEntities(s.name.trim()),
        artistUrl: song.artistUrl ?? "",
        album: song.album ? decodeEntities((song.album as string).trim()) : null,
        albumUrl: song.albumUrl ?? null,
        cover: song.cover ?? null,
        score: parseScore((song.score ?? "").trim()),
        ratingCount: parseCount((song.ratingCount ?? "").trim()),
      })),
    similarArtists: s.similarArtists.map((a) => ({ ...a, name: decodeEntities((a.name ?? "").trim()) })),
  };
}

export async function scrapeArtistDiscography(url: string, opts: FetchOpts = FETCH_OPTS): Promise<DiscographySection[]> {
  const detail = await scrapeArtistPage(url, opts);
  return detail.sections;
}

export async function scrapeArtistNews(slug: string, opts: FetchOpts = FETCH_OPTS, page = 1, type: string | null = null): Promise<{ slug: string; page: number; type: string; items: NewsItem[] }> {
  const feed = type ?? "newsworthy";
  const base = feed === "newsworthy" ? `${BASE}/artist/${slug}/l/` : `${BASE}/artist/${slug}/l/${feed}/`;
  const aotyPath = page > 1 ? `${base}${page}/` : base;
  const items = await scrapeNewsPage(aotyPath, opts);
  return { slug, page, type: feed, items };
}

export async function scrapeRandomArtist(opts: FetchOpts = FETCH_OPTS): Promise<ArtistDetail> {
  const res = await fetch(`${BASE}/random/artist/`, opts);
  if (!res.ok) throw new Error(`Random artist fetch failed: ${res.status}`);
  // fetch follows the 302; res.url is the resolved artist URL.
  return scrapeArtistPage(res.url, opts);
}

export interface ArtistCreditRole {
  role: string;
  albumClass: string;
  songClass: string;
  count: number | null;
}

export async function listArtistCreditRoles(slug: string, opts: FetchOpts = FETCH_OPTS): Promise<{ slug: string; roles: ArtistCreditRole[] }> {
  const res = await fetch(`${BASE}/artist/${slug}/`, opts);
  if (!res.ok) throw new Error(`Artist fetch failed: ${res.status}`);
  const html = await res.text();
  const roles: ArtistCreditRole[] = [];
  for (const m of html.matchAll(/<button class="artistCreditList"([^>]*)>([^<]*)<\/button>\s*<span class="facetCount">\(([^)]*)\)<\/span>/g)) {
    const attrs = m[1] ?? "";
    const name = m[2];
    const countRaw = m[3];
    if (name === undefined) continue;
    const get = (k: string): string => attrs.match(new RegExp(`data-${k}="([^"]*)"`))?.[1] ?? "";
    roles.push({
      role: decodeEntities(name.trim()),
      albumClass: get("album-class"),
      songClass: get("song-class"),
      count: countRaw ? (parseCount(countRaw.trim())) : null,
    });
  }
  return { slug, roles };
}

export async function scrapeArtistCredits(
  slug: string,
  role: string,
  sort: string,
  opts: FetchOpts = FETCH_OPTS,
): Promise<{ slug: string; role: string; albums: AlbumBlock[] }> {
  const idM = slug.match(/^(\d+)/);
  if (!idM?.[1]) throw new Error("Artist slug must start with the numeric artist ID");
  const artistId = idM[1];
  const body = new URLSearchParams({
    artistID: artistId,
    type: role,
    albumClass: "",
    songClass: "",
    releaseType: "",
    sort: sort ?? "",
  }).toString();
  // Reuse the role's classes when known so filtered credits resolve correctly.
  try {
    const { roles } = await listArtistCreditRoles(slug, opts);
    const match = roles.find((r) => r.role.toLowerCase() === role.toLowerCase());
    if (!match) {
      throw new Error(`Unknown credit role: ${role}. Available: ${roles.map((r) => r.role).join(", ")}`);
    }
    const params = new URLSearchParams({
      artistID: artistId,
      type: match.role,
      albumClass: match.albumClass,
      songClass: match.songClass,
      releaseType: "",
      sort: sort ?? "",
    }).toString();
    const res = await fetch(`${BASE}/scripts/artistCreditList.php`, {
      method: "POST",
      headers: { ...REQ_HEADERS, "Content-Type": "application/x-www-form-urlencoded", "X-Requested-With": "XMLHttpRequest", Referer: `${BASE}/artist/${slug}/` },
      body: params,
    });
    if (!res.ok) throw new Error(`Artist credits fetch failed: ${res.status}`);
    return { slug, role: match.role, albums: await scrapeAlbumBlocks(res) };
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("Unknown credit role")) throw err;
    // Fall back to a direct query without classes.
    const res = await fetch(`${BASE}/scripts/artistCreditList.php`, {
      method: "POST",
      headers: { ...REQ_HEADERS, "Content-Type": "application/x-www-form-urlencoded", "X-Requested-With": "XMLHttpRequest", Referer: `${BASE}/artist/${slug}/` },
      body,
    });
    if (!res.ok) throw new Error(`Artist credits fetch failed: ${res.status}`);
    return { slug, role, albums: await scrapeAlbumBlocks(res) };
  }
}
