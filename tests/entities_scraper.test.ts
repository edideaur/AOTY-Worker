import { describe, it, expect } from "bun:test";
import {
  scrapeLabelPage,
  scrapeGenresIndex,
  scrapeGenrePage,
  scrapePublicationPage,
  scrapePublicationReviewsPage,
  scrapePublicationListsPage,
  scrapePublicationPerfect,
  scrapeCriticPage,
  scrapeTagPage,
  scrapeArtistsOverview,
  scrapeSubGenres,
  scrapeGenreName,
  scrapeGenreAutocomplete,
} from "../src/scrapers/entities.js";

describe("entities scrapers unit tests", () => {
  it("parses label page", async () => {
    const html = `
      <h1 class="headline">Def Jam Recordings</h1>
      <div class="logo">
        <img src="https://cdn.aoty.org/defjam.jpg" />
        <a href="https://defjam.com">Official Website</a>
      </div>
      <div class="labelInfo">Parent: <a href="/label/2-universal-music-group/">Universal Music Group</a></div>
      <div class="labelDescription">Iconic hip hop record label founded in 1984.</div>
      <div class="albumBlock"><div class="albumTitle">Sample Album</div></div>
    `;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(html, { status: 200 });

    try {
      const label = await scrapeLabelPage("https://www.albumoftheyear.org/label/1-def-jam/", undefined, 2);
      expect(label.name).toBe("Def Jam Recordings");
      expect(label.image).toBe("https://cdn.aoty.org/defjam.jpg");
      expect(label.website).toBe("https://defjam.com");
      expect(label.parentLabel).toEqual({
        name: "Universal Music Group",
        url: "https://www.albumoftheyear.org/label/2-universal-music-group/",
      });
      expect(label.description).toBe("Iconic hip hop record label founded in 1984.");
      expect(label.page).toBe(2);
      expect(label.albums.length).toBe(1);

      const labelP1 = await scrapeLabelPage("https://www.albumoftheyear.org/label/1-def-jam/");
      expect(labelP1.page).toBe(1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("parses genres index", async () => {
    const html = `
      <h2><a href="/genre/3-hip-hop/">Hip Hop</a></h2>
      <div class="albumBlock" data-type="LP">
        <div class="image"><a href="/album/50-blueprint/"><img src="https://cdn.aoty.org/bp.jpg" /></a><span class="mustHear">Must Hear</span></div>
        <div class="artistTitle">Jay-Z</div>
        <div class="albumTitle">The Blueprint</div>
        <div class="type">2001</div>
        <div class="ratingRow">
          <div class="ratingBlock"><div class="rating">90</div></div>
          <div class="ratingText">critic score</div>
          <div class="ratingText">(20)</div>
          <div class="ratingBlock"><div class="rating">85</div></div>
          <div class="ratingText">user score</div>
          <div class="ratingText">(1000)</div>
        </div>
      </div>
    `;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(html, { status: 200 });

    try {
      const genres = await scrapeGenresIndex();
      expect(genres.length).toBe(1);
      expect(genres[0].name).toBe("Hip Hop");
      expect(genres[0].url).toContain("/genre/3-hip-hop/");
      expect(genres[0].albums.length).toBe(1);
      expect(genres[0].albums[0].criticScore).toBe("90");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("parses publication page", async () => {
    const html = `
      <h1>Pitchfork</h1>
      <div class="publicationHeader">
        <img src="https://cdn.aoty.org/pitchfork.jpg" />
        <a href="https://pitchfork.com">pitchfork.com</a>
      </div>
      <div class="pubSubHeadline"><a href="//pitchfork.com">pitchfork.com</a></div>
      <div>Albums Rated:</span> 25,000</div>
      <div>Average Rating:</span> 71</div>
      <table>
        <tr><td class="distLabel">90-100</td><td class="distCount">2,500</td></tr>
      </table>
      <div class="albumBlock">
        <a href="/artist/1-artist/"><div class="artistTitle">Artist 1</div></a>
        <a href="/album/1-recent.php"><div class="albumTitle">Recent Album</div></a>
        <div class="rating">80</div>
      </div>
      Highest Rated Albums
      <div class="albumBlock">
        <a href="/artist/2-artist/"><div class="artistTitle">Artist 2</div></a>
        <a href="/album/2-top.php"><div class="albumTitle">Top Album</div></a>
        <div class="rating">95</div>
      </div>
    `;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(html, { status: 200 });

    try {
      const pub = await scrapePublicationPage("https://www.albumoftheyear.org/publication/1-pitchfork/", "1-pitchfork");
      expect(pub.name).toBe("Pitchfork");
      expect(pub.slug).toBe("1-pitchfork");
      expect(pub.website).toBe("https://pitchfork.com");
      expect(pub.albumsRated).toBe("25,000");
      expect(pub.averageRating).toBe("71");
      expect(pub.recentReviews.length).toBe(1);
      expect(pub.recentReviews[0].artist).toBe("Artist 1");
      expect(pub.topAlbums.length).toBe(1);
      expect(pub.topAlbums[0].artist).toBe("Artist 2");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("parses publication reviews page", async () => {
    const html = `
      <div class="albumBlock">
        <a href="/album/1-album.php"><div class="albumTitle">Album</div></a>
        <div class="artistTitle">Artist</div>
        <img src="https://cdn.aoty.org/cov.jpg" />
        <div class="rating">85</div>
        <a href="https://pitchfork.com/review">Full Review</a>
      </div>
    `;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(html, { status: 200 });

    try {
      const reviews = await scrapePublicationReviewsPage("https://www.albumoftheyear.org/publication/1-pitchfork/reviews/");
      expect(reviews.length).toBe(1);
      expect(reviews[0].artist).toBe("Artist");
      expect(reviews[0].album).toBe("Album");
      expect(reviews[0].score).toBe("85");
      expect(reviews[0].reviewUrl).toBe("https://pitchfork.com/review");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("parses critic page", async () => {
    const html = `
      <h1 class="headline">Anthony Fantano</h1>
      <div class="userReviewBlock">
        <div class="cover"><a href="/album/1-album.php"><img src="https://cdn.aoty.org/cov.jpg" /></a></div>
        <div class="artistTitle"><a href="/artist/1-artist/">Artist</a></div>
        <div class="albumTitle"><a href="/album/1-album.php">Album</a></div>
        <div class="userName"><a href="/publication/the-needle-drop/">The Needle Drop</a></div>
        <div class="rating">90</div>
        <div class="reviewText">Decent to strong 9.</div>
        <div class="date">Oct 12, 2020</div>
      </div>
      <div class="userReviewBlock">
        <div class="reviewText">No album review</div>
      </div>
    `;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(html, { status: 200 });

    try {
      const critic = await scrapeCriticPage("https://www.albumoftheyear.org/critic/fantano/", "fantano");
      expect(critic.name).toBe("Anthony Fantano");
      expect(critic.publication).toBe("The Needle Drop");
      expect(critic.reviews.length).toBe(1);
      expect(critic.reviews[0].score).toBe("90");
      expect(critic.reviews[0].date).toBe("Oct 12, 2020");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("parses tag page", async () => {
    const html = `
      <div class="albumBlock"><div class="albumTitle">Experimental Album</div></div>
    `;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(html, { status: 200 });

    try {
      const tag = await scrapeTagPage("experimental", "albums", "2020");
      expect(tag.tag).toBe("experimental");
      expect(tag.type).toBe("albums");
      expect(tag.year).toBe("2020");
      expect(tag.albums.length).toBe(1);

      // Test tag with media type
      const mediaHtml = `
        <div class="mediaContainer" id="link99">
          <div class="content"><div class="title"><a href="/l/99-test/">Tag News</a></div></div>
        </div>
      `;
        globalThis.fetch = async () => new Response(mediaHtml, { status: 200 });
      const mediaTag = await scrapeTagPage("ambient", "media", null, undefined, 2);
      expect(mediaTag.type).toBe("media");
      expect(mediaTag.media.length).toBe(1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("parses artists overview sections", async () => {
    const html = `
      <div class="artistBlock"><a href="/artist/10-orphan/"><img src="https://cdn.aoty.org/orphan.jpg" /><div class="name">Orphan</div></a></div>
      <h2 class="sectionHeading">Popular Artists</h2>
      <div class="artistBlock"><a href="/artist/1-radiohead/"><img src="https://cdn.aoty.org/rh.jpg" /><div class="name">Radiohead</div></a></div>
    `;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(html, { status: 200 });

    try {
      const sections = await scrapeArtistsOverview();
      expect(sections.length).toBe(2);
      expect(sections[0].artists[0].name).toBe("Orphan");
      expect(sections[0].artists[0].image).toBe("https://cdn.aoty.org/orphan.jpg");
      expect(sections[1].title).toBe("Popular Artists");
      expect(sections[1].artists.length).toBe(1);
      expect(sections[1].artists[0].name).toBe("Radiohead");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("parses genre page, publication lists page, and publication perfect page", async () => {
    const originalFetch = globalThis.fetch;
    try {
      const genreHtml = `
        <h1>Indie Rock</h1>
        <div class="albumBlock"><div class="albumTitle">Orphan Album</div><div class="artistTitle">Artist</div></div>
        <div class="artistBlock"><a href="/artist/99-orphan/"><div class="name">Orphan Artist</div></a></div>
        <h2><a href="/genre/indie-rock/albums/">Highest Rated</a></h2>
        <div class="albumBlock" data-type="LP">
          <div class="image"><a href="/album/1-okc/"><img src="https://cdn.aoty.org/okc.jpg" /></a><span class="mustHear">Must Hear</span></div>
          <div class="artistTitle">Radiohead</div>
          <div class="albumTitle">OK Computer</div>
          <div class="type">1997</div>
          <div class="ratingRow">
            <div class="ratingBlock"><div class="rating">95</div></div>
            <div class="ratingText">critic score</div>
            <div class="ratingText">(50)</div>
            <div class="ratingBlock"><div class="rating">93</div></div>
            <div class="ratingText">user score</div>
            <div class="ratingText">(10000)</div>
          </div>
        </div>
        <div class="artistBlock"><a href="/artist/1-radiohead/"><img src="https://cdn.aoty.org/rh.jpg" /><div class="name">Radiohead</div></a></div>
        <div>Child Genres</div>
        <div><a href="/genre/post-rock/">Post-Rock</a></div></div>
      `;
        globalThis.fetch = async () => new Response(genreHtml, { status: 200 });
      const { scrapeGenrePage } = await import("../src/scrapers/entities.js");
      const fullGenre = await scrapeGenrePage("http://mock/genre/indie-rock/", "indie-rock");
      expect(fullGenre.name).toBe("Indie Rock");
      expect(fullGenre.sections.length).toBeGreaterThan(0);
      expect(fullGenre.childGenres.length).toBe(1);

      // Test genre with orphan artistBlock without any prior section
      const orphanArtistGenreHtml = `
        <h1>Indie Rock</h1>
        <div class="artistBlock"><a href="/artist/1-radiohead/"><div class="name">Radiohead</div></a></div>
      `;
        globalThis.fetch = async () => new Response(orphanArtistGenreHtml, { status: 200 });
      const orphanGenre = await scrapeGenrePage("http://mock/genre/indie-rock/", "indie-rock");
      expect(orphanGenre.sections.length).toBe(1);
      expect(orphanGenre.sections[0].artists.length).toBe(1);

      // Test year genre page fallback to chart items
      const chartGenreHtml = `
        <h1>Indie Rock in 2020</h1>
        <div class="totalScores"><div class="ratingRowWrapper">
          <div class="albumListRow">
            <span class="rank">1</span>
            <h3 class="albumListTitle"><a href="/album/50-phoebe/">Punisher</a></h3>
            <div class="artist"><a href="/artist/50-phoebe/">Phoebe Bridgers</a></div>
            <div class="scoreValue">90</div>
          </div>
        </div></div>
      `;
        globalThis.fetch = async () => new Response(chartGenreHtml, { status: 200 });
      const yearGenre = await scrapeGenrePage("http://mock/genre/indie-rock/2020/", "indie-rock-2020");
      expect(yearGenre.name).toBe("Indie Rock in 2020");
      expect(yearGenre.sections.length).toBe(0);
      expect(yearGenre.items.length).toBe(1);

      // Test year genre page when charts fetch throws error
      let emptyCalls = 0;
        globalThis.fetch = async (url: string) => {
        emptyCalls++;
        if (emptyCalls === 1) {
          return new Response("<h1>Indie Rock Empty</h1>", { status: 200 });
        }
        if (emptyCalls === 2) {
          // ratings chart fetch
          return new Response("Server Error", { status: 500 });
        }
        return new Response("<div></div>", { status: 200 });
      };
      const emptyGenre = await scrapeGenrePage("https://www.albumoftheyear.org/genre/indie-rock/empty/", "empty");
      expect(emptyGenre.items.length).toBe(0);

      const pubListHtml = `
        <h1>Pitchfork Lists</h1>
        <div class="criticListBlockContainer">
          <a href="/list/500-top-albums/"><img class="criticListBlockImage" src="https://cdn.aoty.org/top.jpg" alt="Pitchfork Best Albums" /></a>
          <div class="criticListBlockTitle"><a href="/list/500-top-albums/">Pitchfork Best Albums</a></div>
        </div>
        <div class="criticListBlockContainer">
          <a href="/list/501-the-50-best-albums-of-2023/"><img class="criticListBlockImage" src="https://cdn.aoty.org/top2.jpg" alt="" /></a>
          <div class="criticListBlockTitle"><a href="/list/501-the-50-best-albums-of-2023/">2023</a></div>
        </div>
      `;
        globalThis.fetch = async () => new Response(pubListHtml, { status: 200 });
      const lists = await scrapePublicationListsPage("http://mock/publication/1-pitchfork/lists/", undefined, 2);
      expect(lists.length).toBe(2);
      expect(lists[0].title).toBe("Pitchfork Best Albums");
      expect(lists[1].title).toBe("The 50 Best Albums of 2023");

      const listsP1 = await scrapePublicationListsPage("http://mock/publication/1-pitchfork/lists/");
      expect(listsP1.length).toBe(2);

      const perfectHtml = `
        <div class="albumBlock"><div class="albumTitle">Pre-album</div><a href="/album/0-pre/"></a><div class="artistTitle">Pre-artist</div><div class="rating">100</div></div>
        <div class="sectionHeading">100 / 100 Perfect Scores</div>
        <div class="albumBlock">
          <div class="image"><a href="/album/1-okc/"><img src="https://cdn.aoty.org/okc.jpg" /></a></div>
          <div class="artistTitle"><a href="/artist/1-radiohead/">Radiohead</a></div>
          <div class="albumTitle">OK Computer</div>
          <div class="rating">100</div>
          <div class="ratingText"><a href="https://pitchfork.com/reviews/1">Full Review</a></div>
        </div>
      `;
        globalThis.fetch = async () => new Response(perfectHtml, { status: 200 });
      const perfect = await scrapePublicationPerfect("1-pitchfork");
      expect(perfect.slug).toBe("1-pitchfork");
      expect(perfect.sections.length).toBe(2);
      expect(perfect.sections[1].reviews.length).toBe(1);
      expect(perfect.sections[1].reviews[0].album).toBe("OK Computer");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("handles fetch errors across entities scrapers", async () => {
    const originalFetch = globalThis.fetch;
    try {
        globalThis.fetch = async () => new Response("Server Error", { status: 500 });
      expect(scrapeLabelPage("http://mock/label/1/")).rejects.toThrow("Label fetch failed: 500");
      expect(scrapeGenresIndex()).rejects.toThrow("Genres fetch failed: 500");
      expect(scrapeGenrePage("http://mock/genre/1/", "1")).rejects.toThrow("Genre fetch failed: 500");
      expect(scrapeTagPage("tag", "albums")).rejects.toThrow("Tag fetch failed: 500");
      expect(scrapePublicationPage("http://mock/publication/1/", "1")).rejects.toThrow("Publication fetch failed: 500");
      expect(scrapePublicationPerfect("1")).rejects.toThrow("Publication perfect scores fetch failed: 500");
      expect(scrapeArtistsOverview()).rejects.toThrow("Artists overview fetch failed: 500");
      expect(scrapePublicationReviewsPage("http://mock/publication/1/reviews/")).rejects.toThrow("Publication reviews fetch failed: 500");
      expect(scrapePublicationListsPage("http://mock/publication/1/lists/")).rejects.toThrow("Publication lists fetch failed: 500");
      expect(scrapeCriticPage("http://mock/critic/1/", "1")).rejects.toThrow("Critic fetch failed: 500");
      expect(scrapeSubGenres("1")).rejects.toThrow("Subgenres fetch failed: 500");

      let count = 0;
        globalThis.fetch = async () => {
        count++;
        if (count === 1) return new Response("<h1>Label</h1>", { status: 200 });
        return new Response("Error", { status: 500 });
      };
      expect(scrapeLabelPage("http://mock/label/1/")).rejects.toThrow("Label fetch failed: 500");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("parses subgenres from showSubGenres.php correctly", async () => {
    const html = `
      <div class="content">
        <div class="heading"><i class="fa-regular fa-list-tree"></i> Hip Hop</div>
        <div class="inner columns">
          <div><a href="/genre/305-boom-bap/">Boom Bap</a></div>
          <div><a href="/genre/213-trap-rap/">Trap &amp; Rap</a></div>
        </div>
      </div>
    `;
    const originalFetch = globalThis.fetch;
    try {
        globalThis.fetch = async () => new Response(html, { status: 200 });
      const res = await scrapeSubGenres("3");
      expect(res.genreId).toBe("3");
      expect(res.heading).toBe("Hip Hop");
      expect(res.subgenres.length).toBe(2);
      expect(res.subgenres[0].name).toBe("Boom Bap");
      expect(res.subgenres[0].url).toBe("https://www.albumoftheyear.org/genre/305-boom-bap/");
      expect(res.subgenres[1].name).toBe("Trap & Rap");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("parses genre name from getGenreName.php correctly", async () => {
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async () => new Response("Rock", { status: 200 });
      const res = await scrapeGenreName("7");
      expect(res.id).toBe("7");
      expect(res.name).toBe("Rock");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("parses genre autocomplete results correctly", async () => {
    const mockData = [
      { id: "7", value: "Rock &amp; Roll", link: "/genre/7-rock-roll/" },
      { id: "29", value: "Post-Rock", link: "https://www.albumoftheyear.org/genre/29-post-rock/" },
    ];
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async () => new Response(JSON.stringify(mockData), { status: 200 });
      const res = await scrapeGenreAutocomplete("rock");
      expect(res.length).toBe(2);
      expect(res[0]?.id).toBe("7");
      expect(res[0]?.name).toBe("Rock & Roll");
      expect(res[0]?.slug).toBe("7-rock-roll");
      expect(res[0]?.url).toBe("https://www.albumoftheyear.org/genre/7-rock-roll/");
      expect(res[1]?.id).toBe("29");
      expect(res[1]?.name).toBe("Post-Rock");
      expect(res[1]?.slug).toBe("29-post-rock");
      expect(res[1]?.url).toBe("https://www.albumoftheyear.org/genre/29-post-rock/");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("handles empty and failed genre autocomplete results", async () => {
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async () => new Response("[]", { status: 200 });
      const res = await scrapeGenreAutocomplete("nonexistent");
      expect(res).toEqual([]);

      globalThis.fetch = async () => new Response("Error", { status: 500 });
      expect(scrapeGenreAutocomplete("fail")).rejects.toThrow("Genre autocomplete fetch failed: 500");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

