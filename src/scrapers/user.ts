import { BASE, FETCH_OPTS, decodeEntities, type FetchOpts } from "../constants.js";
import { scrapeAlbumBlocks } from "./albumBlock.js";
import { scrapeCommentRows } from "./commentRow.js";
import { scrapeUserListRows } from "./userListRow.js";
import { parseAlbumUserReviewRows } from "./album.js";
import type {
  AlbumBlock,
  AlbumDistributionRow,
  AlbumUserReviewsResult,
  StreamingLink,
  UserBadgeItem,
  UserDistributionResult,
  UserGenreItem,
  UserListDetail,
  UserListDetailItem,
  UserListEntry,
  UserProfile,
  UserRating,
  UserReview,
  UserReviewDetail,
  UserTagEntry,
  UserYearEndAlbum,
  UserYearEndResult,
  UserArtistRatingItem,
  UserArtistRatingsResult,
  UserAlbumTrackRatingsResult,
  UserTrackRatingEntry,
} from "../types.js";

export async function scrapeUserProfile(username: string, opts: FetchOpts = FETCH_OPTS): Promise<UserProfile> {
  const url = `${BASE}/user/${encodeURIComponent(username)}/`;
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`User fetch failed: ${res.status}`);
  const html = await res.text();
  const stats: Record<string, string> = {};
  for (const m of html.matchAll(/<div class="profileStat">([^<]*)<\/div>\s*<div class="profileStatName">([^<]*)<\/div>/g)) {
    const v = m[1];
    const k = m[2];
    if (v !== undefined && k !== undefined) {
      stats[k.trim().toLowerCase()] = v.trim();
    }
  }
  const avatarM = html.match(/<img src="([^"]+)"[^>]*alt="[^"]*"[^>]*>/) ?? html.match(/<div class="profileImage">[\s\S]{0,300}?<img src="([^"]+)"/);
  const spanM = html.match(/<h1 class="headline profile">\s*<span[^>]*>([^<]*)<\/span>/i);
  const handleM = html.match(/<h1 class="headline profile">[\s\S]*?<div[^>]*>\(([^)]+)\)<\/div>/i);
  const nameM = html.match(/<h1 class="headline profile"><span>([^<]*)<\/span><\/h1>/) ?? html.match(/<h1[^>]*>([^<]*)<\/h1>/);
  const actualUsername = handleM?.[1]?.trim() || nameM?.[1]?.trim() || username;
  const displayName = spanM?.[1] ? decodeEntities(spanM[1].trim()) : decodeEntities(actualUsername);

  const userIdM = html.match(/data-(?:user-id|item-id)="(\d+)"/);
  const userId = userIdM?.[1] ?? null;

  const memberM = html.match(/Member since\s+([^<]+)/i);
  const memberSince = memberM?.[1] ? decodeEntities(memberM[1].trim()) : null;

  const yelMatches = [...html.matchAll(/\/year-end\/[^/]+\/(\d{4})\//g)];
  const yearEndLists = [...new Set(yelMatches.map((m) => (m[1] ? parseInt(m[1], 10) : 0)).filter((y) => y > 0))].sort((a, b) => b - a);

  let pinnedReview: UserReview | null = null;
  const pinnedIdx = html.indexOf("Pinned Review");
  if (pinnedIdx !== -1) {
    const endPinned = html.indexOf("<h2 class=\"sectionHeading\">", pinnedIdx + 20);
    const chunk = html.slice(pinnedIdx, endPinned !== -1 ? endPinned : pinnedIdx + 3000);
    const parsed = parseAlbumUserReviewRows(chunk);
    if (parsed.length > 0) pinnedReview = parsed[0] ?? null;
  }

  const bioM = html.match(/<div class="aboutUser">([\s\S]*?)<\/div>/);
  const locM = html.match(/<div class="profileLocation">([\s\S]*?)<\/div>/);
  const links: Array<{ name: string; url: string }> = [];
  for (const m of html.matchAll(/<div class="profileLink">[\s\S]*?<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)) {
    const u = m[1];
    const n = m[2];
    if (u && n !== undefined) {
      links.push({
        url: u,
        name: decodeEntities(n.replace(/<[^>]+>/g, "").trim()),
      });
    }
  }

  const subscriber = html.includes("donorBanner") || /class="[^"]*subscriber[^"]*"/i.test(html);

  const ratingDistribution: Array<{ label: string; count: number }> = [];
  for (const row of html.matchAll(/<tr class="distRow">([\s\S]*?)<\/tr>/g)) {
    const rowHtml = row[1];
    if (!rowHtml) continue;
    const mLabel = rowHtml.match(/<td class="distLabel">([\s\S]*?)<\/td>/);
    const mCount = rowHtml.match(/<td class="distCount">([\s\S]*?)<\/td>/);
    const label = mLabel?.[1] ? decodeEntities(mLabel[1].replace(/<[^>]+>/g, "").trim()) : "";
    const countStr = mCount?.[1] ? mCount[1].replace(/<[^>]+>/g, "").replace(/,/g, "").trim() : "";
    if (label) {
      ratingDistribution.push({
        label,
        count: countStr ? parseInt(countStr, 10) || 0 : 0,
      });
    }
  }

  let favorites: AlbumBlock[] = [];
  const favBlockM = html.match(/<div id="favBlock"[^>]*>([\s\S]*?)<\/section>/);
  if (favBlockM?.[1]) {
    const favRes = new Response(favBlockM[1]);
    favorites = await scrapeAlbumBlocks(favRes);
  }

  return {
    url,
    username: actualUsername,
    displayName,
    userId,
    memberSince,
    avatar: avatarM?.[1] ?? null,
    bio: bioM?.[1] ? decodeEntities(bioM[1].replace(/<[^>]+>/g, "").trim()) : null,
    location: locM?.[1] ? decodeEntities(locM[1].replace(/<[^>]+>/g, "").trim()) : null,
    links,
    subscriber,
    ratingDistribution,
    favorites,
    pinnedReview,
    yearEndLists,
    stats: {
      ratings: stats["ratings"] ?? "0",
      reviews: stats["reviews"] ?? "0",
      lists: stats["lists"] ?? "0",
      followers: stats["followers"] ?? "0",
      following: stats["following"] ?? "0",
    },
  };
}

export async function scrapeUserRatings(
  username: string,
  opts: FetchOpts = FETCH_OPTS,
  params: { page?: number; type?: string | null; decade?: string | null; sort?: string | null; year?: string | null; genreId?: string | null } = {},
): Promise<{ username: string; page: number; type: string | null; decade: string | null; sort: string | null; year?: string | null; genreId?: string | null; ratings: UserRating[] }> {
  const { page = 1, type = null, decade = null, sort = null, year = null, genreId = null } = params;
  let url = `${BASE}/user/${encodeURIComponent(username)}/ratings/`;
  if (type === "perfect" || sort === "perfect") {
    url += "perfect/";
  } else {
    if (type) url += `${encodeURIComponent(type)}/`;
    if (sort) url += `${encodeURIComponent(sort)}/`;
  }
  if (page > 1) url += `${page}/`;
  const queryParams = new URLSearchParams();
  if (decade) queryParams.set("d", decade);
  if (year) queryParams.set("y", year);
  if (genreId) queryParams.set("genreID", genreId);
  const qs = queryParams.toString();
  if (qs) url += `?${qs}`;
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`User ratings fetch failed: ${res.status}`);
  const ratings = await scrapeUserAlbumBlocks(res, username);
  return { username, page, type, decade, sort, year, genreId, ratings };
}

