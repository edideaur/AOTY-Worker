import { BASE, FETCH_OPTS, decodeEntities, parseCount, parseScore, parseExactScore, parseId, parseRank, parseTrackNumber, parseYear, parsePercent, type FetchOpts } from "../constants.js";
import type {
  AotyComment,
  NamedLink,
  SongCredit,
  SongDetail,
  SongRating,
  SongTracklistItem,
  SongsBestItem,
  SongsBestResult,
  TopSong,
} from "../types.js";

export async function scrapeSongPage(pageUrl: string, opts: FetchOpts = FETCH_OPTS): Promise<SongDetail> {
  const res = await fetch(pageUrl, opts);
  if (!res.ok) throw new Error(`Song fetch failed: ${res.status}`);
  const idM = pageUrl.match(/\/song\/(\d+)/);
  const s = {
    title: "",
    artist: "",
    artistUrl: "",
    cover: null as string | null,
    album: null as string | null,
    albumUrl: null as string | null,
    trackNumber: null as string | null,
    year: "",
    duration: "",
    userScore: "",
    userScoreExact: "",
    ratingCount: "",
    credits: [] as SongCredit[],
    creditRole: null as SongCredit | null,
    topRatings: [] as SongRating[],
    rating: null as { username: string; userUrl: string; avatar: string | null; rating: string; date: string | null } | null,
  };
  await new HTMLRewriter()
    .on("h1.songTitle", {
      text(t) {
        s.title += t.text;
      },
    })
    .on(".albumHeader.song .artist a", {
      element(el) {
        const href = el.getAttribute("href") ?? "";
        if (!s.artistUrl && href.includes("/artist/")) s.artistUrl = href.startsWith("http") ? href : BASE + href;
      },
      text(t) {
        s.artist += t.text;
      },
    })
    .on(".albumHeaderCover img", {
      element(el) {
        if (!s.cover) s.cover = el.getAttribute("src") ?? null;
      },
    })
    .on(".songScore", {
      element(el) {
        s.userScoreExact = el.getAttribute("title") ?? "";
      },
      text(t) {
        s.userScore += t.text;
      },
    })
    .on(".songScoreBox .text", {
      text(t) {
        s.ratingCount += t.text;
      },
    })
    .on(".songInfo .detailRow", {
      element() {
        s.creditRole = null;
      },
      text(t) {
        void t;
      },
    })
    .on(".songRatings .cell", {
      element(el) {
        void el;
      },
    })
    .transform(res.clone())
    .arrayBuffer();

  const html = await res.text();
  // Track/album/year/duration come from plain detailRows; parse them here.
  const rows = [...html.matchAll(/<div class="detailRow">(.*?)<\/div>/gs)]
    .map((m) => m[1])
    .filter((r): r is string => typeof r === "string");
  for (const row of rows) {
    const plain = row.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const trackM = plain.match(/Track #(\d+) on/i);
    const yearM = plain.match(/^(\d{4})\s*\/ Year/);
    const durM = plain.match(/^([\d:]+)\s*\/ duration/);
    if (trackM?.[1]) {
      s.trackNumber = trackM[1];
      const am = row.match(/<a href="([^"]+)">([^<]*)<\/a>/);
      if (am?.[1] && am[2] !== undefined) {
        s.album = decodeEntities(am[2].trim());
        s.albumUrl = am[1].startsWith("http") ? am[1] : BASE + am[1];
      }
    } else if (yearM?.[1]) {
      s.year = yearM[1];
    } else if (durM?.[1]) {
      s.duration = durM[1];
    }
  }
  // Role labels: rows like "<a..>X</a> / Feature" — fill roles missed by span pass
  {
    const creditRows = rows.filter((r) => r.includes("/artist/") && r.includes("<span>"));
    const parsed: SongCredit[] = [];
    for (const row of creditRows) {
      const roleM = row.match(/<span>\s*\/\s*([^<]+)<\/span>/);
      const role = roleM?.[1] ? decodeEntities(roleM[1].trim()) : "";
      const artists = [...row.matchAll(/<a href="([^"]+)">([^<]*)<\/a>/g)].flatMap((m) => {
        const u = m[1];
        const n = m[2];
        if (!u || n === undefined) return [];
        return [{
          name: decodeEntities(n.trim()),
          url: u.startsWith("http") ? u : BASE + u,
        }];
      });
      if (artists.length) parsed.push({ role, artists });
    }
    if (parsed.length) s.credits = parsed;
  }
  // Top user ratings (first page of the song ratings)
  s.topRatings = await scrapeSongRatingRows(new Response(html));

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

  const likePctM = html.match(/<strong[^>]*>(\d+%)<\/strong>\s*of users like this song/i);
  const dislikePctM = html.match(/<strong[^>]*>(\d+%)<\/strong>\s*of users don't like this song/i);
  const likePercentage = likePctM?.[1] ?? null;
  const dislikePercentage = dislikePctM?.[1] ?? null;

  const tracklist: SongTracklistItem[] = [];
  const tracklistTableM = html.match(/class="trackListTable"[\s\S]*?<\/table>/i) ?? html.match(/Track List[\s\S]*?<table[^>]*>([\s\S]*?)<\/table>/i);
  if (tracklistTableM) {
    for (const tr of tracklistTableM[0].matchAll(/<tr>([\s\S]*?)<\/tr>/g)) {
      const row = tr[1];
      if (!row) continue;
      const numM = row.match(/class="[^"]*trackNumber[^"]*"[^>]*>([^<]+)<\/td>|<td[^>]*>(\d+)<\/td>/);
      const titleM = row.match(/<a href="([^"]*\/song\/[^"]*)">([^<]+)<\/a>/);
      const lenM = row.match(/class="[^"]*length[^"]*"[^>]*>([^<]+)<\/td>|<td[^>]*>(\d+:\d+)<\/td>/);
      const scoreM = row.match(/class="[^"]*trackRating[^"]*"[^>]*>([^<]+)<\/td>|<div class="trackRating[^"]*">([^<]+)<\/div>/);
      if (titleM?.[1] && titleM[2]) {
        tracklist.push({
          number: parseTrackNumber((numM?.[1] ?? numM?.[2] ?? "").trim()),
          title: decodeEntities(titleM[2].trim()),
          url: titleM[1].startsWith("http") ? titleM[1] : BASE + titleM[1],
          length: (lenM?.[1] ?? lenM?.[2] ?? "").trim(),
          score: parseScore((scoreM?.[1] ?? scoreM?.[2] ?? "").trim()),
        });
      }
    }
  }

  const tags: NamedLink[] = [];
  for (const m of html.matchAll(/<div class="tag[^"]*">\s*<a href="([^"]+)">([^<]*)<\/a>\s*<\/div>/g)) {
    const href = m[1];
    const text = m[2];
    if (!href || text === undefined) continue;
    tags.push({
      name: decodeEntities(text.trim()),
      url: href.startsWith("http") ? href : BASE + href,
    });
  }

  const comments: AotyComment[] = [];
  for (const m of html.matchAll(/<div class="commentRow" id="comment_(\d+)">([\s\S]*?)(?=<div class="commentRow" id="comment_|$)/g)) {
    const id = m[1];
    const c = m[2];
    if (!id || !c) continue;
    const userM = c.match(/<div class="commentUserName[^"]*"><a href="([^"]*)"[^>]*>([^<]*)<\/a>/);
    const avatarM = c.match(/<div class="commentImage[^"]*"><a[^>]*><img src="([^"]*)"/);
    const dateM = c.match(/<div class="commentDate"[^>]*title="([^"]*)"[^>]*>([^<]*)<\/div>/);
    const textM = c.match(/<div class="commentText[^"]*">([\s\S]*?)<\/div>/);
    const repliesM = c.match(/<button class="showReplies"[^>]*>[\s\S]*?<span>(\d+)<\/span>/);
    comments.push({
      id: parseId(id) ?? 0,
      username: userM?.[2] ? decodeEntities(userM[2].trim()) : "",
      userUrl: userM?.[1] ? (userM[1].startsWith("http") ? userM[1] : BASE + userM[1]) : "",
      avatar: avatarM?.[1] ? avatarM[1] : null,
      date: dateM?.[2] ? dateM[2].trim() : "",
      dateExact: dateM?.[1] ? dateM[1].trim() : "",
      text: textM?.[1] ? decodeEntities(textM[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()) : "",
      replies: parseCount(repliesM?.[1]) ?? 0,
    });
  }

  return {
    url: pageUrl,
    id: parseId(idM?.[1]),
    title: decodeEntities(s.title.trim()),
    artist: decodeEntities(s.artist.trim()),
    artistUrl: s.artistUrl,
    cover: s.cover,
    album: s.album,
    albumUrl: s.albumUrl,
    trackNumber: s.trackNumber ? parseTrackNumber(s.trackNumber) : null,
    year: s.year ? parseYear(s.year) : null,
    duration: s.duration || null,
    userScore: parseScore(s.userScore.trim()),
    userScoreExact: parseExactScore(s.userScoreExact),
    ratingCount: parseCount(s.ratingCount),
    ratingDistribution,
    likePercentage: parsePercent(likePercentage),
    dislikePercentage: parsePercent(dislikePercentage),
    tracklist,
    tags,
    credits: s.credits.filter((c) => c.artists.length > 0),
    topRatings: s.topRatings,
    comments,
  };
}

async function scrapeSongRatingRows(res: Response): Promise<SongRating[]> {
  type RawSongRating = { username: string; userUrl: string; avatar: string | null; rating: string; date: string | null };
  const ratings: RawSongRating[] = [];
  const st: { cur: RawSongRating | null } = { cur: null };
  await new HTMLRewriter()
    .on(".songRatings", {
      element() {
        st.cur = { username: "", userUrl: "", avatar: null, rating: "", date: null };
        ratings.push(st.cur);
      },
    })
    .on(".songRatings .cell.profilePic a", {
      element(el) {
        const href = el.getAttribute("href") ?? "";
        if (st.cur && !st.cur.userUrl && href.includes("/user/"))
          st.cur.userUrl = href.startsWith("http") ? href : BASE + href;
      },
    })
    .on(".songRatings .cell.profilePic img", {
      element(el) {
        if (st.cur) st.cur.avatar = el.getAttribute("src") ?? null;
      },
    })
    .on(".songRatings .cell.userName a", {
      element(el) {
        const href = el.getAttribute("href") ?? "";
        if (st.cur && href.includes("/user/")) {
          if (!st.cur.userUrl) st.cur.userUrl = href.startsWith("http") ? href : BASE + href;
          const title = el.getAttribute("title");
          if (title && !(st.cur.username ?? "").trim()) st.cur.username = title;
        }
      },
      text(t) {
        if (st.cur && !(st.cur.username ?? "").trim()) st.cur.username = (st.cur.username ?? "") + t.text;
      },
    })
    .on(".songRatings .cell.userName .gray-font", {
      text(t) {
        if (st.cur) st.cur.date = ((st.cur.date ?? "") as string) + t.text;
      },
    })
    .on(".songRatings .cell.score", {
      text(t) {
        if (st.cur) st.cur.rating = ((st.cur.rating ?? "") as string) + t.text;
      },
    })
    .transform(res)
    .arrayBuffer();
  return ratings
    .filter((r) => (r.username ?? "").trim())
    .map((r) => ({
      username: decodeEntities((r.username ?? "").trim()),
      userUrl: r.userUrl ?? "",
      avatar: r.avatar ?? null,
      rating: parseScore((r.rating ?? "").trim()),
      date: (r.date ?? "").trim() || null,
    }));
}

export async function scrapeSongRatingsPage(slug: string, page: number, opts: FetchOpts = FETCH_OPTS): Promise<{ slug: string; page: number; ratings: SongRating[] }> {
  const url = page > 1 ? `${BASE}/song/${slug}/${page}/` : `${BASE}/song/${slug}/`;
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`Song ratings fetch failed: ${res.status}`);
  return { slug, page, ratings: await scrapeSongRatingRows(res) };
}

export async function scrapeTopSongs(period: string, page: number, opts: FetchOpts = FETCH_OPTS): Promise<{ period: string; page: number; songs: TopSong[] }> {
  const aotyPath = page > 1 ? `/songs/top/${period}/${page}/` : `/songs/top/${period}/`;
  const res = await fetch(`${BASE}${aotyPath}`, opts);
  if (!res.ok) throw new Error(`Top songs fetch failed: ${res.status}`);
  type RawTopSong = { rank: string; title: string; url: string; artist: string; artistUrl: string; album: string | null; albumUrl: string | null; cover: string | null; score: string | null; ratingCount: string | null };
  const songs: RawTopSong[] = [];
  let cur: RawTopSong | null = null;
  let linkKind: "song" | "artist" | "album" | null = null;
  await new HTMLRewriter()
    .on(".trackListTable tr", {
      element() {
        cur = { rank: String(songs.length + 1), title: "", url: "", artist: "", artistUrl: "", album: null, albumUrl: null, cover: null, score: null, ratingCount: null };
        songs.push(cur);
        linkKind = null;
      },
    })
    .on(".coverart img", {
      element(el) {
        if (cur) cur.cover = el.getAttribute("src") ?? null;
      },
    })
    .on(".songAlbum a", {
      element(el) {
        const href = el.getAttribute("href") ?? "";
        if (!cur) return;
        if (href.includes("/song/")) {
          linkKind = "song";
          if (!cur.url) cur.url = href.startsWith("http") ? href : BASE + href;
        } else if (href.includes("/artist/")) {
          linkKind = "artist";
          if (!cur.artistUrl) cur.artistUrl = href.startsWith("http") ? href : BASE + href;
        } else if (href.includes("/album/")) {
          linkKind = "album";
          if (!cur.albumUrl) cur.albumUrl = href.startsWith("http") ? href : BASE + href;
        } else linkKind = null;
      },
      text(t) {
        if (!cur || !linkKind) return;
        if (linkKind === "song") cur.title = (cur.title ?? "") + t.text;
        else if (linkKind === "artist") cur.artist = (cur.artist ?? "") + t.text;
        else if (linkKind === "album") cur.album = ((cur.album ?? "") as string) + t.text;
      },
    })
    .on(".songAlbum .rank", {
      text(t) {
        if (cur) cur.rank = (cur.rank ?? "") + t.text;
      },
    })
    .on(".trackRating .green-font, .trackRating .yellow-font, .trackRating .red-font", {
      text(t) {
        if (cur) cur.score = ((cur.score ?? "") as string) + t.text;
      },
    })
    .on(".trackRating .gray-font", {
      text(t) {
        if (cur) cur.ratingCount = ((cur.ratingCount ?? "") as string) + t.text;
      },
    })
    .transform(res)
    .arrayBuffer();

  return {
    period,
    page,
    songs: songs
      .filter((x) => (x.title ?? "").trim())
      .map((x, i) => ({
        rank: parseRank((x.rank ?? "").replace(".", "").trim()) ?? i + 1,
        title: decodeEntities((x.title ?? "").trim()),
        url: x.url ?? "",
        artist: decodeEntities((x.artist ?? "").trim()),
        artistUrl: x.artistUrl ?? "",
        album: x.album ? decodeEntities((x.album as string).trim()) : null,
        albumUrl: x.albumUrl ?? null,
        cover: x.cover ?? null,
        score: parseScore((x.score ?? "").trim()),
        ratingCount: parseCount((x.ratingCount ?? "").replace(/Ratings?/i, "").trim()),
      })),
  };
}

export async function scrapeBestSongsYearEnd(
  year: number,
  sort = "points",
  opts: FetchOpts = FETCH_OPTS,
): Promise<SongsBestResult> {
  const url = sort === "lists" ? `${BASE}/songs/best/${year}/sort-by/lists/` : `${BASE}/songs/best/${year}/`;
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`Best songs fetch failed: ${res.status}`);
  const html = await res.text();
  const songs: SongsBestItem[] = [];
  const rows = [...html.matchAll(/<div class="listSummaryRow">([\s\S]*?)(?=<div class="listSummaryRow"|<div id="comments"|<div class="footer"|$)/g)];

  for (const match of rows) {
    const r = match[1];
    if (!r) continue;

    const rankM = r.match(/<div class="listSummaryRank[^"]*">(\d+)<\/div>/);
    const rank = rankM?.[1] ? parseInt(rankM[1], 10) : 0;

    const coverM = r.match(/<div class="listSummaryCover[^"]*">[\s\S]*?<img [^>]*src="([^"]+)"/);
    const cover = coverM?.[1] ?? null;

    const songM = r.match(/<h3 class="albumTitle listSummary song"><a [^>]*href="([^"]+)">([^<]+)<\/a><\/h3>/);
    const songUrl = songM?.[1] ? (songM[1].startsWith("http") ? songM[1] : BASE + songM[1]) : "";
    const title = songM?.[2] ? decodeEntities(songM[2].trim()) : "";

    const artistBlockM = r.match(/<h2 class="artistTitle listSummary song">([\s\S]*?)<\/h2>/);
    const artists: NamedLink[] = [];
    if (artistBlockM?.[1]) {
      for (const am of artistBlockM[1].matchAll(/<a [^>]*href="([^"]+)">([^<]+)<\/a>/g)) {
        if (am[1] && am[2]) {
          artists.push({
            name: decodeEntities(am[2].trim()),
            url: am[1].startsWith("http") ? am[1] : BASE + am[1],
          });
        }
      }
    }
    const artist = artists.map((a) => a.name).join(", ");
    const artistUrl = artists[0]?.url ?? "";

    const listsM = r.match(/<div class="head"># Lists<\/div>\s*<div class="count">([\d,]+)<\/div>/);
    const listsCount = listsM?.[1] ? parseInt(listsM[1].replace(/,/g, ""), 10) : 0;

    const pointsM = r.match(/<div class="head">Points<\/div>\s*<div class="count">([\d,]+)<\/div>/);
    const points = pointsM?.[1] ? parseInt(pointsM[1].replace(/,/g, ""), 10) : 0;

    if (title || artist) {
      songs.push({
        rank,
        artist,
        artistUrl,
        artists,
        title,
        url: songUrl,
        cover,
        points,
        listsCount,
      });
    }
  }

  return { year, sort, songs };
}

