import { describe, it, expect } from "bun:test";
import {
  scrapeSimilarArtists,
  scrapeArtistTopSongs,
  scrapeArtistNews,
  scrapeArtistPage,
} from "../src/scrapers/artist.js";

describe("artist scrapers unit tests", () => {
  it("parses similar artists", async () => {
    const html = `
      <div class="artistBlock">
        <a href="/artist/1-radiohead/"><img src="https://cdn.aoty.org/rh.jpg" /><div class="name">Radiohead</div></a>
      </div>
    `;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(html, { status: 200 });

    try {
      const artists = await scrapeSimilarArtists("1-radiohead", undefined, 2);
      expect(artists.length).toBe(1);
      expect(artists[0].name).toBe("Radiohead");

      const artistsP1 = await scrapeSimilarArtists("1-radiohead");
      expect(artistsP1.length).toBe(1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("parses artist top songs", async () => {
    const html = `
      <table class="trackListTable">
        <tr>
          <td class="coverart"><img src="https://cdn.aoty.org/okc_small.jpg" /></td>
          <td class="songAlbum">
            <span class="rank">1</span>
            <a href="/song/1-paranoid-android/">Paranoid Android</a>
            <a href="/artist/1-radiohead/">Radiohead</a>
            <a href="/album/1-ok-computer.php">OK Computer</a>
          </td>
          <td class="trackRating"><span class="green-font">98</span><span class="gray-font">10,000 Ratings</span></td>
        </tr>
        <tr>
          <td class="songAlbum">
            <span class="rank">2</span>
            <a href="/song/2-karma-police/">Karma Police</a>
            <a href="/artist/1-radiohead/">Radiohead</a>
          </td>
          <td class="trackRating"><span class="yellow-font">75</span></td>
        </tr>
        <tr>
          <td class="songAlbum">
            <span class="rank">3</span>
            <a href="/song/3-creep/">Creep</a>
          </td>
          <td class="trackRating"><span class="red-font">50</span></td>
        </tr>
      </table>
    `;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(html, { status: 200 });

    try {
      const songs = await scrapeArtistTopSongs("http://mock/artist/songs");
      expect(songs.length).toBe(3);
      expect(songs[0].title).toBe("Paranoid Android");
      expect(songs[0].score).toBe(98);
      expect(songs[1].score).toBe(75);
      expect(songs[2].score).toBe(50);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("parses artist news", async () => {
    const html = `
      <div class="mediaContainer" id="link555">
        <div class="content">
          <div class="title"><a href="/l/555-tour/">Radiohead Tour</a></div>
          <div class="source"><a href="https://pitchfork.com">Pitchfork</a></div>
          <div class="postDate">Today</div>
          <div class="points">100</div>
          <div class="comment_count">50</div>
        </div>
      </div>
    `;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(html, { status: 200 });

    try {
      const news = await scrapeArtistNews("1-radiohead", undefined, 1, "newsworthy");
      expect(news.slug).toBe("1-radiohead");
      expect(news.type).toBe("newsworthy");
      expect(news.items.length).toBe(1);
      expect(news.items[0].title).toBe("Radiohead Tour");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("parses artist page", async () => {
    const html = `
      <h1 class="artistHeadline">Radiohead</h1>
      <div class="artistImage"><img src="https://cdn.aoty.org/rh.jpg" /></div>
      <div class="artistCriticScore">84</div>
      <div class="artistCriticScoreBox"><div class="text">25 ratings</div></div>
      <div class="artistUserScoreBox"><div class="artistUserScore">88</div><div class="text">1000 ratings</div></div>
      <div class="followCount">50,000 Followers</div>
      <div class="artistTopBox info">
        <div class="detailRow"><a href="/artist/10-thom-yorke/">Thom Yorke</a>, <a href="/artist/11-jonny-greenwood/">Jonny Greenwood</a> <span>/&nbsp;Members</span></div>
        <div class="detailRow"><a href="/artist/12-clive-deamer/">Clive Deamer</a> <span>/&nbsp;Former Members</span></div>
        <div class="detailRow"><a href="/genre/1-indie-rock/">Indie Rock</a> / Genre</div>
        <div class="detailRow"><a href="/artist/2-smile/">The Smile</a> / Member Of</div>
        <div class="detailRow"><a href="/artist/3-on-a-friday/">On a Friday</a> / Formerly Of</div>
        <div class="detailRow"><a href="/artist/5-atoms-for-peace/">Atoms for Peace</a> / Related Artists</div>
        <div class="detailRow">Radio Head / Also Known As</div>
        <div class="detailRow"><a href="https://radiohead.com">Website</a></div>
        <div class="detailRow"><span>Tags</span></div>
        <div class="tag strong"><a href="/tag/indie+rock/artists/">indie rock</a></div>
      </div>
      <div class="sectionHeading"><h2><a href="/artist/1-radiohead/related/">Related Artists</a></h2></div>
      <div class="section relatedArtists">
        <div class="artistBlock"><a href="/artist/4-muse/"><img src="https://cdn.aoty.org/muse.jpg" /><div class="name">Muse</div></a></div>
      </div>
      <h2 class="subHeadline">LP</h2>
      <div class="albumBlock" data-type="LP">
        <div class="image"><a href="/album/1-in-rainbows.php"><img src="https://cdn.aoty.org/ir.jpg" /></a><span class="mustHear">Must Hear</span></div>
        <div class="artistTitle">Radiohead</div>
        <div class="albumTitle">In Rainbows</div>
        <div class="type">2007</div>
        <div class="ratingRow">
          <div class="ratingBlock"><div class="rating">88</div></div>
          <div class="ratingText">critic score</div>
          <div class="ratingText">(45)</div>
          <div class="ratingBlock"><div class="rating">92</div></div>
          <div class="ratingText">user score</div>
          <div class="ratingText">(5000)</div>
        </div>
      </div>
      <table class="trackListTable">
        <tr>
          <td class="coverart"><img src="https://cdn.aoty.org/okc.jpg" /></td>
          <td class="songAlbum">
            <span class="rank">1</span>
            <a href="/song/1-paranoid-android/">Paranoid Android</a>
            <a href="/artist/1-radiohead/">Radiohead</a>
            <a href="/album/1-ok-computer.php">OK Computer</a>
          </td>
          <td class="trackRating"><span class="green-font">98</span><span class="gray-font">10,000 Ratings</span></td>
        </tr>
      </table>
    `;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(html, { status: 200 });

    try {
      const artist = await scrapeArtistPage("http://mock/artist/1-radiohead/");
      expect(artist.name).toBe("Radiohead");
      expect(artist.image).toBe("https://cdn.aoty.org/rh.jpg");
      expect(artist.sections.length).toBe(1);
      expect(artist.members).toEqual([
        { name: "Thom Yorke", url: "https://www.albumoftheyear.org/artist/10-thom-yorke/" },
        { name: "Jonny Greenwood", url: "https://www.albumoftheyear.org/artist/11-jonny-greenwood/" },
      ]);
      expect(artist.formerMembers).toEqual([
        { name: "Clive Deamer", url: "https://www.albumoftheyear.org/artist/12-clive-deamer/" },
      ]);
      expect(artist.relatedArtists).toEqual([{ name: "Atoms for Peace", url: "https://www.albumoftheyear.org/artist/5-atoms-for-peace/" }]);
      expect(artist.tags).toEqual([{ name: "indie rock", url: "https://www.albumoftheyear.org/tag/indie+rock/artists/" }]);
      expect(artist.topSongs.length).toBe(1);
      expect(artist.topSongs[0].title).toBe("Paranoid Android");

      const { scrapeArtistDiscography } = await import("../src/scrapers/artist.js");
      const disco = await scrapeArtistDiscography("http://mock/artist/1-radiohead/");
      expect(disco.length).toBe(1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("parses artist credit roles and credits", async () => {
    const rolesHtml = `
      <button class="artistCreditList" data-album-class="producer" data-song-class="prod">Producer</button>
      <span class="facetCount">(15)</span>
    `;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(rolesHtml, { status: 200 });

    try {
      const { listArtistCreditRoles, scrapeArtistCredits } = await import("../src/scrapers/artist.js");
      const rolesRes = await listArtistCreditRoles("1-radiohead");
      expect(rolesRes.roles.length).toBe(1);
      expect(rolesRes.roles[0].role).toBe("Producer");
      expect(rolesRes.roles[0].count).toBe(15);

      const creditsAlbumHtml = `
        <div class="albumBlock"><div class="albumTitle">In Rainbows</div></div>
      `;
        globalThis.fetch = async (url: string) => {
        if (url.includes("artistCreditList.php")) {
          return new Response(creditsAlbumHtml, { status: 200 });
        }
        return new Response(rolesHtml, { status: 200 });
      };

      const credits = await scrapeArtistCredits("1-radiohead", "Producer", "highest");
      expect(credits.role).toBe("Producer");
      expect(credits.albums.length).toBe(1);

      // Test unknown credit role error
      await expect(scrapeArtistCredits("1-radiohead", "UnknownRole", "highest")).rejects.toThrow("Unknown credit role");

      // Test fallback direct query when listArtistCreditRoles fails
        globalThis.fetch = async (url: string) => {
        if (url.includes("artistCreditList.php")) {
          return new Response(creditsAlbumHtml, { status: 200 });
        }
        return new Response("Not found", { status: 500 });
      };
      const fallbackCredits = await scrapeArtistCredits("1-radiohead", "Producer", "highest");
      expect(fallbackCredits.albums.length).toBe(1);

      // Test fallback direct query when artistCreditList.php fails
        globalThis.fetch = async (url: string) => {
        return new Response("Not found", { status: 500 });
      };
      await expect(scrapeArtistCredits("1-radiohead", "Producer", "highest")).rejects.toThrow("Artist credits fetch failed: 500");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("parses random artist redirect", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url: string) => {
      const res = new Response(`
        <h1 class="artistHeadline">Random Band</h1>
        <h2 class="subHeadline">LP</h2>
        <div class="albumBlock"><div class="albumTitle">Album 1</div></div>
      `, { status: 200 });
      Object.defineProperty(res, "url", { value: "https://www.albumoftheyear.org/artist/999-random-band/" });
      return res;
    };

    try {
      const { scrapeRandomArtist } = await import("../src/scrapers/artist.js");
      const random = await scrapeRandomArtist();
      expect(random.name).toBe("Random Band");
      expect(random.sections.length).toBe(1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
