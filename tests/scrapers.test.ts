import { describe, it, expect } from "bun:test";
import { mockFetch } from "./test_utils.js";
import { scrapeAlbumBlocks } from "../src/scrapers/albumBlock.js";
import { scrapeNewsPage, scrapeNewsFeed, scrapeNewsFeedXml } from "../src/scrapers/news.js";
import { scrapeAlbumRatingHistory, scrapeAlbumDistribution } from "../src/scrapers/albumExtras.js";
import { scrapeFaq, scrapeGuidelines, scrapeSiteStats } from "../src/scrapers/social.js";

describe("scrapeAlbumBlocks unit test", () => {
  it("parses album block HTML correctly", async () => {
    const html = `
      <div class="albumBlock" data-type="lp">
        <div class="image">
          <a href="/album/1998-kanye-west-my-beautiful-dark-twisted-fantasy.php">
            <img src="https://cdn.albumoftheyear.org/album/1998.jpg" alt="MBDTF" />
          </a>
          <div class="mustHear"></div>
        </div>
        <div class="artistTitle">Kanye West</div>
        <div class="albumTitle">My Beautiful Dark Twisted Fantasy</div>
        <div class="type">November 22, 2010</div>
        <div class="ratingRow">
          <div class="ratingBlock"><div class="rating">94</div></div>
          <div class="ratingText">Critic Score</div>
          <div class="ratingText">(45)</div>
        </div>
        <div class="ratingRow">
          <div class="ratingBlock"><div class="rating">91</div></div>
          <div class="ratingText">User Score</div>
          <div class="ratingText">(15,200)</div>
        </div>
      </div>
    `;

    const res = new Response(html);
    const albums = await scrapeAlbumBlocks(res);

    expect(albums.length).toBe(1);
    const a = albums[0];
    expect(a.artist).toBe("Kanye West");
    expect(a.title).toBe("My Beautiful Dark Twisted Fantasy");
    expect(a.url).toContain("/album/1998-kanye-west-my-beautiful-dark-twisted-fantasy.php");
    expect(a.mediaType).toBe("lp");
    expect(a.mustHear).toBe(true);
    expect(a.criticScore).toBe("94");
    expect(a.criticCount).toBe("45");
    expect(a.userScore).toBe("91");
    expect(a.userCount).toBe("15,200");
  });
});