export async function scrapeUserListened(
  username: string,
  page: number,
  opts: FetchOpts = FETCH_OPTS,
): Promise<{ username: string; page: number; ratings: UserRating[] }> {
  const url = page > 1
    ? `${BASE}/user/${encodeURIComponent(username)}/listened/${page}/`
    : `${BASE}/user/${encodeURIComponent(username)}/listened/`;
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`User listened fetch failed: ${res.status}`);
  return { username, page, ratings: await scrapeUserAlbumBlocks(res, username) };
}

export async function scrapeUserLibrary(
  username: string,
  opts: FetchOpts = FETCH_OPTS,
  params: { show?: string | null; sort?: string | null; page?: number } = {},
): Promise<{ username: string; show: string | null; sort: string | null; page: number; ratings: UserRating[] }> {
  const { show = null, sort = null, page = 1 } = params;
  const qp = new URLSearchParams();
  if (show) qp.set("t", show);
  if (sort) qp.set("s", sort);
  if (page > 1) qp.set("p", String(page));
  const qs = qp.toString();
  const url = `${BASE}/user/${encodeURIComponent(username)}/library/${qs ? `?${qs}` : ""}`;
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`User library fetch failed: ${res.status}`);
  return { username, show, sort, page, ratings: await scrapeUserAlbumBlocks(res, username) };
}

export async function scrapeUserLikedAlbums(
  username: string,
  page: number,
  opts: FetchOpts = FETCH_OPTS,
): Promise<{ username: string; page: number; ratings: UserRating[] }> {
  const url = page > 1
    ? `${BASE}/user/${encodeURIComponent(username)}/liked/albums/${page}/`
    : `${BASE}/user/${encodeURIComponent(username)}/liked/albums/`;
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`User liked albums fetch failed: ${res.status}`);
  return { username, page, ratings: await scrapeUserAlbumBlocks(res, username) };
}

export async function scrapeUserTags(
  username: string,
  scope: string,
  sort: string | null,
  opts: FetchOpts = FETCH_OPTS,
): Promise<{ username: string; scope: string; sort: string | null; tags: UserTagEntry[] }> {
  const tab = scope === "artists" ? "/artists/" : "/";
  const url = `${BASE}/user/${encodeURIComponent(username)}/tags${tab}${sort ? `?s=${encodeURIComponent(sort)}` : ""}`;
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`User tags fetch failed: ${res.status}`);
  const tags: UserTagEntry[] = [];
  const st: { cur: UserTagEntry | null; countBuf: string } = { cur: null, countBuf: "" };
  await new HTMLRewriter()
    .on(".tagColumn > div", {
      element() {
        st.cur = { tag: "", url: "", count: "" };
        tags.push(st.cur);
        st.countBuf = "";
      },
      text(t) {
        st.countBuf += t.text;
      },
    })
    .on(".tagColumn .tag a", {
      element(el) {
        const href = el.getAttribute("href") ?? "";
        if (st.cur && !st.cur.url && href) st.cur.url = href.startsWith("http") ? href : BASE + href;
      },
      text(t) {
        if (st.cur) st.cur.tag = (st.cur.tag ?? "") + t.text;
      },
    })
    .transform(res)
    .arrayBuffer();
  // Counts render as sibling spans; recover them in document order via regex.
  const html = await (await fetch(url, opts)).text();
  const counts = [...html.matchAll(/<span style="font-size: 12px; float:right;[^"]*">([^<]*)<\/span>/g)].flatMap((m) => m[1] !== undefined ? [m[1].trim()] : []);
  return {
    username,
    scope,
    sort,
    tags: tags.map((tg, i) => ({
      tag: decodeEntities((tg.tag ?? "").trim()),
      url: tg.url ?? "",
      count: counts[i] ?? (tg.count ?? ""),
    })),
  };
}

export async function scrapeUserTagDetail(
  username: string,
  tag: string,
  sort: string | null,
  opts: FetchOpts = FETCH_OPTS,
  page = 1,
): Promise<{ username: string; tag: string; sort: string | null; page: number; ratings: UserRating[] }> {
  let url = `${BASE}/user/${encodeURIComponent(username)}/tag/${encodeURIComponent(tag)}/`;
  if (page > 1) url += `${page}/`;
  if (sort) url += `?s=${encodeURIComponent(sort)}`;
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`User tag fetch failed: ${res.status}`);
  return { username, tag, sort, page, ratings: await scrapeUserAlbumBlocks(res, username) };
}

