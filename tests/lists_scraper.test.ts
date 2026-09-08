import { describe, it, expect } from "bun:test";
import { scrapeListsIndex, scrapeListDetail, scrapeYearEndSummary, scrapeCommunityYearEnd } from "../src/scrapers/lists.js";
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

describe("scrapeYearEndSummary unit test", () => {
  it("parses critic year-end list summary correctly", async () => {
    const html = `
      <p class="grayBox">These numbers are obtained from the <strong>113</strong> lists found at the end of this page.</p>
      <div class="listSummaryRow">
        <div class="listSummaryRank">1</div>
        <div class="listSummaryCover"><a href="/album/1507961-rosalia-lux.php"><img src="https://cdn2.aoty.org/lux.jpg" /></a></div>
        <h2 class="albumTitle listSummary"><a href="/album/1507961-rosalia-lux.php">LUX</a></h2>
        <h3 class="artistTitle listSummary"><a href="/artist/30805-rosalia/">ROSALÍA</a></h3>
        <div class="summaryPoints"><a href="#">413 Points</a></div>
        <div class="pointsTable">
          <div class="summaryPointsMisc"><div class="head">1st Place</div><div class="count">11</div></div>
          <div class="summaryPointsMisc"><div class="head">2nd Place</div><div class="count">12</div></div>
          <div class="summaryPointsMisc"><div class="head">3rd Place</div><div class="count">5</div></div>
          <div class="summaryPointsMisc"><div class="head">Top 10</div><div class="count">23</div></div>
          <div class="summaryPointsMisc"><div class="head">Top 25</div><div class="count">8</div></div>
          <div class="summaryPointsMisc"><div class="head">Other</div><div class="count">16</div></div>
        </div>
        <div class="albumListLinks listSummary">
          <a href="https://spotify.com/album/123"><div>Spotify</div></a>
          <a href="https://music.apple.com/album/123"><div>Apple Music</div></a>
        </div>
      </div>
    `;

    const restore = mockFetch(async () => new Response(html, { status: 200 }));
    try {
      const summary = await scrapeYearEndSummary(2025, "hip-hop");
      expect(summary.year).toBe(2025);
      expect(summary.genre).toBe("hip-hop");
      expect(summary.totalLists).toBe(113);
      expect(summary.items.length).toBe(1);
      expect(summary.items[0]?.rank).toBe(1);
      expect(summary.items[0]?.artist).toBe("ROSALÍA");
      expect(summary.items[0]?.artistUrl).toContain("/artist/30805-rosalia/");
      expect(summary.items[0]?.album).toBe("LUX");
      expect(summary.items[0]?.albumUrl).toContain("/album/1507961-rosalia-lux.php");
      expect(summary.items[0]?.cover).toBe("https://cdn2.aoty.org/lux.jpg");
      expect(summary.items[0]?.points).toBe(413);
      expect(summary.items[0]?.breakdown.firstPlace).toBe(11);
      expect(summary.items[0]?.breakdown.secondPlace).toBe(12);
      expect(summary.items[0]?.breakdown.thirdPlace).toBe(5);
      expect(summary.items[0]?.breakdown.top10).toBe(23);
      expect(summary.items[0]?.breakdown.top25).toBe(8);
      expect(summary.items[0]?.breakdown.other).toBe(16);
      expect(summary.items[0]?.streamingLinks.length).toBe(2);
      expect(summary.items[0]?.streamingLinks[0]?.platform).toBe("Spotify");
    } finally {
      restore();
    }
  });
});

describe("scrapeCommunityYearEnd unit test", () => {
  it("parses community year-end list aggregate correctly", async () => {
    const html = `
      <div class="grayBox"><div>This ranking is based on <strong>6,355</strong> lists submitted by the community.</div></div>
      <div class="listSummaryRow">
        <div class="listSummaryRank">1</div>
        <div class="listSummaryCover"><a href="/album/991217-clipse.php"><img src="https://cdn2.aoty.org/clipse.jpg" /></a></div>
        <h2 class="albumTitle listSummary"><a href="/album/991217-clipse.php">Let God Sort Em Out</a></h2>
        <h3 class="artistTitle listSummary"><a href="/artist/500-clipse/">Clipse</a></h3>
        <div class="summaryPoints"><a href="#">18,108 Points</a></div>
        <div class="pointsTable">
          <div class="summaryPointsMisc"><div class="head">1st Place</div><div class="count">507</div></div>
          <div class="summaryPointsMisc"><div class="head">2nd Place</div><div class="count">418</div></div>
          <div class="summaryPointsMisc"><div class="head">3rd Place</div><div class="count">334</div></div>
          <div class="summaryPointsMisc"><div class="head">Top 10</div><div class="count">1150</div></div>
          <div class="summaryPointsMisc"><div class="head">Top 25</div><div class="count">450</div></div>
          <div class="summaryPointsMisc"><div class="head">Other</div><div class="count">242</div></div>
        </div>
      </div>
    `;

    const restore = mockFetch(async () => new Response(html, { status: 200 }));
    try {
      const result = await scrapeCommunityYearEnd(2025);
      expect(result.year).toBe(2025);
      expect(result.totalLists).toBe(6355);
      expect(result.items.length).toBe(1);
      expect(result.items[0]?.rank).toBe(1);
      expect(result.items[0]?.artist).toBe("Clipse");
      expect(result.items[0]?.album).toBe("Let God Sort Em Out");
      expect(result.items[0]?.points).toBe(18108);
      expect(result.items[0]?.breakdown.firstPlace).toBe(507);
    } finally {
      restore();
    }
  });
});
