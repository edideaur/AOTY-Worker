import { describe, it, expect } from "bun:test";
import { scrapeRatingsChart, scrapeTopArtists, scrapeRatingSources, scrapeRatingGenres } from "../src/scrapers/charts.js";
import { mockFetch } from "./test_utils.js";

describe("scrapeRatingsChart unit test", () => {
  it("parses chart rows correctly", async () => {
    const html = `
      <div class="albumListRow" id="rank-1">
        <div class="mustHear"></div>
        <div class="albumListCover"><img src="https://cdn.aoty.org/cov1.jpg" /></div>
        <div class="albumListTitle"><a itemprop="url" href="/album/1-ok-computer.php">Radiohead - OK Computer</a></div>
        <div class="albumListDate">May 21, 1997</div>
        <div class="albumListGenre"><a>Art Rock</a>, <a>Alternative Rock</a></div>
        <div class="albumListScoreContainer">
          <div class="scoreValueContainer" title="94.6"><div class="scoreValue">95</div></div>
          <div class="scoreText">12,000 ratings</div>
        </div>
      </div>
    `;

    const restore = mockFetch(async () => new Response(html, { status: 200 }));
    try {
      const items = await scrapeRatingsChart("/ratings/6-highest-rated/1997/1");
      expect(items.length).toBe(1);
      const item = items[0]!;
      expect(item.rank).toBe("1");
      expect(item.title).toBe("Radiohead - OK Computer");
      expect(item.artist).toBe("Radiohead");
      expect(item.album).toBe("OK Computer");
      expect(item.url).toContain("/album/1-ok-computer.php");
      expect(item.cover).toBe("https://cdn.aoty.org/cov1.jpg");
      expect(item.date).toBe("May 21, 1997");
      expect(item.genres).toEqual(["Art Rock", "Alternative Rock"]);
      expect(item.score).toBe("95");
      expect(item.scoreExact).toBe("94.6");
      expect(item.ratingCount).toBe("12,000");
      expect(item.mustHear).toBe(true);
    } finally {
      restore();
    }
  });
});

describe("scrapeTopArtists unit test", () => {
  it("parses top artists correctly", async () => {
    const html = `
      <div class="artistBlock">
        <a href="/artist/1-radiohead/"><img src="https://cdn.aoty.org/rh.jpg" /><div class="name">Radiohead</div></a>
      </div>
    `;

    const restore = mockFetch(async () => new Response(html, { status: 200 }));
    try {
      const artists = await scrapeTopArtists(null, "critics");
      expect(artists.length).toBe(1);
      expect(artists[0]?.name).toBe("Radiohead");
      expect(artists[0]?.url).toContain("/artist/1-radiohead/");
      expect(artists[0]?.image).toBe("https://cdn.aoty.org/rh.jpg");

      const userArtists = await scrapeTopArtists("rock", "users", undefined, 2);
      expect(userArtists.length).toBe(1);
    } finally {
      restore();
    }
  });

  it("parses rating sources from sourceSelect.php correctly", async () => {
    const html = `
      <div class="columns">
        <div><a href="/ratings/12-av-club-highest-rated/2026/1">A.V. Club</a></div>
        <div><a href="/ratings/8-all-music-highest-rated/2026/1">AllMusic</a></div>
      </div>
    `;
    const restore = mockFetch(async () => new Response(html, { status: 200 }));
    try {
      const res = await scrapeRatingSources("2026");
      expect(res.year).toBe("2026");
      expect(res.sources.length).toBe(2);
      expect(res.sources[0]?.name).toBe("A.V. Club");
      expect(res.sources[0]?.slug).toBe("12-av-club-highest-rated");
      expect(res.sources[0]?.url).toContain("/ratings/12-av-club-highest-rated/2026/1");
      expect(res.sources[1]?.name).toBe("AllMusic");
    } finally {
      restore();
    }
  });

  it("parses rating genres from genreSelect.php correctly", async () => {
    const html = `
      <div id="results"><div class="columns">
        <div><a href="/genre/441-alt-pop/2026/">Alt-Pop</a></div>
        <div><a href="/genre/7-rock/2026/">Rock</a></div>
      </div></div>
    `;
    const restore = mockFetch(async () => new Response(html, { status: 200 }));
    try {
      const res = await scrapeRatingGenres("2026");
      expect(res.year).toBe("2026");
      expect(res.genres.length).toBe(2);
      expect(res.genres[0]?.id).toBe("441");
      expect(res.genres[0]?.slug).toBe("441-alt-pop");
      expect(res.genres[0]?.name).toBe("Alt-Pop");
      expect(res.genres[1]?.name).toBe("Rock");
    } finally {
      restore();
    }
  });
});