async function scrapeUserAlbumBlocks(res: Response, username: string): Promise<UserRating[]> {
  const ratings: UserRating[] = [];
  let cur: UserRating | null = null;
  let ratingValue = "";
  let lastRatingType: "critic" | "user" | null = null;
  let inRatingRow = false;
  await new HTMLRewriter()
    .on(".albumBlock", {
      element(el) {
        cur = { url: "", artist: "", title: "", cover: "", mediaType: el.getAttribute("data-type") ?? "", releaseDate: "", criticScore: null, criticCount: null, userScore: null, userCount: null, mustHear: false, userRating: null, ratedDate: null, reviewUrl: null };
        ratings.push(cur);
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
    .on(".albumBlock .type.functions", {
      text(t) {
        if (cur) cur.releaseDate = (cur.releaseDate ?? "") + t.text;
      },
    })
    .on(".albumBlock .ratingRow", {
      element() {
        ratingValue = "";
        inRatingRow = true;
      },
      text(t) {
        void t;
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
        } else if (inRatingRow && cur) {
          // User ratings pages show the user's own rating + date without labels.
          if (!cur.userRating && ratingValue.trim()) cur.userRating = ratingValue.trim();
          if (!cur.ratedDate && /[a-z]{3}\s+\d/i.test(text)) cur.ratedDate = t.text.trim();
        }
      },
    })
    .on(".albumBlock a[href*='/album/']", {
      element(el) {
        const href = el.getAttribute("href") ?? "";
        if (cur && href.includes(`/user/${username}/album/`) && !cur.reviewUrl) cur.reviewUrl = href.startsWith("http") ? href : BASE + href;
      },
    })
    .transform(res)
    .arrayBuffer();
  void inRatingRow;

  return ratings.map((r) => ({
    ...r,
    artist: decodeEntities(r.artist.trim()),
    title: decodeEntities(r.title.trim()),
    releaseDate: r.releaseDate.replace(/\s+/g, " ").trim(),
  }));
}

export async function scrapeFollowList(
  username: string,
  kind: "followers" | "following",
  page: number,
  opts: FetchOpts = FETCH_OPTS,
): Promise<{ username: string; kind: string; page: number; users: import("../types.js").SearchArtist[] }> {
  const base = `${BASE}/user/${encodeURIComponent(username)}/${kind}/`;
  const url = page > 1 ? `${base}${page}/` : base;
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`User ${kind} fetch failed: ${res.status}`);
  const users: import("../types.js").SearchArtist[] = [];
  const st: { cur: Partial<import("../types.js").SearchArtist> | null } = { cur: null };
  await new HTMLRewriter()
    .on(".listRow.users", {
      element() {
        st.cur = { url: "", name: "", image: null };
        users.push(st.cur as import("../types.js").SearchArtist);
      },
    })
    .on(".listRow.users a[href*='/user/']", {
      element(el) {
        const href = el.getAttribute("href") ?? "";
        if (st.cur && !st.cur.url && /^\/user\/[^/]+\/$/.test(href)) st.cur.url = BASE + href;
      },
    })
    .on(".listRow.users .profilePic img", {
      element(el) {
        if (st.cur) st.cur.image = el.getAttribute("src") ?? null;
      },
    })
    .on(".listRow.users .userName", {
      text(t) {
        if (st.cur) st.cur.name = (st.cur.name ?? "") + t.text;
      },
    })
    .transform(res)
    .arrayBuffer();
  return {
    username,
    kind,
    page,
    users: users
      .filter((u) => (u.url ?? "").trim())
      .map((u) => ({ url: u.url ?? "", name: decodeEntities((u.name ?? "").trim()), image: u.image ?? null })),
  };
}

export async function scrapeUserReviewBlocks(res: Response): Promise<UserReview[]> {
  const reviews: UserReview[] = [];
  const st: { cur: UserReview | null; textBuf: string; linkKind: "artist" | "album" | "user" | "review" | null } = { cur: null, textBuf: "", linkKind: null };
  await new HTMLRewriter()
    .on(".userReviewBlock", {
      element() {
        if (st.cur) st.cur.text = st.textBuf.trim();
        st.cur = { url: "", artist: "", artistUrl: "", album: "", albumUrl: "", cover: null, username: "", userUrl: "", avatar: null, rating: null, text: "", likes: "", comments: "", date: null };
        reviews.push(st.cur);
        st.textBuf = "";
        st.linkKind = null;
      },
    })
    .on(".userReviewBlock .cover a", {
      element(el) {
        const href = el.getAttribute("href") ?? "";
        if (st.cur && !st.cur.url && href) st.cur.url = href.startsWith("http") ? href : BASE + href;
      },
    })
    .on(".userReviewBlock .cover img", {
      element(el) {
        if (st.cur) st.cur.cover = el.getAttribute("src") ?? null;
      },
    })
    .on(".userReviewBlock .artistTitle a", {
      element(el) {
        const href = el.getAttribute("href") ?? "";
        if (st.cur && href.includes("/artist/")) {
          st.linkKind = "artist";
          st.cur.artistUrl = href.startsWith("http") ? href : BASE + href;
        }
      },
      text(t) {
        if (st.cur && st.linkKind === "artist") st.cur.artist = (st.cur.artist ?? "") + t.text;
      },
    })
    .on(".userReviewBlock .albumTitle a", {
      element(el) {
        const href = el.getAttribute("href") ?? "";
        if (st.cur && href.includes("/album/")) {
          st.linkKind = "album";
          st.cur.albumUrl = href.startsWith("http") ? href : BASE + href;
        }
      },
      text(t) {
        if (st.cur && st.linkKind === "album") st.cur.album = (st.cur.album ?? "") + t.text;
      },
    })
    .on(".userReviewBlock .profilePic a", {
      element(el) {
        const href = el.getAttribute("href") ?? "";
        if (st.cur && !st.cur.userUrl && href.includes("/user/")) st.cur.userUrl = href.startsWith("http") ? href : BASE + href;
      },
    })
    .on(".userReviewBlock .profilePic img", {
      element(el) {
        if (st.cur) st.cur.avatar = el.getAttribute("src") ?? null;
      },
    })
    .on(".userReviewBlock .userName a", {
      element(el) {
        const href = el.getAttribute("href") ?? "";
        if (st.cur && href.includes("/user/")) {
          st.linkKind = "user";
          if (!st.cur.userUrl) st.cur.userUrl = href.startsWith("http") ? href : BASE + href;
        }
      },
      text(t) {
        if (st.cur && st.linkKind === "user") st.cur.username = (st.cur.username ?? "") + t.text;
      },
    })
    .on(".userReviewBlock .rating", {
      text(t) {
        if (st.cur) st.cur.rating = ((st.cur.rating ?? "") as string) + t.text;
      },
    })
    .on(".userReviewBlock .reviewText", {
      text(t) {
        st.textBuf += t.text;
      },
    })
    .on(".userReviewBlock .review_likes", {
      text(t) {
        if (st.cur) st.cur.likes = (st.cur.likes ?? "") + t.text;
      },
    })
    .on(".userReviewBlock .review_comments, .userReviewBlock .comment_count", {
      text(t) {
        if (st.cur) st.cur.comments = (st.cur.comments ?? "") + t.text;
      },
    })
    .on(".userReviewBlock .review_date", {
      element(el) {
        if (st.cur) {
          const attr = el.getAttribute("title");
          if (attr !== null) st.cur.date = attr;
        }
      },
      text(t) {
        if (st.cur && !st.cur.date) st.cur.date = (st.cur.date ?? "") + t.text;
      },
    })
    .transform(res)
    .arrayBuffer();
  if (st.cur) st.cur.text = st.textBuf.trim();
  return reviews
    .filter((r) => (r.album ?? "").trim() || (r.text ?? "").trim())
    .map((r) => ({
      url: r.url ?? "",
      artist: decodeEntities((r.artist ?? "").trim()),
      artistUrl: r.artistUrl ?? "",
      album: decodeEntities((r.album ?? "").trim()),
      albumUrl: r.albumUrl ?? "",
      cover: r.cover ?? null,
      username: decodeEntities((r.username ?? "").trim()),
      userUrl: r.userUrl ?? "",
      avatar: r.avatar ?? null,
      rating: (r.rating ?? "").trim() || null,
      text: decodeEntities((r.text ?? "").trim()),
      likes: (r.likes ?? "").trim() || "0",
      comments: (r.comments ?? "").trim() || "0",
      date: (r.date ?? "").trim() || null,
    }));
}

export async function scrapeUserReviewsPage(username: string, page: number, sort: string, opts: FetchOpts = FETCH_OPTS): Promise<{ username: string; page: number; sort: string; reviews: UserReview[] }> {
  const base = username === "-" ? `${BASE}/user-reviews/${sort}/` : `${BASE}/user/${encodeURIComponent(username)}/reviews/`;
  const url = page > 1 ? `${base}${page}/` : base;
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`User reviews fetch failed: ${res.status}`);
  // Global /user-reviews/ pages use .userReviewBlock, per-user pages use .albumReviewRow.
  if (username === "-") return { username, page, sort, reviews: await scrapeUserReviewBlocks(res) };
  return { username, page, sort, reviews: await scrapeAlbumReviewRows(res, username) };
}