describe("scrapeNewsPage unit test", () => {
  it("parses news item HTML correctly", async () => {
    const html = `
      <div class="mediaContainer" id="link12345">
        <div class="image"><img src="https://cdn.albumoftheyear.org/news/123.jpg" /></div>
        <div class="content">
          <div class="title"><a href="/l/12345-new-single/">Radiohead Announces New Album</a></div>
          <div class="source"><a href="https://pitchfork.com">Pitchfork</a></div>
          <div class="postDate">2 hours ago</div>
          <div class="points">42</div>
          <div class="comment_count">18</div>
        </div>
      </div>
    `;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(html, { status: 200 });

    try {
      const news = await scrapeNewsPage("http://mock/l/");
      expect(news.length).toBe(1);
      const n = news[0];
      expect(n.id).toBe("12345");
      expect(n.title).toBe("Radiohead Announces New Album");
      expect(n.source).toBe("Pitchfork");
      expect(n.likes).toBe("42");
      expect(n.comments).toBe("18");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe("scrapeAlbumRatingHistory unit test", () => {
  it("parses milestone rows correctly", async () => {
    const html = `
      <div class="subHeadline scoreTrend">Kanye West - MBDTF Score Trend</div>
      <table class="ratingHistoryTable">
        <tr>
          <td class="historyLabel">250<div style="font-size:10px; color:gray;">Apr 9, 2015*</div></td>
          <td class="historyScore" title="89.5">90</td>
        </tr>
        <tr>
          <td class="historyLabel">500<div style="font-size:10px; color:gray;">Aug 22, 2016*</div></td>
          <td class="historyScore" title="89.9">90</td>
        </tr>
      </table>
    `;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(html, { status: 200 });

    try {
      const history = await scrapeAlbumRatingHistory("1998");
      expect(history.albumId).toBe("1998");
      expect(history.headline).toBe("Kanye West - MBDTF Score Trend");
      expect(history.milestones.length).toBe(2);
      expect(history.milestones[0].milestone).toBe("250");
      expect(history.milestones[0].date).toBe("Apr 9, 2015*");
      expect(history.milestones[0].score).toBe("90");
      expect(history.milestones[0].exactScore).toBe("89.5");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe("scrapeAlbumDistribution unit test", () => {
  it("parses score distribution rows correctly", async () => {
    const html = `
      <table class="dist">
        <tr class="distRow">
          <td class="distLabel">100</td>
          <td class="distCount">10,814</td>
          <td><div class="distBar" style="width:55%;"></div></td>
        </tr>
        <tr class="distRow">
          <td class="distLabel">90 - 99</td>
          <td class="distCount">19,826</td>
          <td class="max"><div class="distBar" style="width:100%;"></div></td>
        </tr>
      </table>
    `;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(html, { status: 200 });

    try {
      const dist = await scrapeAlbumDistribution("1998");
      expect(dist.albumId).toBe("1998");
      expect(dist.format).toBe("all");
      expect(dist.rows.length).toBe(2);
      expect(dist.rows[0].label).toBe("100");
      expect(dist.rows[0].count).toBe(10814);
      expect(dist.rows[0].percentage).toBe("55%");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe("scrapeGuidelines unit test", () => {
  it("parses review guidelines HTML correctly", async () => {
    const html = `
      <div class="heading">Review Guidelines</div>
      <div class="inner">
        <div class="sectionTitle">Best Practices</div>
        <ul>
          <li>Focus on musical content</li>
          <li>Use your own words</li>
        </ul>
        <div class="sectionTitle">What to Avoid</div>
        <ul>
          <li>Posting memes</li>
          <li>Reviewing without listening</li>
        </ul>
        <div class="footnote">Quality standards note.</div>
      </div>
    `;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(html, { status: 200 });

    try {
      const g = await scrapeGuidelines("review");
      expect(g.type).toBe("review");
      expect(g.title).toBe("Review Guidelines");
      expect(g.bestPractices?.length).toBe(2);
      expect(g.bestPractices?.[0]).toBe("Focus on musical content");
      expect(g.whatToAvoid?.length).toBe(2);
      expect(g.whatToAvoid?.[0]).toBe("Posting memes");
      expect(g.footnote).toBe("Quality standards note.");

      // Test comment guidelines
      const commentHtml = `
        <div class="heading">Comment Guidelines</div>
        <p><strong>Be Respectful:</strong> Always treat fellow listeners nicely.</p>
      `;
        globalThis.fetch = async () => new Response(commentHtml, { status: 200 });
      const cg = await scrapeGuidelines("comment");
      expect(cg.type).toBe("comment");
      expect(cg.title).toBe("Comment Guidelines");
      expect(cg.sections?.length).toBe(1);
      expect(cg.sections?.[0].title).toBe("Be Respectful");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe("scrapeAlbumStats and scrapeAlbumCredits unit tests", () => {
  it("parses album stats correctly", async () => {
    const html = `
      <div class="stat">10,000</div>
      <div class="stat">5,000</div>
      <div class="stat">20,000</div>
      <div class="stat">3,000</div>
      <div class="stat">500</div>
    `;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(html, { status: 200 });

    try {
      const { scrapeAlbumStats, scrapeAlbumCredits } = await import("../src/scrapers/albumExtras.js");
      const stats = await scrapeAlbumStats("1998");
      expect(stats?.favorites).toBe(10000);
      expect(stats?.likes).toBe(5000);
      expect(stats?.listens).toBe(20000);
      expect(stats?.libraryCount).toBe(3000);
      expect(stats?.lists).toBe(500);

      const creditsHtml = `
        <div class="sectionTitle">Production</div>
        <div class="credit">
          <div class="photo"><img src="https://cdn.aoty.org/kanye.jpg" /></div>
          <div class="name"><a href="/artist/183-kanye-west/">Kanye West</a></div>
          <div class="songs"><a>Producer</a></div>
        </div>
      `;
        globalThis.fetch = async () => new Response(creditsHtml, { status: 200 });
      const credits = await scrapeAlbumCredits("1998");
      expect(credits?.length).toBe(1);
      expect(credits?.[0].title).toBe("Production");
      expect(credits?.[0].credits.length).toBe(1);
      expect(credits?.[0].credits[0].name).toBe("Kanye West");
      expect(credits?.[0].credits[0].roles).toEqual(["Producer"]);

      // Test catch branches when fetch throws
        globalThis.fetch = async () => { throw new Error("Network failure"); };
      expect(await scrapeAlbumStats("1998")).toBeNull();
      expect(await scrapeAlbumCredits("1998")).toBeNull();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("parses RSS news feed XML correctly", async () => {
    const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
      <rss version="2.0">
        <channel>
          <title>Album of the Year News</title>
          <link>https://www.albumoftheyear.org/news/</link>
          <description>Latest music news from AOTY</description>
          <item>
            <title>Radiohead Announces 2026 Tour</title>
            <link>https://www.albumoftheyear.org/l/100-radiohead/</link>
            <pubDate>Mon, 01 Jun 2026 12:00:00 GMT</pubDate>
            <description>Tour dates announced worldwide.</description>
          </item>
        </channel>
      </rss>
    `;

    const restore = mockFetch(async () => new Response(rssXml, { status: 200 }));
    try {
      const xml = await scrapeNewsFeedXml();
      expect(xml).toContain("<title>Album of the Year News</title>");

      const feed = await scrapeNewsFeed();
      expect(feed.title).toBe("Album of the Year News");
      expect(feed.link).toBe("https://www.albumoftheyear.org/news/");
      expect(feed.description).toBe("Latest music news from AOTY");
      expect(feed.items.length).toBe(1);
      expect(feed.items[0]?.title).toBe("Radiohead Announces 2026 Tour");
      expect(feed.items[0]?.link).toBe("https://www.albumoftheyear.org/l/100-radiohead/");
      expect(feed.items[0]?.pubDate).toBe("Mon, 01 Jun 2026 12:00:00 GMT");
      expect(feed.items[0]?.description).toBe("Tour dates announced worldwide.");
    } finally {
      restore();
    }
  });

  it("handles RSS news feed fetch error", async () => {
    const restore = mockFetch(async () => new Response("Error", { status: 500 }));
    try {
      expect(scrapeNewsFeedXml()).rejects.toThrow("News feed fetch failed: 500");
    } finally {
      restore();
    }
  });
});
