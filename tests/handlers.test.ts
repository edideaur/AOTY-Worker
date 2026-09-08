import { describe, it, expect } from "bun:test";
import worker from "../src/index.ts";
import { createMockEnv, mockFetch } from "./test_utils.js";

function req(path: string, method = "GET"): Request {
  return new Request(`http://localhost${path}`, { method });
}

describe("HTTP Methods & Cache HIT/MISS", () => {
  it("HEAD request returns empty body with headers", async () => {
    const env = createMockEnv();
    const res = await worker.fetch(req("/health", "HEAD"), env);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("");
  });

  it("POST request returns 405 Method Not Allowed", async () => {
    const env = createMockEnv();
    const res = await worker.fetch(req("/health", "POST"), env);
    expect(res.status).toBe(405);
    expect(res.headers.get("Allow")).toContain("GET");
  });

  it("DELETE request returns 405 Method Not Allowed", async () => {
    const env = createMockEnv();
    const res = await worker.fetch(req("/health", "DELETE"), env);
    expect(res.status).toBe(405);
  });

  it("serves from cache on HIT", async () => {
    const cachedData = JSON.stringify({ cached: true });
    const env = createMockEnv({
      "/discover": cachedData,
    });

    const res = await worker.fetch(req("/discover"), env);
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Cache")).toBe("HIT");
    const json = (await res.json()) as { cached: boolean };
    expect(json.cached).toBe(true);
  });

  it("bypasses cache when cache=false", async () => {
    const cachedData = JSON.stringify({ cached: true });
    const env = createMockEnv({
      "/discover": cachedData,
    });

    const restore = mockFetch(async () => new Response('<div class="albumBlock"><div class="albumTitle">Fresh</div></div>', { status: 200 }));
    try {
      const res = await worker.fetch(req("/discover?cache=false"), env);
      expect(res.status).toBe(200);
      expect(res.headers.get("X-Cache")).toBe("MISS");
    } finally {
      restore();
    }
  });
});