async function scrapeAlbumReviewRows(res: Response, fallbackUsername: string | null): Promise<UserReview[]> {
  // Handles both `.albumReviewRow` variants:
  // - album page: reviewer avatar/name, no artist/album links
  // - user page: artist/album links, review url, cover
  const reviews: UserReview[] = [];
  const st: { cur: UserReview | null; textBuf: string } = { cur: null, textBuf: "" };
  await new HTMLRewriter()
    .on(".albumReviewRow", {
      element() {
        if (st.cur) st.cur.text = st.textBuf.trim();
        st.cur = { url: "", artist: "", artistUrl: "", album: "", albumUrl: "", cover: null, username: fallbackUsername ?? "", userUrl: "", avatar: null, rating: null, text: "", likes: "", comments: "", date: null };
        reviews.push(st.cur);
        st.textBuf = "";
      },
    })
    .on(".albumReviewRow .userReviewImage a", {
      element(el) {
        const href = el.getAttribute("href") ?? "";
        if (!st.cur) return;
        if (href.includes("/album/") && !st.cur.url) {
          st.cur.url = href.startsWith("http") ? href : BASE + href;
          const um = href.match(/\/user\/([^/]+)\//);
          if (um && !st.cur.userUrl) st.cur.userUrl = `${BASE}/user/${um[1]}/`;
        } else if (!st.cur.userUrl && href.includes("/user/")) {
          st.cur.userUrl = href.startsWith("http") ? href : BASE + href;
        }
      },
    })
    .on(".albumReviewRow .userReviewImage img", {
      element(el) {
        if (!st.cur) return;
        const src = el.getAttribute("src") ?? null;
        if (st.cur.url) {
          if (!st.cur.cover) st.cur.cover = src;
        } else if (!st.cur.avatar) {
          st.cur.avatar = src;
        }
      },
    })
    .on(".albumReviewRow .userReviewName a", {
      element(el) {
        const href = el.getAttribute("href") ?? "";
        if (st.cur && href.includes("/user/")) {
          if (!st.cur.userUrl) st.cur.userUrl = href.startsWith("http") ? href : BASE + href;
        }
      },
      text(t) {
        if (st.cur) st.cur.username = (st.cur.username ?? "") + t.text;
      },
    })
    .on(".albumReviewRow .artistTitle a", {
      element(el) {
        const href = el.getAttribute("href") ?? "";
        if (st.cur && href.includes("/artist/")) st.cur.artistUrl = href.startsWith("http") ? href : BASE + href;
      },
      text(t) {
        if (st.cur) st.cur.artist = (st.cur.artist ?? "") + t.text;
      },
    })
    .on(".albumReviewRow .albumTitle a", {
      element(el) {
        const href = el.getAttribute("href") ?? "";
        if (st.cur && href.includes("/album/") && !st.cur.albumUrl) st.cur.albumUrl = href.startsWith("http") ? href : BASE + href;
      },
      text(t) {
        if (st.cur) {
          if (/^\d{4}$/.test(t.text.trim())) return;
          st.cur.album = (st.cur.album ?? "") + t.text;
        }
      },
    })
    .on(".albumReviewRow .rating", {
      text(t) {
        if (st.cur) st.cur.rating = ((st.cur.rating ?? "") as string) + t.text;
      },
    })
    .on(".albumReviewRow .albumReviewText", {
      text(t) {
        st.textBuf += t.text;
      },
    })
    .on(".albumReviewRow .albumReviewText a", {
      element(el) {
        const href = el.getAttribute("href") ?? "";
        if (st.cur && href.includes("/user/") && href.includes("/album/") && !st.cur.url)
          st.cur.url = href.startsWith("http") ? href : BASE + href;
      },
    })
    .on(".albumReviewRow .review_likes", {
      text(t) {
        if (st.cur) st.cur.likes = (st.cur.likes ?? "") + t.text;
      },
    })
    .on(".albumReviewRow .review_comments", {
      text(t) {
        if (st.cur) st.cur.comments = (st.cur.comments ?? "") + t.text;
      },
    })
    .on(".albumReviewRow .review_date", {
      text(t) {
        if (st.cur) st.cur.date = ((st.cur.date ?? "") as string) + t.text;
      },
    })
    .on(".albumReviewRow .actionContainer[title]", {
      element(el) {
        if (st.cur) {
          const attr = el.getAttribute("title");
          if (attr !== null) st.cur.date = attr;
        }
      },
    })
    .transform(res)
    .arrayBuffer();
  if (st.cur) st.cur.text = st.textBuf.trim();
  return reviews
    .filter((r) => (r.username ?? "").trim())
    .map((r) => ({
      url: r.url ?? "",
      artist: decodeEntities((r.artist ?? "").trim()),
      artistUrl: r.artistUrl ?? "",
      album: decodeEntities((r.album ?? "").trim()),
      albumUrl: r.albumUrl ?? "",
      cover: r.cover ?? null,
      username: decodeEntities((r.username ?? "").trim()),
      userUrl: r.userUrl ?? "",
      avatar: r.avatar ?? null,
      rating: (r.rating ?? "").trim() || null,
      text: decodeEntities((r.text ?? "").replace(/read more\s*$/i, "").trim()),
      likes: (r.likes ?? "").trim() || "0",
      comments: (r.comments ?? "").trim() || "0",
      date: (r.date ?? "").trim() || null,
    }));
}

export async function scrapeAlbumUserReviews(
  albumSlug: string,
  sort: string,
  page: number,
  opts: FetchOpts = FETCH_OPTS,
  type = "reviews",
): Promise<AlbumUserReviewsResult> {
  const sortParam = sort === "recent" ? "recent" : sort === "worst" ? "worst" : "best";
  const params = new URLSearchParams({ sort: sortParam });
  if (type === "ratings") params.set("type", "ratings");
  if (page > 1) params.set("p", String(page));
  const res = await fetch(`${BASE}/album/${albumSlug}/user-reviews/?${params}`, opts);
  if (!res.ok) throw new Error(`Album user reviews fetch failed: ${res.status}`);
  const html = await res.text();

  const likePctM = html.match(/<strong[^>]*>(\d+%)<\/strong>\s*(?:of users )?like this album/i);
  const dislikePctM = html.match(/<strong[^>]*>(\d+%)<\/strong>\s*(?:of users )?don't like this album/i);
  const totalRatingsM = html.match(/showing \d+\s*-\s*\d+\s*of\s*([\d,]+)\s*user reviews/i)
    ?? html.match(/User Score\s*\(([\d,]+)\)/i);

  const distribution: AlbumDistributionRow[] = [];
  for (const row of html.matchAll(/<tr class="distRow">([\s\S]*?)<\/tr>/g)) {
    const rowHtml = row[1];
    if (!rowHtml) continue;
    const mLabel = rowHtml.match(/<td class="distLabel">([\s\S]*?)<\/td>/);
    const mCount = rowHtml.match(/<td class="distCount">([\s\S]*?)<\/td>/);
    const mBar = rowHtml.match(/width:\s*([\d.]+%)/);
    const label = mLabel?.[1] ? decodeEntities(mLabel[1].replace(/<[^>]+>/g, "").trim()) : "";
    const countStr = mCount?.[1] ? mCount[1].replace(/<[^>]+>/g, "").replace(/,/g, "").trim() : "";
    if (label) {
      distribution.push({
        label,
        count: countStr ? parseInt(countStr, 10) || 0 : 0,
        percentage: mBar?.[1] ?? null,
      });
    }
  }

  const reviews = await scrapeAlbumReviewRows(new Response(html), null);
  return {
    slug: albumSlug,
    sort,
    type,
    page,
    totalRatings: totalRatingsM?.[1]?.replace(/,/g, "") ?? null,
    likePercentage: likePctM?.[1] ?? null,
    dislikePercentage: dislikePctM?.[1] ?? null,
    distribution,
    reviews,
  };
}

export async function scrapeUserReviewDetail(username: string, slug: string, opts: FetchOpts = FETCH_OPTS): Promise<UserReviewDetail> {
  const url = `${BASE}/user/${encodeURIComponent(username)}/album/${slug}/`;
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`User review fetch failed: ${res.status}`);
  const html = await res.text();
  const idM = slug.match(/^(\d+)/);
  const s = {
    artist: "",
    artistUrl: "",
    album: "",
    albumUrl: "",
    cover: null as string | null,
    avatar: null as string | null,
    rating: "",
    text: "",
    likes: "",
    date: "",
    dateExact: "",
    tracks: [] as import("../types.js").TrackRating[],
    track: null as Partial<import("../types.js").TrackRating> | null,
  };
  await new HTMLRewriter()
    .on("h2.artist a", {
      element(el) {
        const href = el.getAttribute("href") ?? "";
        if (href.includes("/artist/")) s.artistUrl = href.startsWith("http") ? href : BASE + href;
      },
      text(t) {
        s.artist += t.text;
      },
    })
    .on("h1.albumTitle a", {
      element(el) {
        const href = el.getAttribute("href") ?? "";
        if (href.includes("/album/")) s.albumUrl = href.startsWith("http") ? href : BASE + href;
      },
      text(t) {
        s.album += t.text;
      },
    })
    .on(".userReviewHeader .cover img", {
      element(el) {
        if (!s.cover) s.cover = el.getAttribute("src") ?? null;
      },
    })
    .on(".userReviewByline .image img", {
      element(el) {
        if (!s.avatar) s.avatar = el.getAttribute("src") ?? null;
      },
    })
    .on(".userReviewScoreBox .albumCriticScore", {
      text(t) {
        s.rating += t.text;
      },
    })
    .on(".userReviewText", {
      text(t) {
        s.text += t.text;
      },
    })
    .on(".review_likes", {
      text(t) {
        s.likes += t.text;
      },
    })
    .on(".reviewDate span", {
      element(el) {
        s.dateExact = el.getAttribute("title") ?? "";
      },
      text(t) {
        s.date += t.text;
      },
    })
    .on(".trackListTable tr", {
      element() {
        s.track = { number: null, title: "", url: "", rating: null };
        s.tracks.push(s.track as import("../types.js").TrackRating);
      },
    })
    .on(".trackListTable .trackNumber", {
      text(t) {
        if (s.track) s.track.number = ((s.track.number ?? "") as string) + t.text;
      },
    })
    .on(".trackListTable .trackTitle a", {
      element(el) {
        const href = el.getAttribute("href") ?? "";
        if (s.track && !s.track.url && href.includes("/song/")) s.track.url = href.startsWith("http") ? href : BASE + href;
      },
      text(t) {
        if (s.track) s.track.title = (s.track.title ?? "") + t.text;
      },
    })
    .on(".trackListTable .trackTitle span", {
      text(t) {
        const v = t.text.trim();
        if (s.track && /^\d+$/.test(v)) s.track.rating = v;
      },
    })
    .transform(new Response(html))
    .arrayBuffer();

  const commentsCountM = html.match(/<div class="comment_count">(\d+)<\/div>/)
    ?? html.match(/class="commentButton[^"]*">[^<]*Comments \((\d+)\)/i);
  const commentsCount = commentsCountM?.[1] ?? "0";

  const streamingLinks: StreamingLink[] = [];
  const linksIdx = html.indexOf('class="albumListLinks');
  if (linksIdx !== -1) {
    const linksChunk = html.slice(linksIdx, linksIdx + 2000);
    for (const link of linksChunk.matchAll(/<a [^>]*href="([^"]+)"[^>]*>\s*<div>([^<]+)<\/div>\s*<\/a>/g)) {
      if (link[1] && link[2]) {
        streamingLinks.push({ platform: decodeEntities(link[2].trim()), url: link[1] });
      }
    }
  }

  const prevM = html.match(/«[\s\S]*?<a [^>]*href="([^"]*\/user\/[^"]*\/album\/[^"]*)"\s*title="([^"]*)"/i);
  const nextM = html.match(/»[\s\S]*?<a [^>]*href="([^"]*\/user\/[^"]*\/album\/[^"]*)"\s*title="([^"]*)"/i);
  const prevCoverM = html.match(/«[\s\S]*?<img [^>]*src="([^"]+)"/i);
  const nextCoverM = html.match(/»[\s\S]*?<img [^>]*src="([^"]+)"/i);

  const previousReview = prevM?.[1]
    ? {
        title: decodeEntities((prevM[2] ?? "").trim()),
        url: prevM[1].startsWith("http") ? prevM[1] : BASE + prevM[1],
        cover: prevCoverM?.[1] ?? null,
      }
    : null;

  const nextReview = nextM?.[1]
    ? {
        title: decodeEntities((nextM[2] ?? "").trim()),
        url: nextM[1].startsWith("http") ? nextM[1] : BASE + nextM[1],
        cover: nextCoverM?.[1] ?? null,
      }
    : null;

  const commentsList = await scrapeCommentRows(new Response(html));

  return {
    url,
    artist: decodeEntities(s.artist.trim()),
    artistUrl: s.artistUrl,
    album: decodeEntities(s.album.trim()),
    albumUrl: s.albumUrl,
    cover: s.cover,
    username,
    userUrl: `${BASE}/user/${encodeURIComponent(username)}/`,
    avatar: s.avatar,
    rating: s.rating.trim() || null,
    text: decodeEntities(s.text.trim()),
    likes: s.likes.trim() || "0",
    comments: commentsCount,
    commentsList,
    streamingLinks,
    previousReview,
    nextReview,
    date: s.dateExact || s.date.trim() || null,
    albumId: idM?.[1] ?? null,
    trackRatings: s.tracks
      .filter((t) => (t.title ?? "").trim())
      .map((t) => ({
        number: (t.number ?? "").trim() || null,
        title: decodeEntities((t.title ?? "").trim()),
        url: t.url ?? "",
        rating: t.rating ?? null,
      })),
  };
}

