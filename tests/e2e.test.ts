import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import worker from "../src/index.ts";
import { createMockEnv, mockFetch } from "./test_utils.js";

const mockEnv = createMockEnv();

const sampleHtml = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta http-equiv="refresh" content="0; url=https://www.albumoftheyear.org/album/1-okc/" />
    <script type="application/ld+json">
      {"name":"OK Computer","byArtist":{"name":"Radiohead","url":"/artist/1-radiohead/"},"image":"cover.jpg","datePublished":"1997-05-21","genre":["Alternative Rock"]}
    </script>
  </head>
  <body>
    <h1 class="headline artistHeadline pubHeadline criticHeadline songHeadline userHeadline"><a href="/test/">Title</a></h1>
    <div class="date">May 21, 1997</div>
    <div class="content"><div class="title"><a href="/l/1/">News Item</a></div></div>
    <div class="mediaContainer" id="link1"><div class="content"><div class="title"><a href="/l/1/">News</a></div></div></div>
    <div class="albumTopBox info"><div class="detailRow">Format: LP</div></div>
    <div class="detailRow">Track #1 on <a href="/album/1-okc/">OK Computer</a></div>
    <div class="detailRow"><a href="/artist/1-radiohead/">Radiohead</a> <span>/ Producer</span></div>
    <div class="detailRow vibes"><div class="vibe"><a href="/vibe/1-chill/">Chill</a></div></div>
    <div class="totalLength">Total Length: 53:21</div>
    <div class="albumBlock" data-type="lp">
      <div class="image"><a href="/album/1-okc/"><img src="cover.jpg" /></a><div class="mustHear"></div></div>
      <div class="artistTitle">Radiohead</div>
      <div class="albumTitle">OK Computer</div>
      <div class="type">LP</div>
    </div>
    <div class="artistBlock"><a href="/artist/1-radiohead/"><img src="artist.jpg" /><div class="name">Radiohead</div></a></div>
    <div class="labelBlock"><a href="/label/1-xl/"><img src="label.jpg" /><div class="name">XL</div></a></div>
    <div class="userRatingBlock"><a href="/user/1-zed/"><img src="user.jpg" /><div class="name">Zed</div></a></div>
    <div class="songRow"><div class="songTitle"><a href="/song/1-creep/">Creep</a></div><div class="artistTitle"><a href="/artist/1-radiohead/">Radiohead</a></div><div class="scoreValue">90</div></div>
    <div class="listColumn"><div class="listPub"><a href="/list/1/"><img src="list.jpg" alt="Best of 2024" /></a><div class="listText"><a href="/pub/1/">Pitchfork</a></div></div></div>
    <div class="albumListRow" id="rank-1">
      <div class="albumListTitle"><a itemprop="url" href="/album/1-okc/">Radiohead - OK Computer</a></div>
      <div class="albumListRank"><span itemprop="position">1</span></div>
      <div class="albumListCover"><img src="cover.jpg" /></div>
      <div class="scoreValue">95</div>
    </div>
    <div class="userListRow">
      <div class="listTitle"><a href="/user/zed/list/1/">Best Albums</a></div>
      <div class="byLine"><a href="/user/zed/">Zed</a></div>
      <div class="listDescription">My favorite albums</div>
    </div>
    <div class="albumReviewRow" id="review_1">
      <div class="userReviewName"><a href="/user/zed/">Zed</a></div>
      <div class="albumReviewText user"><p>Masterpiece</p></div>
      <div class="rating">100</div>
      <div class="albumReviewHeader"><div class="publication"><a href="/pub/1/">Pitchfork</a></div></div>
      <div class="albumReviewRating">10</div>
    </div>
    <div class="songRatings"><div class="cell profilePic"><a href="/user/zed/"><img src="zed.jpg" /></a></div><div class="rating">100</div></div>
    <div class="commentRow" id="comment_1">
      <div class="commentUserName"><a href="/user/zed/">Zed</a></div>
      <div class="commentText">Awesome</div>
    </div>
    <div class="tagBlock"><a href="/tag/rock/">rock</a></div>
    <div class="tag"><a href="/tag/rock/">rock</a></div>
    <div class="faqItem"><div class="question">Q</div><div class="answer">A</div></div>
    <div class="changeRow"><div class="date">2024</div><div class="text">Update</div></div>
    <div class="module singleStat"><div class="heading">Stat</div><div class="statValue">100</div></div>
    <div class="module ratings"><div class="heading">Ratings</div><div class="statValue">500</div></div>
    <div class="subHeadline scoreTrend">Trend</div>
    <div class="ratingHistoryTable"><tr><td class="historyLabel">Milestone</td><td class="historyScore">90</td></tr></div>
    <div class="distRow"><div class="distLabel">100</div><div class="distCount">10</div></div>
    <div class="updateRow"><div class="text">Updated</div></div>
    <div class="heading">Guidelines</div>
    <button class="artistCreditList" data-album-class="c1" data-song-class="c2">Producer</button> <span class="facetCount">(5)</span>
    <div class="genreRow"><a href="/genre/1-rock/">Rock</a><span class="count">10</span></div>
    <div class="badgeRow"><div class="title">Reviewer</div></div>
    <button class="showImage" data-user-id="123"></button>
    <div class="userName"><a title="zed">Zed</a></div>
    <ol class="ranked"><li data-album-index="0"><a href="/album/1-okc/">Radiohead - OK Computer</a></li></ol>
    <div class="listSummaryRow">
      <div class="listSummaryRank">1</div>
      <h2 class="albumTitle listSummary"><a href="/album/1-okc/">OK Computer</a></h2>
      <h3 class="artistTitle listSummary"><a href="/artist/1-radiohead/">Radiohead</a></h3>
      <div class="summaryPoints"><a href="#">500 Points</a></div>
      <div class="pointsTable"><div class="summaryPointsMisc"><div class="head">1st Place</div><div class="count">10</div></div></div>
    </div>
    <div class="listSummaryRow">
      <div class="listSummaryRank song">1</div>
      <h2 class="artistTitle listSummary song"><a href="/artist/1-radiohead/">Radiohead</a></h2>
      <h3 class="albumTitle listSummary song"><a href="/song/1-creep/">Creep</a></h3>
      <div class="pointsTable song"><div class="summaryPointsMisc"><div class="head">Points</div><div class="count">50</div></div></div>
    </div>
  </body>
  </html>