describe("Query parameter routing & response shapes", () => {
  const env = createMockEnv();

  it("handles /songs/top with year alias and period", async () => {
    const songHtml = `
      <div class="songRow">
        <div class="songTitle"><a href="/song/1-runaway/">Runaway</a></div>
        <div class="artistTitle"><a href="/artist/1-kanye/">Kanye West</a></div>
        <div class="scoreValue">96</div>
      </div>
    `;
    const restore = mockFetch(async () => new Response(songHtml, { status: 200 }));

    try {
      const resYear = await worker.fetch(req("/songs/top?year=2025"), env);
      expect(resYear.status).toBe(200);
      const jsonYear = (await resYear.json()) as { period: string; page: number; songs: unknown[] };
      expect(jsonYear.period).toBe("2025");
      expect(jsonYear.page).toBe(1);

      const resPeriod = await worker.fetch(req("/songs/top?period=2024&page=2"), env);
      expect(resPeriod.status).toBe(200);
      const jsonPeriod = (await resPeriod.json()) as { period: string; page: number; songs: unknown[] };
      expect(jsonPeriod.period).toBe("2024");
      expect(jsonPeriod.page).toBe(2);
    } finally {
      restore();
    }
  });

  it("handles /releases/by-date with week, month, decade, and genre", async () => {
    const albumHtml = `<div class="albumBlock"><div class="albumTitle">Test</div></div>`;
    const restore = mockFetch(async () => new Response(albumHtml, { status: 200 }));

    try {
      const resWeek = await worker.fetch(req("/releases/by-date?year=2025&week=10&genre=rock"), env);
      expect(resWeek.status).toBe(200);
      const jsonWeek = (await resWeek.json()) as { year: string; week: string | null; page: number };
      expect(jsonWeek.year).toBe("2025");
      expect(jsonWeek.week).toBe("10");

      const resMonth = await worker.fetch(req("/releases/by-date?year=2025&month=january&page=2"), env);
      expect(resMonth.status).toBe(200);
      const jsonMonth = (await resMonth.json()) as { year: string; month: string | null; page: number };
      expect(jsonMonth.year).toBe("2025");
      expect(jsonMonth.month).toBe("january");
      expect(jsonMonth.page).toBe(2);

      const resDecade = await worker.fetch(req("/releases/by-date?decade=2010s"), env);
      expect(resDecade.status).toBe(200);
      const jsonDecade = (await resDecade.json()) as { decade: string | null };
      expect(jsonDecade.decade).toBe("2010s");
    } finally {
      restore();
    }
  });

  it("handles /releases/vibe with valid parameters", async () => {
    const albumHtml = `<div class="albumBlock"><div class="albumTitle">Vibe Album</div></div>`;
    const restore = mockFetch(async () => new Response(albumHtml, { status: 200 }));

    try {
      const res = await worker.fetch(req("/releases/vibe?vibe=chill&year=2024&sort=user&page=2"), env);
      expect(res.status).toBe(200);
      const json = (await res.json()) as { vibe: string; year: string; sort: string; page: number; albums: unknown[] };
      expect(json.vibe).toBe("chill");
      expect(json.year).toBe("2024");
      expect(json.sort).toBe("user");
      expect(json.page).toBe(2);
    } finally {
      restore();
    }
  });

  it("handles /must-hear with period combinations", async () => {
    const albumHtml = `<div class="albumBlock"><div class="albumTitle">Must Hear</div></div>`;
    const restore = mockFetch(async () => new Response(albumHtml, { status: 200 }));

    try {
      const resDecade = await worker.fetch(req("/must-hear?decade=2010s&page=2"), env);
      expect(resDecade.status).toBe(200);
      const jsonDecade = (await resDecade.json()) as { year: string; page: number };
      expect(jsonDecade.year).toBe("2010s");
      expect(jsonDecade.page).toBe(2);

      const resYear = await worker.fetch(req("/must-hear?year=2024"), env);
      expect(resYear.status).toBe(200);
      const jsonYear = (await resYear.json()) as { year: string; page: number };
      expect(jsonYear.year).toBe("2024");

      const resAll = await worker.fetch(req("/must-hear"), env);
      expect(resAll.status).toBe(200);
      const jsonAll = (await resAll.json()) as { year: string; page: number };
      expect(jsonAll.year).toBe("all");
    } finally {
      restore();
    }
  });

  it("handles /news and /lists with query filters", async () => {
    const newsHtml = `<div class="mediaContainer" id="link1"><div class="content"><div class="title"><a href="/l/1/">News</a></div></div></div>`;
    const listHtml = `<div class="listColumn"><div class="listPub"><a href="/list/1/">List</a></div></div>`;
    const restore = mockFetch(async (input) => {
      const url = typeof input === "string" ? input : input instanceof Request ? input.url : input.toString();
      if (url.includes("/lists.php")) return new Response(listHtml, { status: 200 });
      return new Response(newsHtml, { status: 200 });
    });

    try {
      const resNews = await worker.fetch(req("/news?type=new&page=2"), env);
      expect(resNews.status).toBe(200);
      const jsonNews = (await resNews.json()) as { page: number; type: string };
      expect(jsonNews.type).toBe("new");
      expect(jsonNews.page).toBe(2);

      const resLists = await worker.fetch(req("/lists?year=2024&sort=newest&page=3"), env);
      expect(resLists.status).toBe(200);
      const jsonLists = (await resLists.json()) as { year: number | null; sort: string | null; page: number };
      expect(jsonLists.year).toBe(2024);
      expect(jsonLists.sort).toBe("newest");
      expect(jsonLists.page).toBe(3);
    } finally {
      restore();
    }
  });

  it("handles /guidelines type parameter", async () => {
    const guideHtml = `<div class="heading">Comment Guidelines</div><div class="rules">Rule 1</div>`;
    const restore = mockFetch(async () => new Response(guideHtml, { status: 200 }));

    try {
      const res = await worker.fetch(req("/guidelines?type=comment"), env);
      expect(res.status).toBe(200);
      const json = (await res.json()) as { title: string };
      expect(json.title).toContain("Comment Guidelines");
    } finally {
      restore();
    }
  });

  it("handles /list/summary, /year-end, and /songs/best routes", async () => {
    const summaryHtml = `
      <div class="grayBox">These numbers are obtained from the <strong>113</strong> lists</div>
      <div class="listSummaryRow">
        <div class="listSummaryRank">1</div>
        <h2 class="albumTitle listSummary"><a href="/album/1-lux.php">LUX</a></h2>
        <h3 class="artistTitle listSummary"><a href="/artist/1-rosalia/">ROSALÍA</a></h3>
        <div class="summaryPoints"><a href="#">400 Points</a></div>
        <div class="pointsTable"><div class="summaryPointsMisc"><div class="head">1st Place</div><div class="count">10</div></div></div>
      </div>
    `;
    const songsHtml = `
      <div class="listSummaryRow">
        <div class="listSummaryRank song">1</div>
        <h2 class="artistTitle listSummary song"><a href="/artist/1/">Artist</a></h2>
        <h3 class="albumTitle listSummary song"><a href="/song/1/">Song</a></h3>
        <div class="pointsTable song"><div class="summaryPointsMisc"><div class="head">Points</div><div class="count">50</div></div></div>
      </div>
    `;

    const restore = mockFetch(async (input) => {
      const url = String(input);
      if (url.includes("/songs/best/")) return new Response(songsHtml, { status: 200 });
      return new Response(summaryHtml, { status: 200 });
    });

    try {
      const resSum = await worker.fetch(req("/list/summary?year=2025&genre=hip-hop"), env);
      expect(resSum.status).toBe(200);
      const jsonSum = (await resSum.json()) as { year: number; genre: string; items: unknown[] };
      expect(jsonSum.year).toBe(2025);
      expect(jsonSum.genre).toBe("hip-hop");
      expect(jsonSum.items.length).toBe(1);

      const resYe = await worker.fetch(req("/year-end?year=2025"), env);
      expect(resYe.status).toBe(200);
      const jsonYe = (await resYe.json()) as { year: number; items: unknown[] };
      expect(jsonYe.year).toBe(2025);
      expect(jsonYe.items.length).toBe(1);

      const resSongs = await worker.fetch(req("/songs/best?year=2025&sort=lists"), env);
      expect(resSongs.status).toBe(200);
      const jsonSongs = (await resSongs.json()) as { year: number; sort: string; songs: unknown[] };
      expect(jsonSongs.year).toBe(2025);
      expect(jsonSongs.sort).toBe("lists");
      expect(jsonSongs.songs.length).toBe(1);
    } finally {
      restore();
    }
  });

  it("handles /user/year-end and /user/distribution routes", async () => {
    const userYearEndHtml = `
      <div class="userName"><a title="testuser">Test User</a></div>
      <ol class="ranked"><li data-album-index="0"><a href="/album/1/">Artist - Album</a></li></ol>
      <section class="moreInfo"><div><span class="category">genres</span> / pop</div></section>
    `;
    const distHtml = `<table class="dist"><tr class="distRow"><td class="distLabel">100</td><td class="distCount">10</td></tr></table>`;

    const restore = mockFetch(async (input) => {
      const url = String(input);
      if (url.includes("changeDistribution.php")) return new Response(distHtml, { status: 200 });
      return new Response(userYearEndHtml, { status: 200 });
    });

    try {
      const resYe = await worker.fetch(req("/user/year-end?username=testuser&year=2025"), env);
      expect(resYe.status).toBe(200);
      const jsonYe = (await resYe.json()) as { username: string; year: number; albums: unknown[] };
      expect(jsonYe.username).toBe("testuser");
      expect(jsonYe.year).toBe(2025);
      expect(jsonYe.albums.length).toBe(1);

      const resDist = await worker.fetch(req("/user/distribution?username=12345&format=singles"), env);
      expect(resDist.status).toBe(200);
      const jsonDist = (await resDist.json()) as { username: string; format: string; rows: unknown[] };
      expect(jsonDist.username).toBe("12345");
      expect(jsonDist.format).toBe("singles");
      expect(jsonDist.rows.length).toBe(1);
    } finally {
      restore();
    }
  });

  it("handles /genre/name, /user/artist-ratings, /album/likes, /album/in-library, and /album/images", async () => {
    const restore = mockFetch(async (input) => {
      const url = String(input);
      if (url.includes("getGenreName.php")) return new Response("Rock", { status: 200 });
      if (url.includes("showArtistRatings.php")) {
        return new Response('<table><tr><td class="rank">1</td><td class="albumInfo"><div class="largeTitle"><a href="/album/1/">Album</a></div></td></tr></table>', { status: 200 });
      }
      if (url.includes("showMore.php")) {
        return new Response('<div class="userBlock ten"><a href="/user/u/"><div class="userName"><a href="/user/u/">User</a></div></div>', { status: 200 });
      }
      if (url.includes("showImage.php")) {
        return new Response('<div id="curImage"><img src="main.jpg" /></div><div id="img_0" class="thumbnail selected"><img src="t.jpg" alt="Cover" title="Cover" /></div>', { status: 200 });
      }
      return new Response("{}", { status: 200 });
    });

    try {
      const resGenre = await worker.fetch(req("/genre/name?id=7"), env);
      expect(resGenre.status).toBe(200);
      const jsonGenre = (await resGenre.json()) as { id: string; name: string };
      expect(jsonGenre.id).toBe("7");
      expect(jsonGenre.name).toBe("Rock");

      const resArtist = await worker.fetch(req("/user/artist-ratings?username=123&artistId=10"), env);
      expect(resArtist.status).toBe(200);
      const jsonArtist = (await resArtist.json()) as { username: string; artistId: string; ratings: unknown[] };
      expect(jsonArtist.ratings.length).toBe(1);

      const resLikes = await worker.fetch(req("/album/likes?albumId=100"), env);
      expect(resLikes.status).toBe(200);
      const jsonLikes = (await resLikes.json()) as { users: unknown[] };
      expect(jsonLikes.users.length).toBe(1);

      const resLib = await worker.fetch(req("/album/in-library?albumId=100"), env);
      expect(resLib.status).toBe(200);
      const jsonLib = (await resLib.json()) as { users: unknown[] };
      expect(jsonLib.users.length).toBe(1);

      const resImg = await worker.fetch(req("/album/images?albumId=100"), env);
      expect(resImg.status).toBe(200);
      const jsonImg = (await resImg.json()) as { mainImage: string; images: unknown[] };
      expect(jsonImg.mainImage).toBe("main.jpg");
      expect(jsonImg.images.length).toBe(1);
    } finally {
      restore();
    }
  });

  it("handles /user/track-ratings, /comments, and corrections routes", async () => {
    const restore = mockFetch(async (input) => {
      const url = String(input);
      if (url.includes("showUserTrackRatings.php")) {
        return new Response('<div class="albumHeadline small"><h1 class="albumTitle"><a href="#">Artist - Album</a></h1></div><table><tr><td class="trackNumber">1</td><td class="trackTitle"><a href="/song/1/">T1</a></td><td class="trackRating">100</td></tr></table>', { status: 200 });
      }
      if (url.includes("viewAllComments.php")) {
        return new Response('<div id="reply1" class="commentRow"><div class="commentUserName"><a href="#">User</a></div><div class="commentText">Comment</div></div>', { status: 200 });
      }
      if (url.includes("corrections")) {
        return new Response('<h1 class="albumTitle"><a href="#">Title</a></h1><div>Added on <strong>2024</strong></div>', { status: 200 });
      }
      return new Response("{}", { status: 200 });
    });

    try {
      const resTrack = await worker.fetch(req("/user/track-ratings?username=123&albumId=456"), env);
      expect(resTrack.status).toBe(200);
      const jsonTrack = (await resTrack.json()) as { username: string; albumId: string; tracks: unknown[] };
      expect(jsonTrack.tracks.length).toBe(1);

      const resComm = await worker.fetch(req("/comments?type=user_review&itemId=999"), env);
      expect(resComm.status).toBe(200);
      const jsonComm = (await resComm.json()) as { type: string; itemId: string; comments: unknown[] };
      expect(jsonComm.comments.length).toBe(1);

      const resAlbCorr = await worker.fetch(req("/album/corrections?albumId=123"), env);
      expect(resAlbCorr.status).toBe(200);
      const jsonAlb = (await resAlbCorr.json()) as { title: string; addedOn: string };
      expect(jsonAlb.title).toBe("Title");

      const resArtCorr = await worker.fetch(req("/artist/corrections?slug=1-artist"), env);
      expect(resArtCorr.status).toBe(200);

      const resSongCorr = await worker.fetch(req("/song/corrections?songId=789"), env);
      expect(resSongCorr.status).toBe(200);
    } finally {
      restore();
    }
  });

  it("handles /releases/this-week/singles, /releases/decade, /releases/month, /releases/week, /user/perfect, and /critic/reviews", async () => {
    const albumHtml = `<div class="albumBlock"><div class="albumTitle">Test</div></div>`;
    const ratingHtml = `<div class="albumBlock" data-type="LP"><div class="artistTitle">Artist</div><div class="albumTitle">Album</div><div class="ratingRow"><div class="rating">100</div></div></div>`;
    const criticHtml = `<h1 class="headline">Critic Name</h1><div class="albumReviewRow"><div class="rating">90</div></div>`;

    const restore = mockFetch(async (input) => {
      const url = String(input);
      if (url.includes("/user/")) return new Response(ratingHtml, { status: 200 });
      if (url.includes("/critic/")) return new Response(criticHtml, { status: 200 });
      return new Response(albumHtml, { status: 200 });
    });

    try {
      const resSingles = await worker.fetch(req("/releases/this-week/singles"), env);
      expect(resSingles.status).toBe(200);
      const jsonSingles = (await resSingles.json()) as { albums: unknown[] };
      expect(jsonSingles.albums.length).toBe(1);

      const resDecade = await worker.fetch(req("/releases/decade?decade=2020s"), env);
      expect(resDecade.status).toBe(200);
      const jsonDecade = (await resDecade.json()) as { decade: string; albums: unknown[] };
      expect(jsonDecade.decade).toBe("2020s");

      const resMonth = await worker.fetch(req("/releases/month?month=september-09"), env);
      expect(resMonth.status).toBe(200);
      const jsonMonth = (await resMonth.json()) as { month: string; albums: unknown[] };
      expect(jsonMonth.month).toBe("september-09");

      const resWeek = await worker.fetch(req("/releases/week?week=36"), env);
      expect(resWeek.status).toBe(200);
      const jsonWeek = (await resWeek.json()) as { week: string; albums: unknown[] };
      expect(jsonWeek.week).toBe("36");

      const resPerf = await worker.fetch(req("/user/perfect?username=testuser"), env);
      expect(resPerf.status).toBe(200);
      const jsonPerf = (await resPerf.json()) as { username: string; ratings: unknown[] };
      expect(jsonPerf.username).toBe("testuser");
      expect(jsonPerf.ratings.length).toBe(1);

      const resCrit = await worker.fetch(req("/critic/reviews?slug=1-critic"), env);
      expect(resCrit.status).toBe(200);
      const jsonCrit = (await resCrit.json()) as { name: string };
      expect(jsonCrit.name).toBe("Critic Name");
    } finally {
      restore();
    }
  });

  it("handles /ratings/sources and /ratings/genres routes", async () => {
    const sourcesHtml = `<div class="columns"><div><a href="/ratings/12-av-club/2026/1">AV Club</a></div></div>`;
    const genresHtml = `<div id="results"><div class="columns"><div><a href="/genre/7-rock/2026/">Rock</a></div></div></div>`;

    const restore = mockFetch(async (input) => {
      const url = String(input);
      if (url.includes("sourceSelect.php")) return new Response(sourcesHtml, { status: 200 });
      if (url.includes("genreSelect.php")) return new Response(genresHtml, { status: 200 });
      return new Response("{}", { status: 200 });
    });

    try {
      const resSrc = await worker.fetch(req("/ratings/sources?year=2026"), env);
      expect(resSrc.status).toBe(200);
      const jsonSrc = (await resSrc.json()) as { year: string; sources: unknown[] };
      expect(jsonSrc.year).toBe("2026");
      expect(jsonSrc.sources.length).toBe(1);

      const resGen = await worker.fetch(req("/ratings/genres?year=2026"), env);
      expect(resGen.status).toBe(200);
      const jsonGen = (await resGen.json()) as { year: string; genres: unknown[] };
      expect(jsonGen.year).toBe("2026");
      expect(jsonGen.genres.length).toBe(1);
    } finally {
      restore();
    }
  });
});