export async function scrapeUserLists(username: string, opts: FetchOpts = FETCH_OPTS, page = 1): Promise<{ username: string; page: number; lists: UserListEntry[] }> {
  const url = page > 1 ? `${BASE}/user/${encodeURIComponent(username)}/lists/${page}/` : `${BASE}/user/${encodeURIComponent(username)}/lists/`;
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`User lists fetch failed: ${res.status}`);
  return { username, page, lists: await scrapeUserListRows(res) };
}

export async function scrapeUserListsIndex(opts: FetchOpts = FETCH_OPTS, page = 1): Promise<UserListEntry[]> {
  const url = page > 1 ? `${BASE}/lists/users/${page}/` : `${BASE}/lists/users/`;
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`User lists index fetch failed: ${res.status}`);
  return scrapeUserListRows(res);
}

export async function scrapeSearchLists(query: string, opts: FetchOpts = FETCH_OPTS, page = 1): Promise<{ query: string; page: number; lists: UserListEntry[] }> {
  const p = page > 1 ? `&p=${page}` : "";
  const res = await fetch(`${BASE}/search/lists/?q=${encodeURIComponent(query)}${p}`, opts);
  if (!res.ok) throw new Error(`List search failed: ${res.status}`);
  return { query, page, lists: await scrapeUserListRows(res) };
}

