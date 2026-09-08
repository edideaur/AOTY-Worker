import { describe, it, expect } from "bun:test";
import { scrapeSongPage, scrapeSongRatingsPage, scrapeTopSongs, scrapeBestSongsYearEnd } from "../src/scrapers/song.js";
import { mockFetch } from "./test_utils.js";

describe("song scrapers unit tests", () => {
  it("parses song page correctly", async () => {
    const html = `
      <h1 class="songTitle">Ghost Town</h1>
      <div class="albumHeader song"><div class="artist"><a href="/artist/183-kanye-west/">Kanye West</a></div></div>
      <div class="albumHeaderCover"><img src="https://cdn.aoty.org/ye.jpg" /></div>
      <div class="songScore" title="90.5">91</div>
      <div class="songScoreBox"><div class="text">10,000 ratings</div></div>
      <div class="songInfo">
        <div class="detailRow">Track #6 on <a href="/album/112577-kanye-west-ye.php">ye</a></div>
        <div class="detailRow">2018 / Year</div>
        <div class="detailRow">4:31 / duration</div>
        <div class="detailRow"><a href="/artist/183-kanye-west/">Kanye West</a> <span>/ Producer</span></div>
      </div>
      <table class="dist">
        <tr class="distRow">
          <td class="distLabel">100</td>
          <td class="distCount">4,500</td>
        </tr>
        <tr class="distRow">
          <td class="distLabel">90-99</td>
          <td class="distCount">2,300</td>
        </tr>
      </table>
      <div class="tag"><a href="/tag/masterpiece/">Masterpiece</a></div>
      <div class="likeContainer"><strong>99%</strong> of users like this song</div>
      <div class="dislikeContainer"><strong>1%</strong> of users don't like this song</div>
      <table class="trackListTable">
        <tr>
          <td class="trackNumber">1</td>
          <td><a href="/song/100-runaway/">Runaway</a></td>
          <td class="length">9:08</td>
          <td class="trackRating">96</td>
        </tr>
      </table>
      <div class="songRatings">
        <div class="cell profilePic"><a href="/user/zed/"><img src="https://cdn.aoty.org/zed.jpg" /></a></div>
        <div class="cell userName"><a href="/user/zed/" title="zed">zed</a><span class="gray-font">1 day ago</span></div>
        <div class="cell score">100</div>
      </div>
      <div class="commentRow" id="comment_999">
        <div class="commentUserName"><a href="/user/fan/">Fan</a></div>
        <div class="commentImage"><a href="/user/fan/"><img src="https://cdn.aoty.org/fan.jpg" /></a></div>
        <div class="commentDate" title="2024-01-01">Yesterday</div>
        <div class="commentText">One of Kanye's best songs!</div>
        <button class="showReplies"><span>5</span> replies</button>
      </div>
    `;

    const restore = mockFetch(async () => new Response(html, { status: 200 }));
    try {
      const song = await scrapeSongPage("https://www.albumoftheyear.org/song/2580-ghost-town/");
      expect(song.id).toBe("2580");
      expect(song.title).toBe("Ghost Town");
      expect(song.artist).toBe("Kanye West");
      expect(song.userScore).toBe("91");
      expect(song.userScoreExact).toBe("90.5");
      expect(song.ratingCount).toBe("10000");
      expect(song.album).toBe("ye");
      expect(song.trackNumber).toBe("6");
      expect(song.year).toBe("2018");
      expect(song.duration).toBe("4:31");
      expect(song.ratingDistribution).toEqual([
        { label: "100", count: 4500 },
        { label: "90-99", count: 2300 },
      ]);
      expect(song.tags).toEqual([{ name: "Masterpiece", url: "https://www.albumoftheyear.org/tag/masterpiece/" }]);
      expect(song.likePercentage).toBe("99%");
      expect(song.dislikePercentage).toBe("1%");
      expect(song.tracklist?.length).toBe(1);
      expect(song.tracklist?.[0]?.title).toBe("Runaway");
      expect(song.tracklist?.[0]?.score).toBe("96");
      expect(song.topRatings.length).toBe(1);
      expect(song.topRatings[0]?.username).toBe("zed");
      expect(song.topRatings[0]?.rating).toBe("100");
      expect(song.comments.length).toBe(1);
      expect(song.comments[0]?.username).toBe("Fan");
      expect(song.comments[0]?.text).toBe("One of Kanye's best songs!");
      expect(song.comments[0]?.replies).toBe("5");
    } finally {
      restore();
    }
  });

  it("parses song ratings pagination correctly", async () => {
    const html = `
      <div class="songRatings">
        <div class="cell profilePic"><a href="/user/fan/"><img src="https://cdn.aoty.org/fan.jpg" /></a></div>
        <div class="cell userName"><a href="/user/fan/" title="fan">fan</a><span class="gray-font">2 days ago</span></div>
        <div class="cell score">95</div>
      </div>
    `;

    const restore = mockFetch(async () => new Response(html, { status: 200 }));
    try {
      const res = await scrapeSongRatingsPage("2580-ghost-town", 2);
      expect(res.slug).toBe("2580-ghost-town");
      expect(res.page).toBe(2);
      expect(res.ratings.length).toBe(1);
      expect(res.ratings[0]?.username).toBe("fan");
      expect(res.ratings[0]?.rating).toBe("95");
    } finally {
      restore();
    }
  });

  it("parses top songs chart correctly", async () => {
    const html = `
      <table class="trackListTable">
        <tr>
          <td class="coverart"><img src="https://cdn.aoty.org/runaway.jpg" /></td>
          <td class="songAlbum">
            <span class="rank">1</span>
            <a href="/song/100-runaway/">Runaway</a>
            <a href="/artist/183-kanye-west/">Kanye West</a>
            <a href="/album/1998-mbdtf.php">My Beautiful Dark Twisted Fantasy</a>
          </td>
          <td class="trackRating"><span class="green-font">96</span><span class="gray-font">15,000 Ratings</span></td>
        </tr>
      </table>
    `;

    const restore = mockFetch(async () => new Response(html, { status: 200 }));
    try {
      const res = await scrapeTopSongs("2010", 1);
      expect(res.period).toBe("2010");
      expect(res.songs.length).toBe(1);
      expect(res.songs[0]?.title).toBe("Runaway");
      expect(res.songs[0]?.artist).toBe("Kanye West");
      expect(res.songs[0]?.score).toBe("96");
    } finally {
      restore();
    }
  });

  it("parses best songs year-end aggregate correctly", async () => {
    const html = `
      <div class="listSummaryRow">
        <div class="listSummaryRank song">1</div>
        <div class="listSummaryCover song"><a href="/song/880447-the-subway/"><img src="https://cdn.aoty.org/chappell.jpg" /></a></div>
        <h2 class="artistTitle listSummary song"><a href="/artist/111702-chappell-roan/">Chappell Roan</a></h2>
        <h3 class="albumTitle listSummary song"><a href="/song/880447-the-subway/">The Subway</a></h3>
        <div class="pointsTable song">
          <div class="summaryPointsMisc"><div class="head"># Lists</div><div class="count">12</div></div>
          <div class="summaryPointsMisc"><div class="head">Points</div><div class="count">68</div></div>
        </div>
      </div>
    `;

    const restore = mockFetch(async () => new Response(html, { status: 200 }));
    try {
      const res = await scrapeBestSongsYearEnd(2025, "points");
      expect(res.year).toBe(2025);
      expect(res.sort).toBe("points");
      expect(res.songs.length).toBe(1);
      expect(res.songs[0]?.rank).toBe(1);
      expect(res.songs[0]?.artist).toBe("Chappell Roan");
      expect(res.songs[0]?.artists[0]?.name).toBe("Chappell Roan");
      expect(res.songs[0]?.title).toBe("The Subway");
      expect(res.songs[0]?.url).toContain("/song/880447-the-subway/");
      expect(res.songs[0]?.points).toBe(68);
      expect(res.songs[0]?.listsCount).toBe(12);
    } finally {
      restore();
    }
  });
});