`;

describe("End-to-End API Smoke Tests for all 84+ endpoints", () => {
  let restoreFetch: () => void;

  beforeAll(() => {
    restoreFetch = mockFetch(async (url: string | URL | Request) => {
      const urlStr = typeof url === "string" ? url : url instanceof Request ? url.url : url.toString();
      if (urlStr.includes("albumTagAutocomplete.php")) {
        return new Response(JSON.stringify([{ value: "alternative rock" }]), { status: 200 });
      }
      if (urlStr.includes("labelAutocomplete.php")) {
        return new Response(JSON.stringify([{ value: "Def Jam", link: "/label/1-def-jam/" }]), { status: 200 });
      }
      if (urlStr.includes("albumGenreAutocomplete.php")) {
        return new Response(JSON.stringify([{ id: "7", value: "Rock", link: "/genre/7-rock/" }]), { status: 200 });
      }
      if (urlStr.includes("autocomplete.php")) {
        return new Response(JSON.stringify([{ value: "Radiohead", link: "/artist/1-radiohead/" }]), { status: 200 });
      }
      if (urlStr.includes("feed/news.xml")) {
        return new Response(`<?xml version="1.0"?><rss version="2.0"><channel><title>AOTY News</title><link>https://www.albumoftheyear.org/news/</link><item><title>News 1</title><link>https://www.albumoftheyear.org/l/1/</link></item></channel></rss>`, { status: 200 });
      }
      if (urlStr.includes("moreStatsAlbum.php")) {
        return new Response("favorites: 100\nlikes: 200\nlistens: 300\nlibrary: 400\nlists: 500", { status: 200 });
      }
      if (urlStr.includes("getGenreName.php")) {
        return new Response("Rock", { status: 200 });
      }
      if (urlStr.includes("showImage.php")) {
        return new Response('<div id="curImage"><img src="cover.jpg" /></div><div id="img_0" class="thumbnail selected"><img src="cover.jpg" alt="Cover" title="Cover" /></div>', { status: 200 });
      }
      if (urlStr.includes("showArtistRatings.php")) {
        return new Response('<table><tr><td class="rank">1</td><td class="tableCover"><a href="/album/1/"><img src="c.jpg"></a></td><td class="albumInfo"><div class="largeTitle"><a href="/album/1/">Album</a></div></td><td class="tableRating"><div class="green-font">100</div></td></tr></table>', { status: 200 });
      }
      if (urlStr.includes("showMore.php")) {
        return new Response('<div class="userBlock ten"><a href="/user/zed/"><img src="user.jpg" /></a><div class="userName"><a href="/user/zed/">Zed</a></div></div>', { status: 200 });
      }
      if (urlStr.includes("showUserTrackRatings.php")) {
        return new Response('<div class="albumHeadline small"><h1 class="albumTitle"><a href="#">Radiohead - OK Computer</a></h1></div><table><tr><td class="trackNumber">1</td><td class="trackTitle"><a href="/song/1/">Airbag</a></td><td class="trackRating">100</td></tr></table>', { status: 200 });
      }
      if (urlStr.includes("viewAllComments.php")) {
        return new Response('<div id="reply1" class="commentRow"><div class="commentUserName"><a href="#">Zed</a></div><div class="commentText">Cool</div></div>', { status: 200 });
      }
      if (urlStr.includes("sourceSelect.php")) {
        return new Response('<div class="columns"><div><a href="/ratings/12-av-club/2026/1">AV Club</a></div></div>', { status: 200 });
      }
      if (urlStr.includes("genreSelect.php")) {
        return new Response('<div id="results"><div class="columns"><div><a href="/genre/7-rock/2026/">Rock</a></div></div></div>', { status: 200 });
      }
      return new Response(sampleHtml, { status: 200 });
    });
  });

  afterAll(() => {
    restoreFetch();
  });

  const endpoints: Array<{ path: string; expectedProp: string }> = [
    { path: "/album?slug=1-okc", expectedProp: "title" },
    { path: "/album?slug=1-okc&minimal=true", expectedProp: "title" },
    { path: "/album?artist=Radiohead&name=OK+Computer", expectedProp: "title" },
    { path: "/releases", expectedProp: "albums" },
    { path: "/releases/singles", expectedProp: "albums" },
    { path: "/releases/this-week", expectedProp: "albums" },
    { path: "/releases/by-date?year=2024", expectedProp: "albums" },
    { path: "/releases/by-date?year=2024&month=may", expectedProp: "albums" },
    { path: "/releases/by-date?year=2024&week=20", expectedProp: "albums" },
    { path: "/releases/by-date?decade=2020s", expectedProp: "albums" },
    { path: "/releases/vibe?vibe=chill", expectedProp: "albums" },
    { path: "/recently-added", expectedProp: "albums" },
    { path: "/on-this-day", expectedProp: "albums" },
    { path: "/upcoming", expectedProp: "albums" },
    { path: "/discover", expectedProp: "albums" },
    { path: "/discover/singles", expectedProp: "albums" },
    { path: "/discover/anticipated", expectedProp: "albums" },
    { path: "/discover/under-radar", expectedProp: "albums" },
    { path: "/discover/top-rated", expectedProp: "albums" },
    { path: "/discover/people", expectedProp: "albums" },
    { path: "/must-hear?year=2024", expectedProp: "albums" },
    { path: "/must-hear?decade=2020s", expectedProp: "albums" },
    { path: "/must-hear", expectedProp: "albums" },
    { path: "/news", expectedProp: "items" },
    { path: "/news?type=new", expectedProp: "items" },
    { path: "/news?type=comment", expectedProp: "items" },
    { path: "/news-item?slug=1-news", expectedProp: "title" },
    { path: "/lists?year=2024", expectedProp: "lists" },
    { path: "/lists?sort=newest", expectedProp: "lists" },
    { path: "/lists/users", expectedProp: "lists" },
    { path: "/list/1-best", expectedProp: "items" },
    { path: "/search?q=radiohead", expectedProp: "albums" },
    { path: "/search/albums?q=okc", expectedProp: "albums" },
    { path: "/search/artists?q=radiohead", expectedProp: "artists" },
    { path: "/search/labels?q=xl", expectedProp: "labels" },
    { path: "/search/lists?q=best", expectedProp: "lists" },
    { path: "/search/news?q=tour", expectedProp: "news" },
    { path: "/search/tags?q=rock", expectedProp: "tags" },
    { path: "/search/users?q=zed", expectedProp: "users" },
    { path: "/artist?slug=1-radiohead", expectedProp: "name" },
    { path: "/artist?slug=1-radiohead&type=lp&sort=rating", expectedProp: "name" },
    { path: "/artist/similar?slug=1-radiohead", expectedProp: "artists" },
    { path: "/artist/songs?slug=1-radiohead", expectedProp: "songs" },
    { path: "/artist/news?slug=1-radiohead", expectedProp: "items" },
    { path: "/artist/credits?slug=1-radiohead", expectedProp: "roles" },
    { path: "/artist/credits?slug=1-radiohead&role=producer", expectedProp: "albums" },
    { path: "/random/artist", expectedProp: "name" },
    { path: "/random/album", expectedProp: "title" },
    { path: "/album/tags/autocomplete?q=art", expectedProp: "tags" },
    { path: "/label?slug=1-xl", expectedProp: "name" },
    { path: "/genres", expectedProp: "genres" },
    { path: "/subgenres?genreId=1", expectedProp: "subgenres" },
    { path: "/genre?slug=rock", expectedProp: "name" },
    { path: "/genre?slug=rock&period=recent", expectedProp: "name" },
    { path: "/genre?slug=rock&period=2024", expectedProp: "name" },
    { path: "/tag?tag=rock", expectedProp: "albums" },
    { path: "/tag?tag=rock&type=media", expectedProp: "media" },
    { path: "/publication?slug=1-pitchfork", expectedProp: "name" },
    { path: "/publication/reviews?slug=1-pitchfork", expectedProp: "reviews" },
    { path: "/publication/lists?slug=1-pitchfork", expectedProp: "lists" },
    { path: "/publication/perfect?slug=1-pitchfork", expectedProp: "sections" },
    { path: "/artists", expectedProp: "sections" },
    { path: "/faq", expectedProp: "items" },
    { path: "/changelog", expectedProp: "entries" },
    { path: "/critic?slug=1-rob", expectedProp: "name" },
    { path: "/song?slug=1-creep", expectedProp: "title" },
    { path: "/song/ratings?slug=1-creep", expectedProp: "ratings" },
    { path: "/songs/top?period=2024", expectedProp: "songs" },
    { path: "/songs/top?year=2024", expectedProp: "songs" },
    { path: "/user?username=zed", expectedProp: "username" },
    { path: "/user/ratings?username=zed", expectedProp: "ratings" },
    { path: "/user/reviews?username=zed", expectedProp: "reviews" },
    { path: "/user/listened?username=zed", expectedProp: "ratings" },
    { path: "/user/library?username=zed", expectedProp: "ratings" },
    { path: "/user/liked-albums?username=zed", expectedProp: "ratings" },
    { path: "/user/tags?username=zed", expectedProp: "tags" },
    { path: "/user/tag?username=zed&tag=rock", expectedProp: "ratings" },
    { path: "/user/lists?username=zed", expectedProp: "lists" },
    { path: "/user/list?username=zed&slug=1-best", expectedProp: "title" },
    { path: "/user/followers?username=zed", expectedProp: "users" },
    { path: "/user/following?username=zed", expectedProp: "users" },
    { path: "/user/review?username=zed&slug=1-okc", expectedProp: "album" },
    { path: "/users", expectedProp: "reviews" },
    { path: "/user-reviews", expectedProp: "reviews" },
    { path: "/user-reviews?period=popular", expectedProp: "reviews" },
    { path: "/ratings", expectedProp: "items" },
    { path: "/ratings?source=user-highest-rated&genre=rock", expectedProp: "items" },
    { path: "/top-artists", expectedProp: "artists" },
    { path: "/top-artists?scope=users&genre=rock", expectedProp: "artists" },
    { path: "/album/similar?slug=1-okc", expectedProp: "albums" },
    { path: "/album/user-reviews?slug=1-okc", expectedProp: "reviews" },
    { path: "/album/critic-lists?slug=1-okc", expectedProp: "lists" },
    { path: "/album/critic-reviews?slug=1-okc", expectedProp: "reviews" },
    { path: "/album/tags?slug=1-okc", expectedProp: "tags" },
    { path: "/album/rating-history?albumId=1", expectedProp: "milestones" },
    { path: "/album/distribution?albumId=1", expectedProp: "rows" },
    { path: "/album/comments/replies?albumId=1&commentId=1", expectedProp: "replies" },
    { path: "/album/comments?slug=1-okc", expectedProp: "comments" },
    { path: "/album/user-lists?slug=1-okc", expectedProp: "lists" },
    { path: "/updates", expectedProp: "updates" },
    { path: "/home", expectedProp: "newReleases" },
    { path: "/stats", expectedProp: "totals" },
    { path: "/guidelines?type=review", expectedProp: "title" },
    { path: "/guidelines?type=comment", expectedProp: "title" },
    { path: "/labels/autocomplete?q=def", expectedProp: "suggestions" },
    { path: "/label/autocomplete?q=def", expectedProp: "suggestions" },
    { path: "/search/autocomplete?q=radio", expectedProp: "suggestions" },
    { path: "/user/genres?username=zed", expectedProp: "genres" },
    { path: "/user/badges?username=zed", expectedProp: "badges" },
    { path: "/feed/news", expectedProp: "items" },
    { path: "/list/summary?year=2024", expectedProp: "items" },
    { path: "/year-end?year=2024", expectedProp: "items" },
    { path: "/songs/best?year=2024", expectedProp: "songs" },
    { path: "/user/year-end?username=zed&year=2024", expectedProp: "albums" },
    { path: "/user/distribution?username=zed", expectedProp: "rows" },
    { path: "/genre/name?id=7", expectedProp: "name" },
    { path: "/user/artist-ratings?username=zed&artistId=1", expectedProp: "ratings" },
    { path: "/album/likes?albumId=1", expectedProp: "users" },
    { path: "/album/in-library?albumId=1", expectedProp: "users" },
    { path: "/album/images?albumId=1", expectedProp: "images" },
    { path: "/user/track-ratings?username=zed&albumId=1", expectedProp: "tracks" },
    { path: "/comments?type=user_review&itemId=1", expectedProp: "comments" },
    { path: "/album/corrections?albumId=1", expectedProp: "title" },
    { path: "/artist/corrections?slug=1-radiohead", expectedProp: "title" },
    { path: "/song/corrections?songId=1", expectedProp: "title" },
    { path: "/releases/this-week/singles", expectedProp: "albums" },
    { path: "/releases/decade?decade=2020s", expectedProp: "albums" },
    { path: "/releases/month?month=september-09", expectedProp: "albums" },
    { path: "/releases/week?week=36", expectedProp: "albums" },
    { path: "/user/perfect?username=zed", expectedProp: "ratings" },
    { path: "/critic/reviews?slug=1-rob", expectedProp: "name" },
    { path: "/comments/all?type=user_review&itemId=1", expectedProp: "comments" },
    { path: "/artist/top-songs?slug=1-radiohead", expectedProp: "songs" },
    { path: "/search/all?q=radiohead", expectedProp: "albums" },
    { path: "/genre/autocomplete?q=rock", expectedProp: "suggestions" },
    { path: "/album/library?albumId=1", expectedProp: "users" },
    { path: "/album/streaming-links?slug=1-okc", expectedProp: "streamingLinks" },
    { path: "/ratings/sources?year=2024", expectedProp: "sources" },
    { path: "/ratings/genres?year=2024", expectedProp: "genres" },
  ];

  for (const { path, expectedProp } of endpoints) {
    it(`GET ${path} returns 200 with property "${expectedProp}"`, async () => {
      const req = new Request(`http://localhost${path}`);
      const res = await worker.fetch(req, mockEnv);
      expect(res.status).toBe(200);
      expect(res.headers.get("access-control-allow-origin")).toBe("*");
      expect(res.headers.get("content-type")).toContain("application/json");

      const json = (await res.json()) as Record<string, unknown>;
      expect(json).toBeDefined();
      expect(json[expectedProp]).toBeDefined();
    });
  }

  it("GET /feed/news.xml returns 200 with application/xml", async () => {
    const req = new Request("http://localhost/feed/news.xml");
    const res = await worker.fetch(req, mockEnv);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/xml");
    const text = await res.text();
    expect(text).toContain("<rss");
  });

  it("GET /feed/news?format=xml returns 200 with application/xml", async () => {
    const req = new Request("http://localhost/feed/news?format=xml");
    const res = await worker.fetch(req, mockEnv);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/xml");
    const text = await res.text();
    expect(text).toContain("<rss");
  });
});