export async function scrapeUserListDetail(
  username: string,
  slug: string,
  opts: FetchOpts = FETCH_OPTS,
  params: { sort?: string | null; page?: number } = {},
): Promise<UserListDetail> {
  // slug is like "4445/mu-essentials" or full "list/4445/mu-essentials"
  const { sort = null, page = 1 } = params;
  const path = slug.startsWith("list/") ? slug : `list/${slug}`;
  let url = `${BASE}/user/${encodeURIComponent(username)}/${path}/`;
  if (page > 1) url += `${page}/`;
  if (sort) url += `?sort=${encodeURIComponent(sort)}`;
  const [detailRes, commentsRes] = await Promise.all([fetch(url, opts), fetch(url, opts)]);
  if (!detailRes.ok) throw new Error(`User list fetch failed: ${detailRes.status}`);
  if (!commentsRes.ok) throw new Error(`User list fetch failed: ${commentsRes.status}`);
  const s = { title: "", description: "", items: [] as UserListDetailItem[], cur: null as UserListDetailItem | null };
  const html = await detailRes.clone().text();
  await new HTMLRewriter()
    .on(".listHeader h1.headline, h1.headline", {
      text(t) {
        s.title += t.text;
      },
    })
    .on(".userListRow", {
      element() {
        s.cur = { rank: "", artist: "", artistUrl: "", title: "", url: "", cover: null, year: null };
        if (s.cur) s.items.push(s.cur);
      },
    })
    .on(".userListRow .rank", {
      text(t) {
        if (s.cur) s.cur.rank = (s.cur.rank ?? "") + t.text;
      },
    })
    .on(".userListRow .userCover a", {
      element(el) {
        const href = el.getAttribute("href") ?? "";
        if (s.cur && !s.cur.url && href.includes("/album/")) s.cur.url = href.startsWith("http") ? href : BASE + href;
      },
    })
    .on(".userListRow .userCover img", {
      element(el) {
        if (s.cur) s.cur.cover = el.getAttribute("src") ?? null;
      },
    })
    .on(".userListRow .artistName a", {
      element(el) {
        const href = el.getAttribute("href") ?? "";
        if (s.cur && href.includes("/artist/")) s.cur.artistUrl = href.startsWith("http") ? href : BASE + href;
      },
      text(t) {
        if (s.cur) s.cur.artist = (s.cur.artist ?? "") + t.text;
      },
    })
    .on(".userListRow .albumTitle a", {
      element(el) {
        const href = el.getAttribute("href") ?? "";
        if (s.cur && href.includes("/album/")) {
          if (!s.cur.url) s.cur.url = href.startsWith("http") ? href : BASE + href;
        } else if (s.cur && href.includes("/releases/") && !s.cur.year) {
          const ym = href.match(/\/(\d{4})\//);
          if (ym?.[1]) s.cur.year = ym[1];
        }
      },
      text(t) {
        if (s.cur) {
          // year link text is numeric; album link text is the title
          if (/^\d{4}$/.test(t.text.trim())) {
            if (!s.cur.year) s.cur.year = t.text.trim();
          } else {
            s.cur.title = (s.cur.title ?? "") + t.text;
          }
        }
      },
    })
    .transform(detailRes)
    .arrayBuffer();
  const descM = html.match(/<div class="listDescription">([\s\S]*?)<\/div>/);
  const comments = await scrapeCommentRows(commentsRes);
  return {
    url,
    title: decodeEntities(s.title.trim()),
    username,
    description: descM?.[1] ? decodeEntities(descM[1].replace(/<[^>]+>/g, "").trim()) : null,
    items: s.items.map((i, idx) => ({
      rank: (i.rank ?? "").replace(".", "").trim() || String(idx + 1),
      artist: decodeEntities((i.artist ?? "").trim()),
      artistUrl: i.artistUrl ?? "",
      title: decodeEntities((i.title ?? "").trim()),
      url: i.url ?? "",
      cover: i.cover ?? null,
      year: i.year ?? null,
    })),
    comments,
  };
}

export async function scrapeUsersCommunity(opts: FetchOpts = FETCH_OPTS): Promise<{ reviews: UserReview[]; lists: UserListEntry[] }> {
  const [reviewsRes, listsRes] = await Promise.all([fetch(`${BASE}/users/`, opts), fetch(`${BASE}/users/`, opts)]);
  if (!reviewsRes.ok || !listsRes.ok) throw new Error("Community fetch failed");
  const [reviews, lists] = await Promise.all([scrapeUserReviewBlocks(reviewsRes), scrapeUserListRows(listsRes)]);
  return { reviews, lists };
}

export async function scrapeUserGenres(
  username: string,
  opts: FetchOpts = FETCH_OPTS,
): Promise<{ username: string; genres: UserGenreItem[] }> {
  const url = `${BASE}/user/${encodeURIComponent(username)}/genres/`;
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`User genres fetch failed: ${res.status}`);

  const genres: UserGenreItem[] = [];
  const st: { cur: Partial<UserGenreItem> | null } = { cur: null };

  await new HTMLRewriter()
    .on(".genreRow, tr.genreRow, .genreBlock, tr", {
      element() {
        st.cur = { name: "", url: "", count: null, percentage: null, averageScore: null };
      },
    })
    .on("a[href*='/genre/']", {
      element(el) {
        if (st.cur && !st.cur.url) {
          const href = el.getAttribute("href");
          if (href) {
            st.cur.url = href.startsWith("http") ? href : BASE + href;
          }
        }
      },
      text(t) {
        if (st.cur && !st.cur.name) {
          st.cur.name = t.text.trim();
        }
      },
    })
    .on(".genreCount, .count, td.count", {
      text(t) {
        if (st.cur) {
          const num = parseInt(t.text.replace(/,/g, "").trim(), 10);
          if (!Number.isNaN(num)) st.cur.count = num;
        }
      },
    })
    .on(".genrePercentage, .percentage, td.percentage", {
      text(t) {
        if (st.cur && t.text.trim()) st.cur.percentage = (st.cur.percentage ?? "") + t.text.trim();
      },
    })
    .on(".genreScore, .score, td.score, .averageScore", {
      text(t) {
        if (st.cur && t.text.trim()) st.cur.averageScore = (st.cur.averageScore ?? "") + t.text.trim();
      },
    })
    .on(".genreRow, tr.genreRow, .genreBlock, tr", {
      element(el) {
        el.onEndTag(() => {
          if (st.cur?.name) {
            genres.push({
              name: decodeEntities(st.cur.name),
              url: st.cur.url ?? "",
              count: st.cur.count ?? null,
              percentage: st.cur.percentage ?? null,
              averageScore: st.cur.averageScore ?? null,
            });
            st.cur = null;
          }
        });
      },
    })
    .transform(res)
    .arrayBuffer();

  return {
    username,
    genres,
  };
}

