import { BASE, FETCH_OPTS, REQ_HEADERS, decodeEntities, parseCount, parseScore, parseId, parseYear, type FetchOpts } from "../constants.js";
import type {
  ArtistsOverviewSection,
  ChartItem,
  CriticDetail,
  GenreAutocompleteItem,
  GenreDetail,
  GenreIndexItem,
  GenreSection,
  LabelDetail,
  ListEntry,
  NamedLink,
  PerfectSection,
  PublicationDetail,
  PublicationReview,
  SearchArtist,
  TagResults,
} from "../types.js";
import { scrapeAlbumBlocks } from "./albumBlock.js";
import { scrapeRatingsChart } from "./charts.js";
import { scrapeNewsPage } from "./news.js";

export async function scrapeLabelPage(pageUrl: string, opts: FetchOpts = FETCH_OPTS, page = 1): Promise<LabelDetail> {
  const [nameRes, blocksRes] = await Promise.all([fetch(pageUrl, opts), fetch(pageUrl, opts)]);
  if (!nameRes.ok) throw new Error(`Label fetch failed: ${nameRes.status}`);
  if (!blocksRes.ok) throw new Error(`Label fetch failed: ${blocksRes.status}`);

  const s = {
    name: "",
    image: null as string | null,
    website: null as string | null,
    parentLabel: null as NamedLink | null,
    description: null as string | null,
  };
  await new HTMLRewriter()
    .on("h1.headline", {
      text(t) {
        s.name += t.text;
      },
    })
    .on(".publicationHeader img, .logo img", {
      element(el) {
        if (!s.image) s.image = el.getAttribute("src") ?? null;
      },
    })
    .on(".publicationHeader a[href*='http'], .logo a[href*='http'], .labelInfo a[href*='http']", {
      element(el) {
        const href = el.getAttribute("href") ?? "";
        if (href.startsWith("http") && !s.website && !href.includes("albumoftheyear.org")) {
          s.website = href;
        }
      },
    })
    .on(".labelDescription, .description", {
      text(t) {
        s.description = (s.description ?? "") + t.text;
      },
    })
    .on(".labelInfo a[href*='/label/'], .parentLabel a[href*='/label/']", {
      element(el) {
        const href = el.getAttribute("href") ?? "";
        if (href && !s.parentLabel) {
          s.parentLabel = { name: "", url: href.startsWith("http") ? href : BASE + href };
        }
      },
      text(t) {
        if (s.parentLabel) s.parentLabel.name += t.text;
      },
    })
    .transform(nameRes)
    .arrayBuffer();

  return {
    url: pageUrl,
    name: decodeEntities(s.name.trim()),
    image: s.image,
    website: s.website,
    parentLabel: s.parentLabel
      ? { name: decodeEntities(s.parentLabel.name.trim()), url: s.parentLabel.url }
      : null,
    description: s.description ? decodeEntities(s.description.trim()) : null,
    page,
    albums: await scrapeAlbumBlocks(blocksRes),
  };
}

