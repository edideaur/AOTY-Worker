import { describe, it, expect } from "bun:test";
import { scrapeRatingsChart, scrapeTopArtists } from "../src/scrapers/charts.js";
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
});