export async function scrapeUserBadges(
  username: string,
  opts: FetchOpts = FETCH_OPTS,
): Promise<{ username: string; badges: UserBadgeItem[] }> {
  const url = `${BASE}/user/${encodeURIComponent(username)}/badges/`;
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`User badges fetch failed: ${res.status}`);

  const badges: UserBadgeItem[] = [];
  const st: { cur: Partial<UserBadgeItem> | null } = { cur: null };

  await new HTMLRewriter()
    .on(".badgeRow, .badgeBlock, .badge", {
      element() {
        st.cur = { name: "", description: null, image: null, date: null };
      },
    })
    .on(".badgeTitle, .badgeName, .title", {
      text(t) {
        if (st.cur) st.cur.name = (st.cur.name ?? "") + t.text;
      },
    })
    .on(".badgeDescription, .description, .desc", {
      text(t) {
        if (st.cur) st.cur.description = (st.cur.description ?? "") + t.text;
      },
    })
    .on("img", {
      element(el) {
        if (st.cur && !st.cur.image) {
          st.cur.image = el.getAttribute("src") ?? null;
        }
      },
    })
    .on(".badgeDate, .date", {
      text(t) {
        if (st.cur) st.cur.date = (st.cur.date ?? "") + t.text;
      },
    })
    .on(".badgeRow, .badgeBlock, .badge", {
      element(el) {
        el.onEndTag(() => {
          if (st.cur?.name?.trim()) {
            badges.push({
              name: decodeEntities(st.cur.name.trim()),
              description: st.cur.description ? decodeEntities(st.cur.description.trim()) : null,
              image: st.cur.image ?? null,
              date: st.cur.date ? st.cur.date.trim() : null,
            });
            st.cur = null;
          }
        });
      },
    })
    .transform(res)
    .arrayBuffer();

  return {
    username,
    badges,
  };
}

export async function scrapeUserYearEnd(
  username: string,
  year: number,
  opts: FetchOpts = FETCH_OPTS,
): Promise<UserYearEndResult> {
  const url = `${BASE}/year-end/${encodeURIComponent(username)}/${year}/`;
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`User year-end fetch failed: ${res.status}`);
  const html = await res.text();

  const userM = html.match(/<div class="userName"><a [^>]*title="([^"]*)"[^>]*>([^<]*)<\/a><\/div>/i)
    ?? html.match(/<div class="userName"><a [^>]*>([^<]*)<\/a><\/div>/i);
  const displayName = userM?.[2] ? decodeEntities(userM[2].trim()) : userM?.[1] ? decodeEntities(userM[1].trim()) : username;
  const avatarM = html.match(/<div class="userImage"><a [^>]*><img [^>]*src="([^"]+)"/i);
  const avatar = avatarM?.[1] ?? null;

  const coversByIndex = new Map<number, string>();
  for (const cm of html.matchAll(/<div class="yearEnd block[^"]*" data-album-index="(\d+)">[\s\S]*?<img [^>]*src="([^"]+)"/g)) {
    if (cm[1] && cm[2]) {
      const idx = parseInt(cm[1], 10);
      coversByIndex.set(idx, cm[2]);
    }
  }

  const albums: UserYearEndAlbum[] = [];
  const listItems = [...html.matchAll(/<li data-album-index="(\d+)"><a href="([^"]+)">([^<]+)<\/a><\/li>/g)];
  for (const m of listItems) {
    if (!m[1] || !m[2] || !m[3]) continue;
    const idx = parseInt(m[1], 10);
    const href = m[2];
    const fullText = decodeEntities(m[3].trim());
    const dashIdx = fullText.indexOf(" - ");
    const artist = dashIdx > -1 ? fullText.slice(0, dashIdx).trim() : "";
    const album = dashIdx > -1 ? fullText.slice(dashIdx + 3).trim() : fullText;
    const albumUrl = href.startsWith("http") ? href : BASE + href;
    const cover = coversByIndex.get(idx) ?? null;
    albums.push({
      rank: idx + 1,
      artist,
      artistUrl: "",
      album,
      albumUrl,
      cover,
    });
  }

  const parseCsvList = (cat: string): string[] => {
    const m = html.match(new RegExp(`<span class="category">${cat}<\\/span>\\s*\\/\\s*([^<]+)`, "i"));
    if (!m?.[1]) return [];
    return m[1].split(",").map((s) => decodeEntities(s.trim())).filter(Boolean);
  };

  const genres = parseCsvList("genres");
  const secondaries = parseCsvList("secondaries");
  const descriptors = parseCsvList("descriptors");

  return {
    username,
    displayName,
    userUrl: `${BASE}/user/${encodeURIComponent(username)}/`,
    avatar,
    year,
    albums,
    genres,
    secondaries,
    descriptors,
  };
}

