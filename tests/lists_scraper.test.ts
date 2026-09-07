import { describe, it, expect } from "bun:test";
import { scrapeListsIndex, scrapeListDetail } from "../src/scrapers/lists.js";
import { mockFetch } from "./test_utils.js";

describe("scrapeListsIndex unit test", () => {
  it("parses publication lists index correctly", async () => {
    const html = `
      <div class="listColumn">
        <div class="listPub">
          <a href="/list/100-pitchfork-best-of-2020/">
            <div class="listLogo"><img src="https://cdn.aoty.org/pitchfork.png" alt="Pitchfork - 50 Best Albums of 2020" /></div>
          </a>
          <div class="listText"><a>Pitchfork</a></div>
        </div>
      </div>
    `;

    const restore = mockFetch(async () => new Response(html, { status: 200 }));
    try {
      const lists = await scrapeListsIndex("https://www.albumoftheyear.org/lists.php");
      expect(lists.length).toBe(1);
      expect(lists[0]?.title).toBe("Pitchfork - 50 Best Albums of 2020");
      expect(lists[0]?.publication).toBe("Pitchfork");
      expect(lists[0]?.url).toContain("/list/100-pitchfork-best-of-2020/");
      expect(lists[0]?.cover).toBe("https://cdn.aoty.org/pitchfork.png");
    } finally {
      restore();
    }
  });
});

describe("scrapeListDetail unit test", () => {
  it("parses list detail page correctly", async () => {
    const html = `
      <div class="listHeader">
        <h1 class="headline">Pitchfork - The 50 Best Albums of 2020</h1>
        <a href="https://pitchfork.com/features/lists-and-guides/best-albums-2020/">Source</a>
      </div>
      <div class="albumListRow">
        <div class="albumListRank"><span itemprop="position">1</span></div>
        <div class="albumListTitle"><a itemprop="url" href="/album/227184-fiona-apple-fetch-the-bolt-cutters.php">Fiona Apple - Fetch the Bolt Cutters</a></div>
        <div class="albumListCover">
          <img src="https://cdn.aoty.org/fetch.jpg" />
          <div class="otherLists">In <strong>15</strong> Lists</div>
        </div>
        <div class="albumListDate">April 17, 2020</div>
        <div class="albumListGenre"><a href="/genre/1-art-pop/">Art Pop</a></div>
        <div class="albumListScoreContainer">
          <div class="scoreValueContainer" title="98.5"><div class="scoreValue">99</div></div>
          <div class="scoreText">42 reviews</div>
        </div>
        <div class="albumListBlurb"><p>An astonishing masterpiece of rhythmic ingenuity.</p></div>
      </div>
    `;

    const restore = mockFetch(async () => new Response(html, { status: 200 }));
    try {
      const detail = await scrapeListDetail("https://www.albumoftheyear.org/list/100/");
      expect(detail.title).toBe("Pitchfork - The 50 Best Albums of 2020");
      expect(detail.sourceUrl).toBe("https://pitchfork.com/features/lists-and-guides/best-albums-2020/");
      expect(detail.items.length).toBe(1);
      expect(detail.items[0]?.rank).toBe("1");
      expect(detail.items[0]?.title).toBe("Fiona Apple - Fetch the Bolt Cutters");
      expect(detail.items[0]?.artist).toBe("Fiona Apple");
      expect(detail.items[0]?.album).toBe("Fetch the Bolt Cutters");
      expect(detail.items[0]?.genres).toEqual(["Art Pop"]);
      expect(detail.items[0]?.score).toBe("99");
      expect(detail.items[0]?.scoreExact).toBe("98.5");
      expect(detail.items[0]?.ratingCount).toBe("42");
      expect(detail.items[0]?.blurb).toBe("An astonishing masterpiece of rhythmic ingenuity.");
      expect(detail.items[0]?.otherLists).toBe(15);
    } finally {
      restore();
    }
  });
});
