import { describe, it, expect } from "bun:test";
import {
  scrapeAlbumCriticLists,
  scrapeFaq,
  scrapeChangelog,
  scrapeSiteStats,
  scrapeCommentsPage,
  scrapeCommentRows,
  scrapeNewsDetail,
  scrapeSearchNews,
  scrapeSearchTags,
  scrapeSiteUpdates,
  scrapeAlbumCommentReplies,
  scrapeAlbumSubAlbums,
  scrapeAlbumUserLists,
  scrapeHomepage,
  scrapeGuidelines,
} from "../src/scrapers/social.js";

describe("social scrapers unit tests", () => {
  it("parses guidelines correctly", async () => {
    const reviewGuidelinesHtml = `
      <div class="heading">Review Guidelines</div>
      <div class="sectionTitle">Best Practices</div>
      <ul><li>Write thorough thoughts.</li></ul>
      <div class="sectionTitle">What to Avoid</div>
      <ul><li>Spamming.</li></ul>
      <div class="footnote">Follow standard etiquette.</div>
    `;

    const commentGuidelinesHtml = `
      <div class="heading">Comment Guidelines</div>
      <p><strong>Rule 1:</strong> Be respectful.</p>
      <p>Stay on topic.</p>
    `;

    const originalFetch = globalThis.fetch;
    try {
        globalThis.fetch = async () => new Response(reviewGuidelinesHtml, { status: 200 });
      const revG = await scrapeGuidelines("review");
      expect(revG.type).toBe("review");
      expect(revG.title).toBe("Review Guidelines");
      expect(revG.bestPractices).toEqual(["Write thorough thoughts."]);
      expect(revG.whatToAvoid).toEqual(["Spamming."]);
      expect(revG.footnote).toBe("Follow standard etiquette.");

        globalThis.fetch = async () => new Response(commentGuidelinesHtml, { status: 200 });
      const comG = await scrapeGuidelines("comment");
      expect(comG.type).toBe("comment");
      expect(comG.title).toBe("Comment Guidelines");
      expect(comG.sections?.length).toBe(2);
      expect(comG.sections?.[0].title).toBe("Rule 1");
      expect(comG.sections?.[0].text).toBe("Be respectful.");
      expect(comG.sections?.[1].title).toBe("General");
      expect(comG.sections?.[1].text).toBe("Stay on topic.");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("parses album critic lists correctly", async () => {
    const html = `
      <div class="listPub">
        <a href="/list/100-best-albums-2023/">
          <div class="listLogo"><img src="https://cdn.aoty.org/pf.png" alt="Pitchfork Best Albums 2023" /></div>
          <div class="listText"><a href="/publication/1-pitchfork/">Pitchfork</a></div>
          <div class="criticListRank">#1</div>
        </a>
      </div>
    `;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(html, { status: 200 });

    try {
      const res = await scrapeAlbumCriticLists("1-album", undefined, 2);
      expect(res.slug).toBe("1-album");
      expect(res.page).toBe(2);
      expect(res.lists.length).toBe(1);
      expect(res.lists[0].title).toBe("Pitchfork Best Albums 2023");
      expect(res.lists[0].publication).toBe("Pitchfork");
      expect(res.lists[0].publicationUrl).toBe("https://www.albumoftheyear.org/publication/1-pitchfork/");
      expect(res.lists[0].rank).toBe("1");

      const resP1 = await scrapeAlbumCriticLists("1-album");
      expect(resP1.page).toBe(1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("parses FAQ correctly", async () => {
    const html = `
      <div class="faqQuestion">How is the score calculated?</div>
      <div class="faqAnswer">It is an average of all reviews.</div>
    `;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(html, { status: 200 });

    try {
      const faq = await scrapeFaq();
      expect(faq.length).toBe(1);
      expect(faq[0].question).toBe("How is the score calculated?");
      expect(faq[0].answer).toBe("It is an average of all reviews.");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("parses changelog correctly", async () => {
    const html = `
      <div class="changeSection">
        <div class="changeDate">2024-01-15</div>
        <div class="changeType">Feature</div>
        <div class="changeTitle">New Search API</div>
        <div class="changeText">Improved search ranking and speed.</div>
      </div>
    `;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(html, { status: 200 });

    try {
      const changelog = await scrapeChangelog();
      expect(changelog.length).toBe(1);
      expect(changelog[0].date).toBe("2024-01-15");
      expect(changelog[0].type).toBe("Feature");
      expect(changelog[0].title).toBe("New Search API");
      expect(changelog[0].text).toBe("Improved search ranking and speed.");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("parses site stats correctly", async () => {
    const html = `
      <div class="module singleStat">
        <div class="heading">Total Albums</div>
        <div class="statValue">500,000</div>
      </div>
      <div class="module">
        <div class="heading">Top Users</div>
        <table>
          <tr><td>User1</td><td>1,000</td></tr>
        </table>
        <div class="refreshStats" data-key="top_users"></div>
        <div class="stats-footer"><div class="timestamp">Updated 1 hour ago</div></div>
      </div>
    `;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(html, { status: 200 });

    try {
      const stats = await scrapeSiteStats();
      expect(stats.totals.length).toBe(1);
      expect(stats.totals[0].name).toBe("Total Albums");
      expect(stats.totals[0].value).toBe("500,000");
      expect(stats.leaderboards.length).toBe(1);
      expect(stats.leaderboards[0].title).toBe("Top Users");
      expect(stats.leaderboards[0].key).toBe("top_users");
      expect(stats.leaderboards[0].timestamp).toBe("Updated 1 hour ago");
      expect(stats.leaderboards[0].items.length).toBe(1);
      expect(stats.leaderboards[0].items[0].name).toBe("User1");
      expect(stats.leaderboards[0].items[0].value).toBe("1,000");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("parses comments and comment replies correctly", async () => {
    const commentHtml = `
      <div class="commentRow" id="comment_123">
        <div class="commentImage"><a href="/user/commenter/"><img src="https://cdn.aoty.org/avatar.jpg" /></a></div>
        <div class="commentUserName"><a>commenter</a></div>
        <div class="commentDate" title="2024-02-01">Yesterday</div>
        <div class="commentText">Awesome release!</div>
        <div class="showReplies"><span>2</span></div>
      </div>
    `;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(commentHtml, { status: 200 });

    try {
      const comments = await scrapeCommentsPage("/album/1-album/comments/");
      expect(comments.length).toBe(1);
      expect(comments[0].id).toBe("123");
      expect(comments[0].username).toBe("commenter");
      expect(comments[0].text).toBe("Awesome release!");
      expect(comments[0].replies).toBe("2");

      const repliesRes = await scrapeAlbumCommentReplies("1", "123");
      expect(repliesRes.albumId).toBe("1");
      expect(repliesRes.commentId).toBe("123");
      expect(repliesRes.replies.length).toBe(1);

      const rows = await scrapeCommentRows(new Response(commentHtml, { status: 200 }));
      expect(rows.length).toBe(1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("parses news detail correctly", async () => {
    const html = `
      <div class="mediaHeader">
        <h1><a href="https://pitchfork.com/news">Radiohead Announces Tour</a></h1>
        <div class="image"><img src="https://cdn.aoty.org/rh.jpg" /></div>
      </div>
      <div class="mediaByline">
        <span class="mediaDate">May 1, 2024</span>
        <a href="https://pitchfork.com">Pitchfork</a>
      </div>
      <div class="mediaText">The band announced new world tour dates today.</div>
      <div class="points">50</div>
      <div class="mediaEmbed"><iframe src="https://www.youtube.com/embed/abc"></iframe></div>
      <div class="inlineRelated"><a href="/artist/1-radiohead/">Radiohead</a></div>
      <div class="listenOn">
        <a href="https://open.spotify.com/album/1">Spotify</a>
        <a href="https://music.apple.com/album/1">Apple Music</a>
        <a href="https://music.amazon.com/album/1">Amazon</a>
        <a href="https://radiohead.bandcamp.com/album/1">Bandcamp</a>
        <a href="https://soundcloud.com/artist/track">SoundCloud</a>
        <a href="https://custom.fm/album/1">Custom</a>
      </div>
    `;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(html, { status: 200 });

    try {
      const news = await scrapeNewsDetail("100-radiohead-tour");
      expect(news.id).toBe("100");
      expect(news.title).toBe("Radiohead Announces Tour");
      expect(news.source).toBe("Pitchfork");
      expect(news.likes).toBe("50");
      expect(news.embedUrl).toBe("https://www.youtube.com/embed/abc");
      expect(news.related.length).toBe(1);
      expect(news.streamingLinks.length).toBe(6);
      expect(news.streamingLinks[0].platform).toBe("Spotify");
      expect(news.streamingLinks[1].platform).toBe("Apple Music");
      expect(news.streamingLinks[2].platform).toBe("Amazon");
      expect(news.streamingLinks[3].platform).toBe("Bandcamp");
      expect(news.streamingLinks[4].platform).toBe("SoundCloud");
      expect(news.streamingLinks[5].platform).toBe("custom.fm");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("parses search news and search tags", async () => {
    const newsHtml = `
      <div class="newsBlockLarge">
        <a href="/l/50-tour/">World Tour Announced</a>
        <img src="https://cdn.aoty.org/tour.jpg" />
        <div class="domain">pitchfork.com</div>
      </div>
    `;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(newsHtml, { status: 200 });

    try {
      const resNews = await scrapeSearchNews("tour", undefined, 1);
      expect(resNews.news.length).toBe(1);
      expect(resNews.news[0].title).toBe("World Tour Announced");
      expect(resNews.news[0].source).toBe("pitchfork.com");
    } finally {
      globalThis.fetch = originalFetch;
    }

    const tagHtml = `
      <div class="tagRow">
        <a href="/tag/shoegaze/">shoegaze</a>
      </div>
    `;

    globalThis.fetch = async () => new Response(tagHtml, { status: 200 });

    try {
      const resTags = await scrapeSearchTags("shoe", undefined, 1);
      expect(resTags.tags.length).toBe(1);
      expect(resTags.tags[0].name).toBe("shoegaze");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("parses site updates, album sub-albums, and album user lists", async () => {
    const updHtml = `
      <div class="upd">
        <div class="updHead">New Review</div>
        <div class="updText">
          <a href="/album/1-okc/">OK Computer</a>
          <a href="/artist/1-radiohead/">Radiohead</a>
          <p>Scored 100/100</p>
        </div>
        <div class="updImage"><img src="https://cdn.aoty.org/okc.jpg" /></div>
        <div class="small-font">5 minutes ago</div>
      </div>
    `;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(updHtml, { status: 200 });

    try {
      const updates = await scrapeSiteUpdates(undefined, "all", 2);
      expect(updates.filter).toBe("all");
      expect(updates.page).toBe(2);
      expect(updates.updates.length).toBe(1);
      expect(updates.updates[0].kind).toBe("New Review");
      expect(updates.updates[0].title).toBe("OK Computer");
      expect(updates.updates[0].artist).toBe("Radiohead");
      expect(updates.updates[0].timeAgo).toBe("5 minutes ago");

      const defaultUpdates = await scrapeSiteUpdates();
      expect(defaultUpdates.filter).toBeNull();
      expect(defaultUpdates.page).toBe(1);
      expect(defaultUpdates.updates.length).toBe(1);
    } finally {
      globalThis.fetch = originalFetch;
    }

    const albumBlockHtml = `
      <div class="albumBlock"><div class="albumTitle">In Rainbows</div></div>
    `;

    globalThis.fetch = async () => new Response(albumBlockHtml, { status: 200 });

    try {
      const subAlbums = await scrapeAlbumSubAlbums("1-radiohead", "similar", undefined, 2);
      expect(subAlbums.page).toBe(2);
      expect(subAlbums.albums.length).toBe(1);

      const subAlbumsP1 = await scrapeAlbumSubAlbums("1-radiohead", "similar");
      expect(subAlbumsP1.page).toBe(1);
    } finally {
      globalThis.fetch = originalFetch;
    }

    const userListHtml = `
      <div class="userListRow">
        <div class="listTitle"><a href="/user/fan/list/1/">Top Albums</a></div>
        <div class="byLine"><a href="/user/fan/">fan</a></div>
        <div class="userImage"><img src="https://cdn.aoty.org/fan.jpg" /></div>
        <div class="covers"><img src="https://cdn.aoty.org/c1.jpg" /></div>
        <div class="listDescription">My favorite albums of all time.</div>
        <div class="points">10</div>
        <div class="comment_count">2</div>
      </div>
    `;

    globalThis.fetch = async () => new Response(userListHtml, { status: 200 });

    try {
      const userLists = await scrapeAlbumUserLists("1-okc", undefined, 2);
      expect(userLists.length).toBe(1);
      expect(userLists[0].title).toBe("Top Albums");
      expect(userLists[0].description).toBe("My favorite albums of all time.");
      expect(userLists[0].likes).toBe("10");
      expect(userLists[0].comments).toBe("2");

      const userListsP1 = await scrapeAlbumUserLists("1-okc");
      expect(userListsP1.length).toBe(1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("parses homepage structure", async () => {
    const html = `
      <div class="albumBlock"><div class="albumTitle">Album</div></div>
    `;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(html, { status: 200 });

    try {
      const home = await scrapeHomepage();
      expect(home).toBeDefined();
      expect(home.newReleases).toBeDefined();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("handles fetch errors across social scrapers", async () => {
    const originalFetch = globalThis.fetch;
    try {
        globalThis.fetch = async () => new Response("Error", { status: 500 });
      expect(scrapeAlbumCriticLists("1-slug")).rejects.toThrow("Album critic lists fetch failed: 500");
      expect(scrapeFaq()).rejects.toThrow("FAQ fetch failed: 500");
      expect(scrapeGuidelines("review")).rejects.toThrow("Guidelines fetch failed: 500");
      expect(scrapeChangelog()).rejects.toThrow("Changelog fetch failed: 500");
      expect(scrapeSiteStats()).rejects.toThrow("Site stats fetch failed: 500");
      expect(scrapeCommentsPage("http://mock/comments/")).rejects.toThrow("Comments fetch failed: 500");
      expect(scrapeNewsDetail("1-news")).rejects.toThrow("News item fetch failed: 500");
      expect(scrapeSearchNews("query")).rejects.toThrow("News search failed: 500");
      expect(scrapeSearchTags("query")).rejects.toThrow("Tag search failed: 500");
      expect(scrapeSiteUpdates()).rejects.toThrow("Updates fetch failed: 500");
      expect(scrapeAlbumCommentReplies("1", "2")).rejects.toThrow("Comment replies fetch failed: 500");
      expect(scrapeAlbumSubAlbums("1-album", "similar")).rejects.toThrow("Album similar fetch failed: 500");
      expect(scrapeAlbumUserLists("1-album")).rejects.toThrow("Album user lists fetch failed: 500");

      let count = 0;
        globalThis.fetch = async () => {
        count++;
        if (count === 1) return new Response("<h1>News</h1>", { status: 200 });
        return new Response("Error", { status: 500 });
      };
      expect(scrapeNewsDetail("1-news")).rejects.toThrow("News item fetch failed");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