export async function scrapeUserDistribution(
  usernameOrId: string,
  format = "albums",
  opts: FetchOpts = FETCH_OPTS,
): Promise<UserDistributionResult> {
  let userId = usernameOrId;
  if (!/^\d+$/.test(usernameOrId)) {
    const profile = await scrapeUserProfile(usernameOrId, opts);
    if (!profile.userId) throw new Error("Could not determine user ID for distribution");
    userId = profile.userId;
  }
  const res = await fetch(`${BASE}/scripts/changeDistribution.php`, {
    ...opts,
    method: "POST",
    headers: {
      ...opts.headers,
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Requested-With": "XMLHttpRequest",
    },
    body: new URLSearchParams({ type: "profile", format, itemID: userId }).toString(),
  });
  if (!res.ok) throw new Error(`User distribution fetch failed: ${res.status}`);
  const html = await res.text();
  const rows: AlbumDistributionRow[] = [];
  for (const row of html.matchAll(/<tr class="distRow">([\s\S]*?)<\/tr>/g)) {
    const rowHtml = row[1];
    if (!rowHtml) continue;
    const mLabel = rowHtml.match(/<td class="distLabel">([\s\S]*?)<\/td>/);
    const mCount = rowHtml.match(/<td class="distCount">([\s\S]*?)<\/td>/);
    const mBar = rowHtml.match(/width:\s*([\d.]+%)/);
    const label = mLabel?.[1] ? decodeEntities(mLabel[1].replace(/<[^>]+>/g, "").trim()) : "";
    const countStr = mCount?.[1] ? mCount[1].replace(/<[^>]+>/g, "").replace(/,/g, "").trim() : "";
    if (label) {
      rows.push({
        label,
        count: countStr ? parseInt(countStr, 10) || 0 : 0,
        percentage: mBar?.[1] ?? null,
      });
    }
  }
  return { username: usernameOrId, format, rows };
}

export async function scrapeUserArtistRatings(
  usernameOrId: string,
  artistId: string,
  opts: FetchOpts = FETCH_OPTS,
): Promise<UserArtistRatingsResult> {
  let userId = usernameOrId;
  if (!/^\d+$/.test(usernameOrId)) {
    const profile = await scrapeUserProfile(usernameOrId, opts);
    if (!profile.userId) throw new Error("Could not determine user ID for artist ratings");
    userId = profile.userId;
  }
  const res = await fetch(`${BASE}/scripts/showArtistRatings.php`, {
    ...opts,
    method: "POST",
    headers: {
      ...opts.headers,
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Requested-With": "XMLHttpRequest",
    },
    body: new URLSearchParams({ userID: userId, artistID: artistId }).toString(),
  });
  if (!res.ok) throw new Error(`Artist ratings fetch failed: ${res.status}`);
  const html = await res.text();
  const ratings: UserArtistRatingItem[] = [];

  for (const tr of html.matchAll(/<tr>([\s\S]*?)<\/tr>/g)) {
    const r = tr[1];
    if (!r) continue;
    const rankM = r.match(/<td class="rank">(\d+)<\/td>/);
    const coverM = r.match(/<td class="tableCover">[\s\S]*?<img [^>]*src="([^"]+)"/);
    const albumM = r.match(/<div class="largeTitle"><a href="([^"]+)">([^<]+)<\/a><\/div>/);
    const yearM = r.match(/<div style="color: gray; font-size: \.9em;">(\d{4})<\/div>/);
    const scoreM = r.match(/<td class="tableRating"><div class="[^"]*-font">(\d+)<\/div><\/td>/);
    const revM = r.match(/<a href="([^"]*\/user\/[^"]*\/album\/[^"]*)">/);

    if (albumM?.[1] && albumM[2]) {
      ratings.push({
        rank: rankM?.[1] ? parseInt(rankM[1], 10) : ratings.length + 1,
        album: decodeEntities(albumM[2].trim()),
        albumUrl: albumM[1].startsWith("http") ? albumM[1] : BASE + albumM[1],
        cover: coverM?.[1] ?? null,
        year: yearM?.[1] ?? null,
        score: scoreM?.[1] ?? null,
        reviewUrl: revM?.[1] ? (revM[1].startsWith("http") ? revM[1] : BASE + revM[1]) : null,
      });
    }
  }

  return {
    username: usernameOrId,
    artistId,
    ratings,
  };
}

export async function scrapeUserAlbumTrackRatings(
  usernameOrId: string,
  albumIdOrSlug: string,
  opts: FetchOpts = FETCH_OPTS,
): Promise<UserAlbumTrackRatingsResult> {
  let userId = usernameOrId;
  if (!/^\d+$/.test(usernameOrId)) {
    const profile = await scrapeUserProfile(usernameOrId, opts);
    if (!profile.userId) throw new Error("Could not determine user ID for track ratings");
    userId = profile.userId;
  }
  const albumId = albumIdOrSlug.match(/^(\d+)/)?.[1] ?? albumIdOrSlug;

  const res = await fetch(`${BASE}/scripts/trackRatings/showUserTrackRatings.php`, {
    ...opts,
    method: "POST",
    headers: {
      ...opts.headers,
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Requested-With": "XMLHttpRequest",
    },
    body: new URLSearchParams({ albumID: albumId, userID: userId }).toString(),
  });
  if (!res.ok) throw new Error(`User track ratings fetch failed: ${res.status}`);
  const html = await res.text();

  const albumTitleM = html.match(/<h1 class="albumTitle"><a [^>]*>([^<]+)<\/a><\/h1>/i);
  const fullTitle = albumTitleM?.[1] ? decodeEntities(albumTitleM[1].trim()) : "";
  const dashIdx = fullTitle.indexOf(" - ");
  const artist = dashIdx > -1 ? fullTitle.slice(0, dashIdx).trim() : "";
  const album = dashIdx > -1 ? fullTitle.slice(dashIdx + 3).trim() : fullTitle;

  const coverM = html.match(/<div class="albumHeaderCover">[\s\S]*?<img [^>]*data-src="([^"]+)"/i)
    ?? html.match(/<div class="albumHeaderCover">[\s\S]*?<img [^>]*src="([^"]+)"/i);
  const cover = coverM?.[1] ?? null;

  const tracks: UserTrackRatingEntry[] = [];
  for (const tr of html.matchAll(/<tr>([\s\S]*?)<\/tr>/g)) {
    const r = tr[1];
    if (!r) continue;
    const numM = r.match(/<td class="trackNumber">(\d+)<\/td>/i);
    const titleM = r.match(/<td class="trackTitle"><a href="([^"]*)">([^<]*)<\/a>/i);
    const lenM = r.match(/<div class="length">([^<]*)<\/div>/i);
    const scoreM = r.match(/<td class="trackRating">(?:<span[^>]*>)?([^<]+)(?:<\/span>)?<\/td>/i);

    const feat: string[] = [];
    const featBlock = r.match(/<div class="featuredArtists">([\s\S]*?)<\/div>/i);
    if (featBlock?.[1]) {
      for (const fa of featBlock[1].matchAll(/<a [^>]*>([^<]+)<\/a>/g)) {
        if (fa[1]) feat.push(decodeEntities(fa[1].trim()));
      }
    }

    if (numM?.[1] && titleM?.[2] && titleM[1]) {
      const rawScore = scoreM?.[1]?.trim();
      const score = rawScore && rawScore !== "NR" ? rawScore : null;
      tracks.push({
        number: numM[1],
        title: decodeEntities(titleM[2].trim()),
        url: titleM[1].startsWith("http") ? titleM[1] : BASE + titleM[1],
        length: lenM?.[1]?.trim() ?? "",
        score,
        features: feat,
      });
    }
  }

  return {
    username: usernameOrId,
    albumId,
    album,
    artist,
    cover,
    tracks,
  };
}




