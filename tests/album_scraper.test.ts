import { describe, it, expect } from "bun:test";
import { findAlbumUrl, scrapeAlbumPage, scrapeAlbumTags, scrapeAlbumCriticReviews, scrapeRandomAlbum, scrapeAlbumTagAutocomplete } from "../src/scrapers/album.js";
import { scrapeAlbumUsers, scrapeAlbumImages } from "../src/scrapers/albumExtras.js";

describe("findAlbumUrl unit test", () => {
  it("finds the first matching album URL", async () => {
    const html = `
      <div class="albumBlock">
        <div class="image"><a href="/album/1998-kanye-west-my-beautiful-dark-twisted-fantasy.php"><img src="..." /></a></div>
      </div>
    `;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(html, { status: 200 });

    try {
      const url = await findAlbumUrl("Kanye West", "My Beautiful Dark Twisted Fantasy");
      expect(url).toBe("https://www.albumoftheyear.org/album/1998-kanye-west-my-beautiful-dark-twisted-fantasy.php");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("returns null if no album found", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response("<div>No results</div>", { status: 200 });

    try {
      const url = await findAlbumUrl("Unknown", "Nothing");
      expect(url).toBeNull();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe("scrapeAlbumPage unit test", () => {
  it("parses full album page HTML correctly", async () => {
    const html = `
      <script type="application/ld+json">
      {
        "name": "My Beautiful Dark Twisted Fantasy",
        "byArtist": { "name": "Kanye West", "url": "https://www.albumoftheyear.org/artist/183-kanye-west/" },
        "image": "https://cdn.albumoftheyear.org/album/1998.jpg",
        "datePublished": "2010-11-22",
        "dateCreated": "2010-10-01",
        "dateModified": "2024-01-01",
        "genre": ["Hip Hop", "Art Pop"]
      }
      </script>
      <button class="showImage" data-id="1998"></button>
      <div class="albumCriticScore"><a title="94.2">94</a></div>
      <div class="albumCriticScoreBox"><div class="text numReviews">45 reviews</div><div class="text gray">2010 Ratings: <strong><a href="/ratings/6-highest-rated/2010/1#rank-1">#1</a></strong> / 50</div></div>
      <div class="albumCriticScoreSub">Based on 45 reviews</div>
      <div class="albumUserScore"><a title="91.1">91</a></div>
      <div class="albumUserScoreBox"><div class="text numReviews">15,000 ratings</div><div class="text gray">2010 Ratings: <strong><a href="/ratings/user-highest-rated/2010/1/#rank-2">#2</a></strong></div></div>
      <div class="albumUserScoreSub">Based on 15,000 ratings</div>
      <div class="albumTopBox info">
        <div class="detailRow">Release Date</div><div class="detailRow">LP</div>
        <div class="detailRow"><a href="/label/1-def-jam/">Def Jam</a></div>
        <div class="detailRow"><a href="/genre/2-hip-hop/">Hip Hop</a><br/><a href="/genre/1-art-pop/"><div class="secondary">Art Pop</div></a></div>
        <div class="detailRow"><a href="/tag/masterpiece/">Masterpiece</a></div>
        <div class="detailRow vibes"><div class="vibe"><a href="/all/releases/vibe/epic/">epic</a></div></div>
        <div class="detailRow"><span class="actionBlank showAlbumCredits" data-type="2">Producer</span>: <a href="/artist/183-kanye-west/">Kanye West</a></div>
        <div class="detailRow"><span class="actionBlank showAlbumCredits" data-type="6">Writer</span>: <a href="/artist/100-mike-dean/">Mike Dean</a></div>
      </div>
      <div class="albumLinksFlex"><a href="https://spotify.com/album/123" title="Spotify" rel="nofollow">Spotify</a></div>
      <div class="totalLength">Total Length: 1 hour, 8 minutes</div>
      <table class="trackListTable">
        <tr>
          <td class="trackNumber">1</td>
          <td class="trackTitle"><a href="/song/1-dark-fantasy/">Dark Fantasy</a><span class="length">4:40</span><span class="featuredArtists">feat. <a href="/artist/1-bon-iver/">Bon Iver</a></span></td>
          <td class="trackRating"><span title="500 ratings">95</span></td>
        </tr>
        <tr>
          <td class="trackNumber">2</td>
          <td class="trackTitle"><a href="/song/2-gorgeous/">Gorgeous</a><span class="trackNotes">(Live)</span></td>
        </tr>
        <tr>
          <td class="trackNumber">3</td>
          <td class="trackTitle"><a href="/song/3-power/">Power</a></td>
        </tr>
      </table>
      <div class="albumReviewRow">
        <div class="albumReviewImage"><img alt="Pitchfork" src="https://cdn.aoty.org/pub.jpg" /></div>
        <div class="albumReviewHeader">
          <div class="publication"><a href="/publication/1-pitchfork/">Pitchfork</a></div>
          <div class="author"><a href="/critic/1-ryan-dombal/">Ryan Dombal</a></div>
          <div class="date">Nov 22, 2010</div>
        </div>
        <div class="albumReviewRating">100</div>
        <div class="albumReviewText">A monumental triumph.</div>
        <div class="albumReviewLinks">
          <div class="extLink"><a href="https://pitchfork.com/reviews/1">Link</a></div>
          <div class="actionContainer" title="action1"></div>
          <div class="actionContainer" title="2010-11-22"></div>
        </div>
      </div>
      <div class="detailRow">
        <div class="sectionHeading">Contributions By</div>
        <a href="/user/contributor1/">Contributor One</a>, <a href="https://www.albumoftheyear.org/user/contributor2/">Contributor Two</a>
      </div>
      <div class="sectionHeading">Popular User Reviews</div>
      <div class="albumReviewRow" id="review_101">
        <div class="userReviewImage"><a href="/user/user1/"><img src="https://cdn.aoty.org/u1.jpg" /></a></div>
        <div class="userReviewName"><a href="/user/user1/">User One</a></div>
        <div class="rating">95</div>
        <div class="albumReviewText user"><p>Great album! <a href="/user/user1/album/1998/">read more</a></div>
        <div class="review_likes">12</div>
        <div class="comment_count">3</div>
        <div class="review_date">Nov 23, 2010</div>
      </div>
      <div class="sectionHeading">Recent User Reviews</div>
      <div class="albumReviewRow" id="review_102">
        <div class="userReviewName"><a href="https://www.albumoftheyear.org/user/user2/">User Two</a></div>
        <div class="rating">85</div>
        <div class="albumReviewText user"><p>Nice vibes</div>
        <div class="review_likes">2</div>
        <div class="comment_count">0</div>
        <div class="review_date">Nov 24, 2010</div>
      </div>
      <div class="sectionHeading">More Albums</div>
      <div class="albumBlock small">
        <div class="image"><a href="/album/2000-kanye-west-yeezus.php"><img src="https://cdn.aoty.org/yeezus.jpg" alt="Yeezus" /></a></div>
        <div class="artistTitle"><a href="/artist/183-kanye-west/">Kanye West</a></div>
        <div class="albumTitle"><a href="/album/2000-kanye-west-yeezus.php">Yeezus</a></div>
      </div>
      <div class="sectionHeading">You May Also Like</div>
      <div class="albumBlock small">
        <div class="image"><a href="/album/3000-kendrick-lamar-tpab.php"><img src="https://cdn.aoty.org/tpab.jpg" alt="To Pimp a Butterfly" /></a></div>
        <div class="artistTitle"><a href="/artist/200-kendrick-lamar/">Kendrick Lamar</a></div>
        <div class="albumTitle"><a href="/album/3000-kendrick-lamar-tpab.php">To Pimp a Butterfly</a></div>
      </div>
      <div class="sectionHeading">Tags</div>
      <div class="rightBox">
        <div class="sectionHeading">Year End Lists</div>
        <TABLE class="listTable">
          <tr>
            <td class="rank">#<strong>1</strong></td>
            <td class="divider">/</td>
            <td><a href="/list/100-pitchfork-top-50-albums-of-2010.php">Pitchfork - Top 50 Albums of 2010</a></td>
          </tr>
        </TABLE>
      </div>
      <div class="rightBox">
        <div class="sectionHeading">User Lists</div>
        <div class="commentRow">
          <img src="https://cdn.aoty.org/avatar.jpg" />
          <a href="/list/200-best-of-all-time.php">Best of All Time</a>
          By <a href="/user/listmaker/">ListMaker</a>
        </div>
      </div>
      </div>
      <div class="rightBox">
        <div class="sectionHeading">Comments (5)</div>
        <span id="commentList">
          <div class="commentRow" id="comment_555">
            <div class="commentUserName"><a href="/user/commenter/">Commenter</a></div>
            <div class="commentImage"><a href="/user/commenter/"><img src="https://cdn.aoty.org/comm.jpg" /></a></div>
            <div class="commentDate" title="2020-01-01 12:00:00">Jan 1, 2020</div>
            <div class="commentText">Awesome album!</div>
            <button class="showReplies"><span>2</span> replies</button>
          </div>
        </span>
      </div>
    `;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(html, { status: 200 });

    try {
      const album = await scrapeAlbumPage("https://www.albumoftheyear.org/album/1998-kanye-west-my-beautiful-dark-twisted-fantasy.php");
      expect(album.id).toBe(1998);
      expect(album.title).toBe("My Beautiful Dark Twisted Fantasy");
      expect(album.artist).toBe("Kanye West");
      expect(album.criticScore).toBe(94);
      expect(album.criticScoreExact).toBe(94.2);
      expect(album.userScore).toBe(91);
      expect(album.userScoreExact).toBe(91.1);
      expect(album.format).toBe("LP");
      expect(album.dateCreated).toBe("2010-10-01");
      expect(album.dateModified).toBe("2024-01-01");
      expect(album.secondaryGenres).toEqual(["Art Pop"]);
      expect(album.criticRanking?.rank).toBe(1);
      expect(album.criticRanking?.total).toBe(50);
      expect(album.userRanking?.rank).toBe(2);
      expect(album.label).toBe("Def Jam");
      expect(album.labels.length).toBe(1);
      expect(album.labels[0].name).toBe("Def Jam");
      expect(album.labels[0].url).toBe("https://www.albumoftheyear.org/label/1-def-jam/");
      expect(album.vibes).toEqual(["epic"]);
      expect(album.producers).toEqual([{ name: "Kanye West", url: "https://www.albumoftheyear.org/artist/183-kanye-west/", image: null }]);
      expect(album.writers).toEqual([{ name: "Mike Dean", url: "https://www.albumoftheyear.org/artist/100-mike-dean/", image: null }]);
      expect(album.totalLength).toBe("1 hour, 8 minutes");
      expect(album.genres).toContain("Hip Hop");
      expect(album.tracklist.length).toBe(3);
      expect(album.tracklist[0].title).toBe("Dark Fantasy");
      expect(album.tracklist[0].length).toBe("4:40");
      expect(album.tracklist[0].features).toEqual(["Bon Iver"]);
      expect(album.tracklist[0].featureLinks).toEqual([
        { name: "Bon Iver", url: "https://www.albumoftheyear.org/artist/1-bon-iver/", image: null },
      ]);
      expect(album.tracklist[1].title).toBe("Gorgeous");
      expect(album.tracklist[2].title).toBe("Power");
      expect(album.reviews.length).toBe(1);
      expect(album.reviews[0].publication).toBe("Pitchfork");
      expect(album.reviews[0].score).toBe(100);
      expect(album.reviews[0].text).toBe("A monumental triumph.");
      expect(album.reviews[0].date).toBe("2010-11-22");

      expect(album.contributionsBy.length).toBe(2);
      expect(album.contributionsBy[0].name).toBe("Contributor One");
      expect(album.contributionsBy[0].url).toBe("https://www.albumoftheyear.org/user/contributor1/");
      expect(album.contributionsBy[1].name).toBe("Contributor Two");
      expect(album.contributionsBy[1].url).toBe("https://www.albumoftheyear.org/user/contributor2/");

      expect(album.popularUserReviews.length).toBe(1);
      expect(album.popularUserReviews[0].username).toBe("User One");
      expect(album.popularUserReviews[0].rating).toBe(95);
      expect(album.popularUserReviews[0].text).toBe("Great album!");
      expect(album.popularUserReviews[0].likes).toBe(12);
      expect(album.popularUserReviews[0].comments).toBe(3);
      expect(album.popularUserReviews[0].date).toBe("Nov 23, 2010");

      expect(album.recentUserReviews.length).toBe(1);
      expect(album.recentUserReviews[0].username).toBe("User Two");
      expect(album.recentUserReviews[0].rating).toBe(85);
      expect(album.recentUserReviews[0].likes).toBe(2);
      expect(album.recentUserReviews[0].comments).toBe(0);

      expect(album.moreAlbums.length).toBe(1);
      expect(album.moreAlbums[0].title).toBe("Yeezus");
      expect(album.moreAlbums[0].artistUrl).toBe("https://www.albumoftheyear.org/artist/183-kanye-west/");

      expect(album.similarAlbums.length).toBe(1);
      expect(album.similarAlbums[0].title).toBe("To Pimp a Butterfly");
      expect(album.similarAlbums[0].artistUrl).toBe("https://www.albumoftheyear.org/artist/200-kendrick-lamar/");

      expect(album.yearEndLists.length).toBe(1);
      expect(album.yearEndLists[0].rank).toBe(1);
      expect(album.yearEndLists[0].title).toBe("Pitchfork - Top 50 Albums of 2010");

      expect(album.userLists.length).toBe(1);
      expect(album.userLists[0].title).toBe("Best of All Time");
      expect(album.userLists[0].username).toBe("ListMaker");

      expect(album.comments.length).toBe(1);
      expect(album.comments[0].username).toBe("Commenter");
      expect(album.comments[0].text).toBe("Awesome album!");
      expect(album.comments[0].replies).toBe(2);

      const singleGenreHtml = `
        <script type="application/ld+json">
        {
          "name": "Single Genre Album",
          "byArtist": { "name": "Artist", "url": "/artist/1/" },
          "genre": "Rock"
        }
        </script>
      `;
        globalThis.fetch = async () => new Response(singleGenreHtml, { status: 200 });
      const singleGenreAlbum = await scrapeAlbumPage("https://www.albumoftheyear.org/album/2-rock.php");
      expect(singleGenreAlbum.genres).toEqual(["Rock"]);

      const noGenreHtml = `
        <script type="application/ld+json">
        {
          "name": "No Genre Album",
          "byArtist": { "name": "Artist", "url": "/artist/1/" }
        }
        </script>
      `;
        globalThis.fetch = async () => new Response(noGenreHtml, { status: 200 });
      const noGenreAlbum = await scrapeAlbumPage("https://www.albumoftheyear.org/album/3-none.php");
      expect(noGenreAlbum.genres).toEqual([]);

      const emptyReviewHtml = `
        <div class="albumReviewRow">
          <div class="albumReviewRating">90</div>
        </div>
        <table class="trackListTable">
          <tr><td class="trackTitle">Header Row</td></tr>
        </table>
        <div class="albumTopBox info">
          <div class="detailRow"><a href="/label/2-blank/"></a></div>
        </div>
      `;
        globalThis.fetch = async () => new Response(emptyReviewHtml, { status: 200 });
      const emptyReviewAlbum = await scrapeAlbumPage("https://www.albumoftheyear.org/album/4-empty-review.php");
      expect(emptyReviewAlbum.reviews).toEqual([]);
      expect(emptyReviewAlbum.tracklist).toEqual([]);
      expect(emptyReviewAlbum.label).toBe("");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("enriches album with full-size artist image from the artist page", async () => {
    const albumHtml = `
      <script type="application/ld+json">
      {
        "name": "My Beautiful Dark Twisted Fantasy",
        "byArtist": { "name": "Kanye West", "url": "https://www.albumoftheyear.org/artist/183-kanye-west/" },
        "image": "https://cdn.albumoftheyear.org/album/1998.jpg",
        "datePublished": "2010-11-22"
      }
      </script>
    `;
    const artistHtml = `
      <head>
        <link rel="image_src" href="https://cdn.albumoftheyear.org/artists/kanye-west_1586101900.jpg" />
        <link href="https://www.albumoftheyear.org/artist/183-kanye-west/" rel="canonical" />
        <meta property="og:image" content="https://cdn.albumoftheyear.org/artists/kanye-west_1586101900.jpg" />
        <meta property="og:url" content="https://www.albumoftheyear.org/artist/183-kanye-west/" />
      </head>
      <h1 class="artistHeadline">Kanye West</h1>
      <div class="artistImage"><img src="https://cdn.albumoftheyear.org/artists/sq/kanye-west_1586101900.jpg" /></div>
    `;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url: string | URL | Request) => {
      const u = String(url);
      if (u.includes("/artist/")) return new Response(artistHtml, { status: 200 });
      return new Response(albumHtml, { status: 200 });
    };

    try {
      const album = await scrapeAlbumPage("https://www.albumoftheyear.org/album/1998-kanye-west-my-beautiful-dark-twisted-fantasy.php");
      expect(album.artist).toBe("Kanye West");
      expect(album.artistUrl).toBe("https://www.albumoftheyear.org/artist/183-kanye-west/");
      expect(album.artistImage).toBe("https://cdn.albumoftheyear.org/artists/kanye-west_1586101900.jpg");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("leaves artistImage null when the artist page has no image", async () => {
    const albumHtml = `
      <script type="application/ld+json">
      {
        "name": "Unknown Album",
        "byArtist": { "name": "No Photo Band", "url": "https://www.albumoftheyear.org/artist/999-no-photo-band/" }
      }
      </script>
    `;
    const artistHtml = `
      <link href="https://www.albumoftheyear.org/artist/999-no-photo-band/" rel="canonical" />
      <h1 class="artistHeadline">No Photo Band</h1>
    `;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url: string | URL | Request) => {
      const u = String(url);
      if (u.includes("/artist/")) return new Response(artistHtml, { status: 200 });
      return new Response(albumHtml, { status: 200 });
    };

    try {
      const album = await scrapeAlbumPage("https://www.albumoftheyear.org/album/999-unknown.php");
      expect(album.artistImage).toBeNull();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("skips the artist page fetch when includeArtistImage is false (minimal mode)", async () => {
    const albumHtml = `
      <script type="application/ld+json">
      {
        "name": "My Beautiful Dark Twisted Fantasy",
        "byArtist": { "name": "Kanye West", "url": "https://www.albumoftheyear.org/artist/183-kanye-west/" },
        "image": "https://cdn.albumoftheyear.org/album/1998.jpg",
        "datePublished": "2010-11-22"
      }
      </script>
    `;

    const requested: string[] = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url: string | URL | Request) => {
      requested.push(String(url));
      return new Response(albumHtml, { status: 200 });
    };

    try {
      const album = await scrapeAlbumPage(
        "https://www.albumoftheyear.org/album/1998-kanye-west-my-beautiful-dark-twisted-fantasy.php",
        undefined,
        false,
      );
      expect(album.artist).toBe("Kanye West");
      expect(album.artistUrl).toBe("https://www.albumoftheyear.org/artist/183-kanye-west/");
      expect(album.artistImage).toBeNull();
      // only the album page itself was fetched - no artist page lookup
      expect(requested).toEqual(["https://www.albumoftheyear.org/album/1998-kanye-west-my-beautiful-dark-twisted-fantasy.php"]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe("scrapeAlbumTags & scrapeAlbumCriticReviews unit test", () => {
  it("parses tags from moreTags.php", async () => {
    const html = `
      <div class="albumTags">
        <div class="tag"><a href="/tag/hip-hop/">Hip Hop</a></div>
        <div class="tag"><a href="/tag/rap/">Rap</a></div>
      </div>
    `;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(html, { status: 200 });

    try {
      const res = await scrapeAlbumTags("1998-kanye-west");
      expect(res.slug).toBe("1998-kanye-west");
      expect(res.tags.length).toBe(2);
      expect(res.tags[0].name).toBe("Hip Hop");
      expect(res.tags[1].name).toBe("Rap");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("parses sorted critic reviews from criticSort.php", async () => {
    const html = `
      <div class="albumReviewRow">
        <div class="albumReviewImage"><img alt="Rolling Stone" src="https://cdn.aoty.org/rs.jpg" /></div>
        <div class="albumReviewHeader">
          <div class="publication"><a href="/publication/2-rolling-stone/">Rolling Stone</a></div>
          <div class="author"><a href="/critic/2-rob-sheffield/">Rob Sheffield</a></div>
        </div>
        <div class="albumReviewRating">90</div>
        <div class="albumReviewText">Essential listening.</div>
        <div class="albumReviewLinks">
          <div class="extLink"><a href="https://rollingstone.com/reviews/1">Link</a></div>
          <div class="actionContainer" title="action1"></div>
          <div class="actionContainer" title="2010-11-20"></div>
        </div>
      </div>
      <div class="albumReviewRow">
        <div class="albumReviewRating">70</div>
      </div>
    `;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(html, { status: 200 });

    try {
      const res = await scrapeAlbumCriticReviews("1998-kanye-west", "highest");
      expect(res.slug).toBe("1998-kanye-west");
      expect(res.sort).toBe("highest");
      expect(res.reviews.length).toBe(1);
      expect(res.reviews[0].publication).toBe("Rolling Stone");
      expect(res.reviews[0].score).toBe(90);
      expect(res.reviews[0].text).toBe("Essential listening.");
      expect(res.reviews[0].date).toBe("2010-11-20");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("handles error conditions and invalid inputs", async () => {
    const originalFetch = globalThis.fetch;
    try {
        globalThis.fetch = async () => new Response("Error", { status: 500 });
      expect(findAlbumUrl("artist", "album")).rejects.toThrow("Search failed: 500");
      expect(scrapeAlbumPage("http://mock/album/1/")).rejects.toThrow("Album fetch failed: 500");
      expect(scrapeAlbumTags("123-slug")).rejects.toThrow("Album tags fetch failed: 500");
      expect(scrapeAlbumCriticReviews("123-slug", "highest")).rejects.toThrow("Critic reviews fetch failed: 500");
      expect(scrapeRandomAlbum()).rejects.toThrow("Random album fetch failed: 500");
      expect(scrapeAlbumTagAutocomplete("hip")).rejects.toThrow("Tag autocomplete fetch failed: 500");

      expect(scrapeAlbumTags("no-id-slug")).rejects.toThrow("Album slug must start with the numeric album ID");
      expect(scrapeAlbumCriticReviews("no-id-slug", "highest")).rejects.toThrow("Album slug must start with the numeric album ID");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("handles scrapeRandomAlbum redirect and album page parsing", async () => {
    const refreshHtml = `
      <meta http-equiv="refresh" content="0; url=https://www.albumoftheyear.org/album/123-test.php?r=1" />
    `;
    const albumHtml = `
      <script type="application/ld+json">{"name":"Random Album","byArtist":{"name":"Random Artist","url":"/artist/1/"}}</script>
      <button class="showImage" data-id="123"></button>
    `;
    const originalFetch = globalThis.fetch;
    try {
      let callCount = 0;
        globalThis.fetch = async (url: string) => {
        callCount++;
        if (callCount === 1) return new Response(refreshHtml, { status: 200 });
        return new Response(albumHtml, { status: 200 });
      };
      const album = await scrapeRandomAlbum();
      expect(album.id).toBe(123);
      expect(album.title).toBe("Random Album");
      expect(album.artist).toBe("Random Artist");

      // Random album with filter
      let requestedUrl = "";
      callCount = 0;
      globalThis.fetch = async (url: string | URL | Request) => {
        callCount++;
        if (callCount === 1) {
          requestedUrl = String(url);
          return new Response(refreshHtml, { status: 200 });
        }
        return new Response(albumHtml, { status: 200 });
      };
      await scrapeRandomAlbum(undefined, { genre: "7", yearFrom: "1990", yearTo: "1999" });
      expect(requestedUrl).toContain("genre=7");
      expect(requestedUrl).toContain("yearFrom=1990");
      expect(requestedUrl).toContain("yearTo=1999");

        globalThis.fetch = async () => new Response("<html>No redirect</html>", { status: 200 });
      expect(scrapeRandomAlbum()).rejects.toThrow("Could not find redirect URL on random album page");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("handles scrapeAlbumTagAutocomplete correctly", async () => {
    const json = [
      { value: "hip hop" },
      { value: "jazz &amp; blues" },
      { value: "" },
    ];
    const originalFetch = globalThis.fetch;
    try {
        globalThis.fetch = async () => new Response(JSON.stringify(json), { status: 200 });
      const tags = await scrapeAlbumTagAutocomplete("hip");
      expect(tags).toEqual(["hip hop", "jazz & blues"]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("handles scrapeAlbumUsers for likes and library", async () => {
    const html = `
      <div class="userBlock ten"><a href="/user/panquesito/"><img src="https://cdn.aoty.org/p.jpg" /></a><div class="userName"><a href="/user/panquesito/">panquesito</a></div></div>
    `;
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async () => new Response(html, { status: 200 });
      const likes = await scrapeAlbumUsers("albumLikes", "123", 0);
      expect(likes.albumId).toBe(123);
      expect(likes.type).toBe("albumLikes");
      expect(likes.users.length).toBe(1);
      expect(likes.users[0]?.username).toBe("panquesito");
      expect(likes.users[0]?.url).toContain("/user/panquesito/");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("handles scrapeAlbumImages correctly", async () => {
    const html = `
      <div id="curImage"><img src="https://cdn.aoty.org/main.jpg" /></div>
      <div id="img_0" class="thumbnail selected"><button data-id="0"><img src="https://cdn.aoty.org/thumb0.jpg" alt="Front Cover" title="Front Cover" /></button></div>
      <div id="img_1" class="thumbnail"><button data-id="1"><img src="https://cdn.aoty.org/thumb1.jpg" alt="Back Cover" title="Back Cover" /></button></div>
    `;
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async () => new Response(html, { status: 200 });
      const res = await scrapeAlbumImages("123");
      expect(res.albumId).toBe(123);
      expect(res.mainImage).toBe("https://cdn.aoty.org/main.jpg");
      expect(res.images.length).toBe(2);
      expect(res.images[0]?.title).toBe("Front Cover");
      expect(res.images[0]?.isDefault).toBe(true);
      expect(res.images[1]?.title).toBe("Back Cover");
      expect(res.images[1]?.isDefault).toBe(false);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});


describe("scrapeAlbumPage extended metadata", () => {
  it("extracts all-time rankings, must-hear, hidden credit counts, genre links, bottom tags, comment count, song IDs and review metadata", async () => {
    const html = `
      <script type="application/ld+json">
      {
        "name": "Aquemini",
        "byArtist": { "name": "OutKast", "url": "https://www.albumoftheyear.org/artist/562-outkast/" },
        "image": "https://cdn.albumoftheyear.org/album/2915.jpg",
        "datePublished": "1998-09-29",
        "genre": ["Hip Hop"]
      }
      </script>
      <button class="showImage" data-id="2915"></button>
      <div class="mustHearButton user" title="User Must Hear"><a href="/must-hear/">Must Hear Album</a></div>
      <div class="albumCriticScore"><a title="92">92</a></div>
      <div class="albumCriticScoreBox"><div class="text numReviews">20 reviews</div><div class="text gray">1998 Ratings: <strong><a href="/ratings/6-highest-rated/1998/1#rank-2">#2</a></strong> / 50<span style="padding-left: 5px;">All Time: <strong><a href="/ratings/6-highest-rated/all/8#rank-178">#178</a></strong></span></div></div>
      <div class="albumUserScore"><a title="95">95</a></div>
      <div class="albumUserScoreBox"><div class="text numReviews">11,326 ratings</div><div class="text gray">1998 Ratings: <strong><a href="/ratings/user-highest-rated/1998/#rank-2">#2</a></strong><span style="padding-left: 5px;">All Time: <strong><a href="/ratings/user-highest-rated/all/2/#rank-46">#46</a></strong></span></div></div>
      <div class="albumTopBox info">
        <div class="detailRow">Release Date</div><div class="detailRow">LP</div>
        <div class="detailRow"><a href="/label/1-laface/">LaFace</a></div>
        <div class="detailRow"><a href="/genre/391-southern-hip-hop/">Southern Hip Hop</a>, <a href="/genre/317-conscious-hip-hop/">Conscious Hip Hop</a><br /><a href="/genre/131-neo-soul/"><div class="secondary">Neo-Soul</div></a></div>
        <div class="detailRow"><span class="actionBlank showAlbumCredits" data-type="2">Producer</span>: <a href="/artist/562-outkast/">OutKast</a> <span class="action showAlbumCredits" data-album-id="2915" data-type="2">+11&nbsp;more...</span></div>
        <div class="detailRow"><span class="actionBlank showAlbumCredits" data-type="6">Writer</span>: <a href="/artist/1-andre-3000/">Andr&eacute; 3000</a> <span class="action showAlbumCredits" data-album-id="2915" data-type="6">+17&nbsp;more...</span></div>
      </div>
      <table class="trackListTable">
        <tr>
          <td class="trackNumber">1</td>
          <td class="trackTitle"><a href="/song/15318-hold-on-be-strong/">Hold On, Be Strong</a><span class="length">4:40</span></td>
          <td class="trackRating"><span title="500 ratings">95</span></td>
        </tr>
      </table>
      <div class="albumReviewRow first" id="review_12890">
        <div class="albumReviewImage"><a href="/publication/8-all-music/"><img src="https://cdn.aoty.org/pub.jpg" /></a></div>
        <div class="albumReviewHeader">
          <div class="publication"><a href="/publication/8-all-music/">AllMusic</a></div>
          <div class="author"><a class="gray" href="/critic/512-steve-huey/">Steve Huey</a></div>
          <div class="date">Sep 29, 1998</div>
        </div>
        <div class="albumReviewRating">90</div>
        <div class="albumReviewText">A masterpiece.</div>
        <div class="albumReviewLinks">
          <div class="extLink"><a href="https://allmusic.com/review/1">Full Review</a></div>
          <div class="actionContainer" title="action1"></div>
          <div class="actionContainer" title="1998-09-29"></div>
        </div>
      </div>
      <div class="albumReviewRow" id="review_12891">
        <div class="albumReviewHeader">
          <div class="publication"><a href="/publication/9-rolling-stone/">Rolling Stone</a></div>
          <div class="author"><a class="gray" href="/critic/513-critic/">Some Critic</a></div>
        </div>
        <div class="albumReviewRating">80</div>
        <div class="albumReviewText">Great.</div>
        <div class="albumReviewLinks">
          <div class="extLink">Print Only</div>
          <div class="actionContainer" title="action1"></div>
          <div class="actionContainer" title="1998-10-01"></div>
        </div>
      </div>
      <div class="section"><div class="sectionHeading">Tags</div><div class="tag strong"><a href="/tag/southern+hip+hop/albums/">southern hip hop</a></div><div class="tag strong bold"><a href="/tag/lush/albums/">lush</a></div></div>
      <div class="rightBox">
        <div class="sectionHeading">Year End Lists</div>
        <TABLE class="listTable">
          <tr>
            <td class="rank">#<strong>2</strong></td>
            <td class="divider">/</td>
            <td><a href="/list/100-pitchfork-top-50-albums-of-1998.php">Pitchfork - Top 50 Albums of 1998</a></td>
          </tr>
          <tr>
            <td class="rank"></td>
            <td class="divider">/</td>
            <td><a href="/list/1193-gothamist-best-albums-of-1998/">Gothamist</a></td>
          </tr>
        </TABLE>
      </div>
      <div class="selectRow"><div class="selectBox">Overview</div><div class="selectBox">Comments (192)</div></div>
    `;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(html, { status: 200 });

    try {
      const album = await scrapeAlbumPage("https://www.albumoftheyear.org/album/2915-outkast-aquemini/");
      expect(album.mustHear).toBe(true);
      expect(album.criticRankingAllTime?.rank).toBe(178);
      expect(album.criticRankingAllTime?.url).toBe("https://www.albumoftheyear.org/ratings/6-highest-rated/all/8#rank-178");
      expect(album.userRankingAllTime?.rank).toBe(46);
      expect(album.producersMore).toBe(11);
      expect(album.writersMore).toBe(17);
      expect(album.genreLinks).toEqual([
        { name: "Southern Hip Hop", url: "https://www.albumoftheyear.org/genre/391-southern-hip-hop/" },
        { name: "Conscious Hip Hop", url: "https://www.albumoftheyear.org/genre/317-conscious-hip-hop/" },
        { name: "Neo-Soul", url: "https://www.albumoftheyear.org/genre/131-neo-soul/" },
      ]);
      expect(album.tags).toEqual(["southern hip hop", "lush"]);
      expect(album.commentCount).toBe(192);
      expect(album.tracklist[0]?.songId).toBe(15318);
      expect(album.yearEndLists.length).toBe(2);
      expect(album.yearEndLists[0]?.rank).toBe(2);
      expect(album.yearEndLists[1]?.rank).toBeNull();
      expect(album.yearEndLists[1]?.publication).toBe("Gothamist");
      expect(album.reviews.length).toBe(2);
      expect(album.reviews[0]?.id).toBe(12890);
      expect(album.reviews[0]?.publicationUrl).toBe("https://www.albumoftheyear.org/publication/8-all-music/");
      expect(album.reviews[0]?.criticUrl).toBe("https://www.albumoftheyear.org/critic/512-steve-huey/");
      expect(album.reviews[0]?.isPrintOnly).toBe(false);
      expect(album.reviews[0]?.url).toBe("https://allmusic.com/review/1");
      expect(album.reviews[1]?.id).toBe(12891);
      expect(album.reviews[1]?.isPrintOnly).toBe(true);
      expect(album.reviews[1]?.url).toBe("");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