export async function scrapeGenresIndex(opts: FetchOpts = FETCH_OPTS): Promise<GenreIndexItem[]> {
  const res = await fetch(`${BASE}/genre.php`, opts);
  if (!res.ok) throw new Error(`Genres fetch failed: ${res.status}`);
  type RawBlock = { url: string; artist: string; title: string; cover: string; mediaType: string; releaseDate: string; criticScore: string | null; criticCount: string | null; userScore: string | null; userCount: string | null; mustHear: boolean };
  const items: Array<{ name: string; url: string; albums: RawBlock[] }> = [];
  let cur: { name: string; url: string; albums: RawBlock[] } | null = null;
  let curBlock: RawBlock | null = null;
  let ratingValue = "";
  let lastRatingType: "critic" | "user" | null = null;
  await new HTMLRewriter()
    .on("h2", {
      element() {
        cur = { name: "", url: "", albums: [] };
        items.push(cur);
        curBlock = null;
      },
    })
    .on("h2 a", {
      element(el) {
        const href = el.getAttribute("href") ?? "";
        if (cur && !cur.url && href.includes("/genre/")) cur.url = href.startsWith("http") ? href : BASE + href;
      },
      text(t) {
        if (cur) cur.name += t.text;
      },
    })
    .on(".albumBlock", {
      element(el) {
        curBlock = { url: "", artist: "", title: "", cover: "", mediaType: el.getAttribute("data-type") ?? "", releaseDate: "", criticScore: null, criticCount: null, userScore: null, userCount: null, mustHear: false };
        if (cur) cur.albums.push(curBlock);
        lastRatingType = null;
        ratingValue = "";
      },
    })
    .on(".albumBlock .image a", {
      element(el) {
        if (curBlock && !curBlock.url) {
          const href = el.getAttribute("href");
          if (href) curBlock.url = BASE + href;
        }
      },
    })
    .on(".albumBlock .image img", {
      element(el) {
        if (curBlock) curBlock.cover = el.getAttribute("src") || el.getAttribute("data-src") || "";
      },
    })
    .on(".albumBlock .image .mustHear", {
      element() {
        if (curBlock) curBlock.mustHear = true;
      },
    })
    .on(".albumBlock .artistTitle", {
      text(t) {
        if (curBlock) curBlock.artist = (curBlock.artist ?? "") + t.text;
      },
    })
    .on(".albumBlock .albumTitle", {
      text(t) {
        if (curBlock) curBlock.title = (curBlock.title ?? "") + t.text;
      },
    })
    .on(".albumBlock .type", {
      text(t) {
        if (curBlock) curBlock.releaseDate = (curBlock.releaseDate ?? "") + t.text;
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
          if (curBlock) curBlock.criticScore = ratingValue.trim() || null;
          lastRatingType = "critic";
        } else if (text === "user score") {
          if (curBlock) curBlock.userScore = ratingValue.trim() || null;
          lastRatingType = "user";
        } else if (text.startsWith("(") && lastRatingType) {
          const count = text.replace(/[()]/g, "").trim();
          if (lastRatingType === "critic" && curBlock) curBlock.criticCount = count || null;
          else if (lastRatingType === "user" && curBlock) curBlock.userCount = count || null;
          lastRatingType = null;
        }
      },
    })
    .transform(res)
    .arrayBuffer();

  return items
    .filter((g) => g.name.trim() && g.url)
    .map((g) => ({
      name: decodeEntities(g.name.trim()),
      url: g.url,
      albums: g.albums.map((a) => ({
        url: a.url,
        artist: decodeEntities(a.artist.trim()),
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
}

export async function scrapeGenrePage(pageUrl: string, slug: string, opts: FetchOpts = FETCH_OPTS, page = 1): Promise<GenreDetail> {
  const res = await fetch(pageUrl, opts);
  if (!res.ok) throw new Error(`Genre fetch failed: ${res.status}`);
  type RawBlock = { url: string; artist: string; title: string; cover: string; mediaType: string; releaseDate: string; criticScore: string | null; criticCount: string | null; userScore: string | null; userCount: string | null; mustHear: boolean };
  const s = {
    name: "",
    sections: [] as Array<{ title: string; url: string | null; albums: RawBlock[]; artists: Array<{ url: string; name: string; image: string | null }> }>,
    section: null as { title: string; url: string | null; albums: RawBlock[]; artists: Array<{ url: string; name: string; image: string | null }> } | null,
    cur: null as RawBlock | null,
    artist: null as { url: string; name: string; image: string | null } | null,
    ratingValue: "",
    lastRatingType: null as "critic" | "user" | null,
  };
  await new HTMLRewriter()
    .on("h1", {
      text(t) {
        s.name += t.text;
      },
    })
    .on("h2", {
      element(el) {
        void el;
        s.section = { title: "", url: null, albums: [], artists: [] };
        s.sections.push(s.section);
      },
      text(t) {
        if (s.section) s.section.title += t.text;
      },
    })
    .on("h2 a", {
      element(el) {
        const href = el.getAttribute("href") ?? "";
        if (s.section && !s.section.url && href) s.section.url = href.startsWith("http") ? href : BASE + href;
      },
    })
    .on(".albumBlock", {
      element(el) {
        if (!s.section) {
          s.section = { title: "", url: null, albums: [], artists: [] };
          s.sections.push(s.section);
        }
        s.cur = { url: "", artist: "", title: "", cover: "", mediaType: el.getAttribute("data-type") ?? "", releaseDate: "", criticScore: null, criticCount: null, userScore: null, userCount: null, mustHear: false };
        s.section.albums.push(s.cur);
        s.lastRatingType = null;
        s.ratingValue = "";
      },
    })
    .on(".albumBlock .image a", {
      element(el) {
        if (s.cur && !s.cur.url) {
          const href = el.getAttribute("href");
          if (href) s.cur.url = BASE + href;
        }
      },
    })
    .on(".albumBlock .image img", {
      element(el) {
        if (s.cur) s.cur.cover = el.getAttribute("src") || el.getAttribute("data-src") || "";
      },
    })
    .on(".albumBlock .image .mustHear", {
      element() {
        if (s.cur) s.cur.mustHear = true;
      },
    })
    .on(".albumBlock .artistTitle", {
      text(t) {
        if (s.cur) s.cur.artist = (s.cur.artist ?? "") + t.text;
      },
    })
    .on(".albumBlock .albumTitle", {
      text(t) {
        if (s.cur) s.cur.title = (s.cur.title ?? "") + t.text;
      },
    })
    .on(".albumBlock .type", {
      text(t) {
        if (s.cur) s.cur.releaseDate = (s.cur.releaseDate ?? "") + t.text;
      },
    })
    .on(".albumBlock .ratingRow", {
      element() {
        s.ratingValue = "";
      },
    })
    .on(".albumBlock .ratingBlock .rating", {
      text(t) {
        s.ratingValue += t.text;
      },
    })
    .on(".albumBlock .ratingText", {
      text(t) {
        const text = t.text.trim().toLowerCase();
        if (text === "critic score") {
          if (s.cur) s.cur.criticScore = s.ratingValue.trim() || null;
          s.lastRatingType = "critic";
        } else if (text === "user score") {
          if (s.cur) s.cur.userScore = s.ratingValue.trim() || null;
          s.lastRatingType = "user";
        } else if (text.startsWith("(") && s.lastRatingType) {
          const count = text.replace(/[()]/g, "").trim();
          if (s.lastRatingType === "critic" && s.cur) s.cur.criticCount = count || null;
          else if (s.lastRatingType === "user" && s.cur) s.cur.userCount = count || null;
          s.lastRatingType = null;
        }
      },
    })
    .on(".artistBlock", {
      element() {
        if (!s.section) {
          s.section = { title: "", url: null, albums: [], artists: [] };
          s.sections.push(s.section);
        }
        s.artist = { url: "", name: "", image: null };
        s.section.artists.push(s.artist);
      },
    })
    .on(".artistBlock a", {
      element(el) {
        const href = el.getAttribute("href") ?? "";
        if (s.artist && !s.artist.url && href.includes("/artist/"))
          s.artist.url = href.startsWith("http") ? href : BASE + href;
      },
    })
    .on(".artistBlock img", {
      element(el) {
        if (s.artist) s.artist.image = el.getAttribute("src") ?? null;
      },
    })
    .on(".artistBlock .name", {
      text(t) {
        if (s.artist) s.artist.name = (s.artist.name ?? "") + t.text;
      },
    })
    .transform(res)
    .arrayBuffer();

  const sections: GenreSection[] = s.sections
    .map((sec) => ({
      title: decodeEntities(sec.title.replace(/View More/g, "").replace(/View All/g, "").trim()),
      url: sec.url,
      albums: sec.albums.map((a) => ({
        url: a.url,
        artist: decodeEntities(a.artist.trim()),
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
      artists: sec.artists.map((a) => ({ url: a.url ?? "", name: decodeEntities((a.name ?? "").trim()), image: a.image ?? null })),
    }))
    .filter((sec) => sec.albums.length > 0 || sec.artists.length > 0);

  // Year / all-time genre pages use chart rows instead of album blocks.
  let items: ChartItem[] = [];
  if (sections.length === 0) {
    const aotyPath = pageUrl.replace(BASE, "");
    try {
      items = await scrapeRatingsChart(aotyPath, opts);
    } catch {
      items = [];
    }
  }

  // Child genres live in the two-column link cloud near the bottom.
  const res2 = await fetch(pageUrl, opts);
  const html2 = await res2.text();
  const childGenres: NamedLink[] = [];
  const cloudParts = html2.split("Child Genres");
  const cloudM = cloudParts[1];
  if (cloudM) {
    const cloud = cloudM.split("</div></div>")[0];
    if (cloud) {
      for (const m of cloud.matchAll(/<a href="(\/genre\/[^"]+)">([^<]+)<\/a>/g)) {
        if (m[1] && m[2]) {
          childGenres.push({ name: decodeEntities(m[2].trim()), url: BASE + m[1] });
        }
      }
    }
  }
  return { url: pageUrl, slug, name: decodeEntities(s.name.trim()), page, sections, items, childGenres };
}

export async function scrapeTagPage(tag: string, type: string, year: string | number | null, opts: FetchOpts = FETCH_OPTS, page = 1): Promise<TagResults> {
  const slug = encodeURIComponent(tag).replace(/%20/g, "+");
  const yearNum = year === null || year === undefined || year === "" ? null : (parseYear(year) ?? parseId(year));
  if (type === "media") {
    const mediaUrl = page > 1 ? `${BASE}/tag/${slug}/media/${page}/` : `${BASE}/tag/${slug}/media/`;
    return { tag, type, year: yearNum, page, albums: [], media: await scrapeNewsPage(mediaUrl, opts) };
  }
  let path = page > 1 ? `/tag/${slug}/albums/${page}/` : `/tag/${slug}/albums/`;
  if (year) path = page > 1 ? `/tag/${slug}/albums/year/${year}/${page}/` : `/tag/${slug}/albums/year/${year}/`;
  const res = await fetch(`${BASE}${path}`, opts);
  if (!res.ok) throw new Error(`Tag fetch failed: ${res.status}`);
  return { tag, type, year: yearNum, page, albums: await scrapeAlbumBlocks(res), media: [] };
}

function scrapePublicationReviewsFromHtml(html: string): PublicationReview[] {
  // Fallback regex parser used when HTMLRewriter pass needs a second source.
  const reviews: PublicationReview[] = [];
  const blocks = html.split('<div class="albumBlock');
  for (let i = 1; i < blocks.length; i++) {
    const b = blocks[i];
    if (!b) continue;
    const albumM = b.match(/<a href="(\/album\/[^"]+)"[^>]*>[\s\S]{0,300}?<div class="albumTitle">([^<]*)<\/div>/);
    const artistM = b.match(/<div class="artistTitle">([^<]*)<\/div>/);
    const imgM = b.match(/<img src="([^"]+)"/);
    const scoreM = b.match(/<div class="rating">([^<]*)<\/div>/);
    const extM = b.match(/<a[^>]+href="(https?:\/\/[^"]+)"[^>]*>\s*Full Review/);
    if (!albumM?.[1]) continue;
    reviews.push({
      artist: decodeEntities((artistM?.[1] ?? "").trim()),
      artistUrl: "",
      album: decodeEntities((albumM[2] ?? "").trim()),
      albumUrl: BASE + albumM[1],
      cover: imgM?.[1] ?? null,
      score: parseScore((scoreM?.[1] ?? "").trim()),
      reviewUrl: extM?.[1] ?? "",
    });
  }
  return reviews;
}

export async function scrapePublicationPage(pageUrl: string, slug: string, opts: FetchOpts = FETCH_OPTS): Promise<PublicationDetail> {
  const res = await fetch(pageUrl, opts);
  if (!res.ok) throw new Error(`Publication fetch failed: ${res.status}`);
  const s = {
    name: "",
    image: null as string | null,
    website: null as string | null,
    albumsRated: "",
    averageRating: "",
    dist: [] as { range: string; count: number }[],
    distRange: "",
    distCount: "",
    distStep: 0,
    recentReviews: [] as PublicationReview[],
    topAlbums: [] as PublicationReview[],
    rev: null as Partial<PublicationReview> | null,
    revTarget: null as "recent" | "top" | null,
    sectionIndex: 0,
    artistBuf: "",
  };
  await new HTMLRewriter()
    .on("h1", {
      text(t) {
        s.name += t.text;
      },
    })
    .on(".publicationHeader img, .logo img", {
      element(el) {
        if (!s.image) s.image = el.getAttribute("src") ?? null;
      },
    })
    .on(".publicationHeader a[href*='http'], .logo a[href*='http']", {
      element(el) {
        const href = el.getAttribute("href") ?? "";
        if (href.startsWith("http") && !s.website) s.website = href;
      },
    })
    .on(".pubSubHeadline a", {
      element(el) {
        const href = el.getAttribute("href") ?? "";
        if (href && !s.website) s.website = href.startsWith("//") ? `https:${href}` : href;
      },
    })
    .transform(res.clone())
    .arrayBuffer();

  const html = await res.text();
  const infoM = html.match(/Albums Rated:<\/span>\s*([\d,]+)/);
  const avgM = html.match(/Average Rating:<\/span>\s*([\d.]+)/);
  s.albumsRated = infoM?.[1] ?? "";
  s.averageRating = avgM?.[1] ?? "";

  // Rating distribution: <td class="distLabel">range</td><td class="distCount">count</td>
  for (const m of html.matchAll(/<td class="distLabel">([^<]*)<\/td>\s*<td class="distCount">([^<]*)<\/td>/g)) {
    const m1 = m[1];
    const m2 = m[2];
    if (m1 !== undefined && m2 !== undefined) {
      const count = parseInt(m2.replace(/,/g, ""), 10);
      if (!Number.isNaN(count)) s.dist.push({ range: m1.trim(), count });
    }
  }

  // Recent + top reviews: two albumBlock runs separated by "Highest Rated" heading
  const [beforeHighest, afterHighest] = html.split(/Highest Rated Albums/);
  s.recentReviews = scrapePublicationReviewsFromHtml(beforeHighest ?? "");
  // attach artist urls + review urls via second regex on same chunk
  s.topAlbums = scrapePublicationReviewsFromHtml(afterHighest ?? "");

  // Artist URLs: match artist link preceding each album link
  const enrich = (chunk: string, out: PublicationReview[]) => {
    const pairs = [...chunk.matchAll(/<a href="(\/artist\/[^"]+)">[\s\S]{0,200}?<div class="artistTitle">([\s\S]*?)<\/div>/g)];
    out.forEach((r, i) => {
      const p = pairs[i];
      if (p?.[1]) {
        r.artistUrl = BASE + p[1];
        if (!r.artist && p[2]) r.artist = decodeEntities(p[2].replace(/<[^>]+>/g, "").trim());
      }
    });
  };
  enrich(beforeHighest ?? "", s.recentReviews);
  enrich(afterHighest ?? "", s.topAlbums);

  return {
    url: pageUrl,
    slug,
    name: decodeEntities(s.name.trim()),
    image: s.image,
    website: s.website,
    albumsRated: parseCount(s.albumsRated),
    averageRating: parseScore(s.averageRating),
    ratingDistribution: s.dist,
    recentReviews: s.recentReviews,
    topAlbums: s.topAlbums,
  };
}

export async function scrapePublicationPerfect(slug: string, opts: FetchOpts = FETCH_OPTS): Promise<{ slug: string; sections: PerfectSection[] }> {
  const res = await fetch(`${BASE}/publication/${slug}/perfect/`, opts);
  if (!res.ok) throw new Error(`Publication perfect scores fetch failed: ${res.status}`);
  type RawRev = { album: string; albumUrl: string; artist: string; artistUrl: string; cover: string | null; score: string; reviewUrl: string };
  const sections: Array<{ title: string; reviews: RawRev[] }> = [];
  let section: { title: string; reviews: RawRev[] } | null = null;
  let rev: RawRev | null = null;
  await new HTMLRewriter()
    .on(".sectionHeading", {
      element() {
        section = { title: "", reviews: [] };
        sections.push(section);
      },
      text(t) {
        if (section && !section.reviews.length) section.title += t.text;
      },
    })
    .on(".albumBlock", {
      element() {
        if (!section) {
          section = { title: "", reviews: [] };
          sections.push(section);
        }
        rev = { album: "", albumUrl: "", artist: "", artistUrl: "", cover: null, score: "", reviewUrl: "" };
        section.reviews.push(rev);
      },
    })
    .on(".albumBlock .image a", {
      element(el) {
        const href = el.getAttribute("href") ?? "";
        if (rev && !rev.albumUrl && href.includes("/album/")) rev.albumUrl = href.startsWith("http") ? href : BASE + href;
      },
    })
    .on(".albumBlock .image img", {
      element(el) {
        if (rev) rev.cover = el.getAttribute("src") ?? null;
      },
    })
    .on(".albumBlock .artistTitle", {
      element(el) {
        void el;
      },
      text(t) {
        if (rev) rev.artist = (rev.artist ?? "") + t.text;
      },
    })
    .on(".albumBlock a[href*='/artist/']", {
      element(el) {
        const href = el.getAttribute("href") ?? "";
        if (rev && !rev.artistUrl) rev.artistUrl = href.startsWith("http") ? href : BASE + href;
      },
    })
    .on(".albumBlock .albumTitle", {
      text(t) {
        if (rev) rev.album = (rev.album ?? "") + t.text;
      },
    })
    .on(".albumBlock .rating", {
      text(t) {
        if (rev) rev.score = (rev.score ?? "") + t.text;
      },
    })
    .on(".albumBlock .ratingText a", {
      element(el) {
        const href = el.getAttribute("href") ?? "";
        if (rev && href.startsWith("http")) rev.reviewUrl = href;
      },
    })
    .transform(res)
    .arrayBuffer();
  return {
    slug,
    sections: sections
      .map((sec) => ({
        title: decodeEntities(sec.title.replace(/View More/g, "").trim()),
        reviews: sec.reviews
          .filter((r) => (r.album ?? "").trim())
          .map((r) => ({
            album: decodeEntities((r.album ?? "").trim()),
            albumUrl: r.albumUrl ?? "",
            artist: decodeEntities((r.artist ?? "").trim()),
            artistUrl: r.artistUrl ?? "",
            cover: r.cover ?? null,
            score: parseScore((r.score ?? "").trim()),
            reviewUrl: r.reviewUrl ?? "",
          })),
      }))
      .filter((sec) => sec.reviews.length > 0),
  };
}

export async function scrapeArtistsOverview(opts: FetchOpts = FETCH_OPTS): Promise<ArtistsOverviewSection[]> {
  const res = await fetch(`${BASE}/artists/`, opts);
  if (!res.ok) throw new Error(`Artists overview fetch failed: ${res.status}`);
  const sections: ArtistsOverviewSection[] = [];
  let section: ArtistsOverviewSection | null = null;
  let cur: SearchArtist | null = null;
  await new HTMLRewriter()
    .on("h2.sectionHeading", {
      element() {
        section = { title: "", artists: [] };
        sections.push(section);
      },
      text(t) {
        if (section) section.title += t.text;
      },
    })
    .on(".artistBlock", {
      element() {
        if (!section) {
          section = { title: "", artists: [] };
          sections.push(section);
        }
        cur = { url: "", name: "", image: null };
        section.artists.push(cur);
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
  return sections
    .map((sec) => ({
      title: decodeEntities(sec.title.trim()),
      artists: sec.artists
        .filter((a) => (a.name ?? "").trim() || (a.url ?? "").trim())
        .map((a) => ({ url: a.url ?? "", name: decodeEntities((a.name ?? "").trim()), image: a.image ?? null })),
    }))
    .filter((sec) => sec.artists.length > 0);
}

export async function scrapePublicationReviewsPage(pageUrl: string, opts: FetchOpts = FETCH_OPTS): Promise<PublicationReview[]> {
  const res = await fetch(pageUrl, opts);
  if (!res.ok) throw new Error(`Publication reviews fetch failed: ${res.status}`);
  const html = await res.text();
  return scrapePublicationReviewsFromHtml(html);
}

export async function scrapePublicationListsPage(pageUrl: string, opts: FetchOpts = FETCH_OPTS, page = 1): Promise<ListEntry[]> {
  const url = page > 1 ? `${pageUrl.replace(/\/+$/, "")}/${page}/` : pageUrl;
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`Publication lists fetch failed: ${res.status}`);
  const entries: ListEntry[] = [];
  const alts: string[] = [];
  const st: { cur: ListEntry | null; heading: string } = { cur: null, heading: "" };
  await new HTMLRewriter()
    .on("h1", {
      text(t) {
        st.heading += t.text;
      },
    })
    .on(".criticListBlockContainer", {
      element() {
        st.cur = { url: "", title: "", publication: "", cover: null };
        entries.push(st.cur);
        alts.push("");
      },
    })
    .on(".criticListBlockContainer a", {
      element(el) {
        const href = el.getAttribute("href") ?? "";
        if (st.cur && !st.cur.url && href.includes("/list/")) st.cur.url = href.startsWith("http") ? href : BASE + href;
      },
    })
    .on(".criticListBlockImage", {
      element(el) {
        if (st.cur) {
          st.cur.cover = el.getAttribute("src") ?? null;
          // Image alt usually carries the full list title ("Pitchfork's 50 Best Albums of 2025")
          alts[alts.length - 1] = el.getAttribute("alt") ?? "";
        }
      },
    })
    .on(".criticListBlockTitle a", {
      text(t) {
        if (st.cur) st.cur.title = (st.cur.title ?? "") + t.text;
      },
    })
    .transform(res)
    .arrayBuffer();
  const pub = st.heading.replace(/'?s? Lists?$/i, "").trim() || "Unknown";
  const SMALL = new Set(["of", "the", "a", "an", "and", "in", "on", "to", "for"]);
  const deSlugify = (url: string): string | null => {
    const m = url.match(/\/list\/\d+-([^/]+)\/?$/);
    if (!m?.[1]) return null;
    const words = m[1].split(/[-_]+/).filter(Boolean);
    if (words.length < 2) return null;
    return words
      .map((w, i) => (i > 0 && SMALL.has(w.toLowerCase()) ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1)))
      .join(" ");
  };
  return entries.map((e, i) => {
    let title = (e.title ?? "").trim();
    const altText = alts[i]?.trim();
    // Year-end lists show only a year as link text — derive a fuller title from the URL slug.
    if (/^\d{4}s?$/.test(title)) title = deSlugify(e.url ?? "") ?? altText ?? title;
    else if (!title && altText) title = altText;
    return {
      url: e.url ?? "",
      title: decodeEntities(title),
      publication: decodeEntities(pub),
      cover: e.cover ?? null,
    };
  });
}

export async function scrapeCriticPage(pageUrl: string, slug: string, opts: FetchOpts = FETCH_OPTS): Promise<CriticDetail> {
  const res = await fetch(pageUrl, opts);
  if (!res.ok) throw new Error(`Critic fetch failed: ${res.status}`);
  const pageM = pageUrl.match(/\/(\d+)\/$/);
  type RawCriticReview = { album: string; albumUrl: string; artist: string; artistUrl: string; cover: string | null; score: string; text: string; publication: string; publicationUrl: string; date: string | null };
  const s = {
    name: "",
    publication: "",
    publicationUrl: "",
    reviews: [] as RawCriticReview[],
    rev: null as RawCriticReview | null,
    revTextBuf: "",
  };
  const html = await res.clone().text();
  await new HTMLRewriter()
    .on("h1.headline", {
      text(t) {
        s.name += t.text;
      },
    })
    .on(".userReviewBlock .cover a", {
      element(el) {
        const href = el.getAttribute("href") ?? "";
        if (s.rev && !s.rev.albumUrl && href.includes("/album/")) s.rev.albumUrl = href.startsWith("http") ? href : BASE + href;
      },
    })
    .on(".userReviewBlock", {
      element() {
        if (s.rev) s.rev.text = s.revTextBuf.trim();
        s.rev = { album: "", albumUrl: "", artist: "", artistUrl: "", cover: null, score: "", text: "", publication: "", publicationUrl: "", date: null };
        s.reviews.push(s.rev);
        s.revTextBuf = "";
      },
    })
    .on(".userReviewBlock .cover img", {
      element(el) {
        if (s.rev) s.rev.cover = el.getAttribute("src") ?? null;
      },
    })
    .on(".userReviewBlock .artistTitle a", {
      element(el) {
        const href = el.getAttribute("href") ?? "";
        if (s.rev && href.includes("/artist/")) s.rev.artistUrl = href.startsWith("http") ? href : BASE + href;
      },
      text(t) {
        if (s.rev) s.rev.artist = (s.rev.artist ?? "") + t.text;
      },
    })
    .on(".userReviewBlock .albumTitle a", {
      element(el) {
        const href = el.getAttribute("href") ?? "";
        if (s.rev && href.includes("/album/")) s.rev.albumUrl = href.startsWith("http") ? href : BASE + href;
      },
      text(t) {
        if (s.rev) s.rev.album = (s.rev.album ?? "") + t.text;
      },
    })
    .on(".userReviewBlock .userName a", {
      element(el) {
        const href = el.getAttribute("href") ?? "";
        if (s.rev && href.includes("/publication/")) s.rev.publicationUrl = href.startsWith("http") ? href : BASE + href;
      },
      text(t) {
        if (s.rev) s.rev.publication = (s.rev.publication ?? "") + t.text;
      },
    })
    .on(".userReviewBlock .rating", {
      text(t) {
        if (s.rev) s.rev.score = (s.rev.score ?? "") + t.text;
      },
    })
    .on(".userReviewBlock .date, .userReviewBlock .review_date", {
      element(el) {
        if (s.rev) {
          const attr = el.getAttribute("title");
          if (attr !== null) s.rev.date = attr;
        }
      },
      text(t) {
        if (s.rev && !s.rev.date) s.rev.date = (s.rev.date ?? "") + t.text;
      },
    })
    .on(".userReviewBlock .reviewText", {
      text(t) {
        s.revTextBuf += t.text;
      },
    })
    .transform(res)
    .arrayBuffer();
  if (s.rev) s.rev.text = s.revTextBuf.trim();
  const pubM = html.match(/<a href="(\/publication\/[^"]+)">([^<]+)<\/a>/);
  return {
    url: pageUrl,
    slug,
    name: decodeEntities(s.name.trim()),
    publication: pubM?.[2] ? decodeEntities(pubM[2].trim()) : null,
    publicationUrl: pubM?.[1] ? BASE + pubM[1] : null,
    page: pageM?.[1] ? parseInt(pageM[1], 10) : 1,
    reviews: s.reviews
      .filter((r) => (r.album ?? "").trim())
      .map((r) => ({
        album: decodeEntities((r.album ?? "").trim()),
        albumUrl: r.albumUrl ?? "",
        artist: decodeEntities((r.artist ?? "").trim()),
        artistUrl: r.artistUrl ?? "",
        cover: r.cover ?? null,
        score: parseScore((r.score ?? "").trim()),
        text: decodeEntities((r.text ?? "").trim()),
        publication: decodeEntities((r.publication ?? "").trim()),
        publicationUrl: r.publicationUrl ?? "",
        date: r.date ?? null,
      })),
  };
}

export async function scrapeSubGenres(genreId: string | number, opts: FetchOpts = FETCH_OPTS): Promise<{ genreId: number; heading: string; subgenres: NamedLink[] }> {
  const res = await fetch(`${BASE}/scripts/showSubGenres.php`, {
    ...opts,
    method: "POST",
    headers: { ...REQ_HEADERS, "Content-Type": "application/x-www-form-urlencoded", "X-Requested-With": "XMLHttpRequest", Referer: `${BASE}/genre.php` },
    body: `genreID=${encodeURIComponent(String(genreId))}`,
  });
  if (!res.ok) throw new Error(`Subgenres fetch failed: ${res.status}`);
  const html = await res.text();
  const headingM = html.match(/<div class="heading">[\s\S]*?<\/i>\s*([^<]+)<\/div>/);
  const heading = headingM?.[1] ? decodeEntities(headingM[1].trim()) : "";
  const subgenres: NamedLink[] = [];
  for (const m of html.matchAll(/<a href="(\/genre\/[^"]+)">([^<]+)<\/a>/g)) {
    if (m[1] && m[2]) {
      subgenres.push({
        name: decodeEntities(m[2].trim()),
        url: BASE + m[1],
      });
    }
  }
  return { genreId: parseId(genreId) ?? 0, heading, subgenres };
}

export async function scrapeGenreName(
  genreId: string | number,
  opts: FetchOpts = FETCH_OPTS,
): Promise<{ id: number; name: string }> {
  const res = await fetch(`${BASE}/scripts/getGenreName.php?id=${encodeURIComponent(String(genreId))}`, opts);
  if (!res.ok) throw new Error(`Genre name fetch failed: ${res.status}`);
  const text = (await res.text()).trim();
  return { id: parseId(genreId) ?? 0, name: decodeEntities(text) };
}

export async function scrapeGenreAutocomplete(
  query: string,
  opts: FetchOpts = FETCH_OPTS,
): Promise<GenreAutocompleteItem[]> {
  const enc = encodeURIComponent(query);
  const res = await fetch(`${BASE}/scripts/albumGenreAutocomplete.php?term=${enc}`, {
    ...opts,
    headers: {
      ...REQ_HEADERS,
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
      Referer: `${BASE}/`,
    },
  });
  if (!res.ok) throw new Error(`Genre autocomplete fetch failed: ${res.status}`);
  const data = (await res.json()) as Array<Record<string, unknown>>;
  return data.map((item) => {
    const rawLink = String(item["link"] ?? "");
    const slugM = rawLink.match(/\/genre\/([^/]+)/);
    const slug = slugM?.[1] ?? rawLink.replace(/^\/+|\/+$/g, "");
    return {
      id: parseId(item["id"]),
      name: decodeEntities(String(item["value"] ?? "").trim()),
      slug,
      url: rawLink.startsWith("http") ? rawLink : `${BASE}${rawLink.startsWith("/") ? "" : "/"}${rawLink}`,
    };
  });
}


