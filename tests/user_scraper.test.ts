import { describe, it, expect } from "bun:test";
import { mockFetch } from "./test_utils.js";
import {
  scrapeUserProfile,
  scrapeUserRatings,
  scrapeUserListened,
  scrapeUserLibrary,
  scrapeUserLikedAlbums,
  scrapeUserTags,
  scrapeUserTagDetail,
  scrapeFollowList,
  scrapeUserReviewsPage,
  scrapeAlbumUserReviews,
  scrapeUserReviewDetail,
  scrapeUserLists,
  scrapeUserListsIndex,
  scrapeSearchLists,
  scrapeUserListDetail,
  scrapeUsersCommunity,
  scrapeUserBadges,
  scrapeUserGenres,
  scrapeUserYearEnd,
  scrapeUserDistribution,
  scrapeUserArtistRatings,
  scrapeUserAlbumTrackRatings,
} from "../src/scrapers/user.js";

describe("user scrapers unit tests", () => {
  it("parses user profile correctly", async () => {
    const html = `
      <h1 class="headline profile"><span style="color: #60C4A5;">Music Geek</span><div style="display:block; font-size: 12px; color: gray;">(musicgeek)</div></h1>
      <button class="showImage" data-user-id="512173"></button>
      <div>Member since January 27, 2025</div>
      <a href="/year-end/musicgeek/2025/">2025</a>
      <div class="profileImage"><img src="https://cdn.aoty.org/avatar.jpg" /></div>
      <div class="profileLocation"><i class="fas fa-map-marker-alt"></i> Chicago, IL</div>
      <div class="aboutUser">Music obsessive and vinyl collector.</div>
      <div class="profileLink"><a href="https://twitter.com/musicgeek">twitter</a></div>
      <div class="profileStat">1,250</div><div class="profileStatName">Ratings</div>
      <div class="profileStat">45</div><div class="profileStatName">Reviews</div>
      <div class="profileStat">12</div><div class="profileStatName">Lists</div>
      <div class="profileStat">300</div><div class="profileStatName">Followers</div>
      <div class="profileStat">150</div><div class="profileStatName">Following</div>
      <div class="donorBanner">Subscriber</div>
      <h2 class="sectionHeading">Pinned Review</h2>
      <div class="albumReviewRow" id="review_99">
        <div class="userReviewName"><a href="/user/musicgeek/">Music Geek</a></div>
        <div class="rating">100</div>
        <div class="albumReviewText user"><p>Pinned review text</p></div>
        <div class="review_likes">50</div>
        <div class="comment_count">10</div>
        <div class="review_date">1w</div>
      </div>
      <table class="dist">
        <tr class="distRow"><td class="distLabel"><a href="/user/musicgeek/ratings/perfect/">100</a></td><td class="distCount">15</td></tr>
        <tr class="distRow"><td class="distLabel">90 - 99</td><td class="distCount">80</td></tr>
      </table>
      <div id="favBlock"><div class="albumBlock" data-type="LP"><div class="artistTitle">Radiohead</div><div class="albumTitle">In Rainbows</div></div></section>
    `;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(html, { status: 200 });

    try {
      const profile = await scrapeUserProfile("musicgeek");
      expect(profile.username).toBe("musicgeek");
      expect(profile.displayName).toBe("Music Geek");
      expect(profile.userId).toBe(512173);
      expect(profile.memberSince).toBe("January 27, 2025");
      expect(profile.yearEndLists).toEqual([2025]);
      expect(profile.pinnedReview?.rating).toBe(100);
      expect(profile.avatar).toBe("https://cdn.aoty.org/avatar.jpg");
      expect(profile.bio).toBe("Music obsessive and vinyl collector.");
      expect(profile.location).toBe("Chicago, IL");
      expect(profile.links).toEqual([{ name: "twitter", url: "https://twitter.com/musicgeek" }]);
      expect(profile.subscriber).toBe(true);
      expect(profile.ratingDistribution).toEqual([
        { label: "100", count: 15 },
        { label: "90 - 99", count: 80 },
      ]);
      expect(profile.favorites.length).toBe(1);
      expect(profile.favorites[0].title).toBe("In Rainbows");
      expect(profile.stats.ratings).toBe(1250);
      expect(profile.stats.reviews).toBe(45);
      expect(profile.stats.lists).toBe(12);
      expect(profile.stats.followers).toBe(300);
      expect(profile.stats.following).toBe(150);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("parses user ratings and album blocks correctly", async () => {
    const html = `
      <div class="albumBlock" data-type="LP">
        <div class="image"><a href="/album/1-okc/"><img src="https://cdn.aoty.org/okc.jpg" /></a><span class="mustHear">Must Hear</span></div>
        <div class="artistTitle">Radiohead</div>
        <div class="albumTitle">OK Computer</div>
        <div class="type functions">1997</div>
        <div class="ratingRow">
          <div class="ratingBlock"><div class="rating">100</div></div>
          <div class="ratingText">critic score</div>
          <div class="ratingText">(50)</div>
          <div class="ratingBlock"><div class="rating">95</div></div>
          <div class="ratingText">user score</div>
          <div class="ratingText">(100)</div>
          <div class="ratingText">May 21, 1997</div>
        </div>
        <a href="/user/musicgeek/album/1-okc/">Review</a>
      </div>
    `;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(html, { status: 200 });

    try {
      const res = await scrapeUserRatings("musicgeek", undefined, { page: 1, type: "lp", decade: "1990", sort: "highest" });
      expect(res.username).toBe("musicgeek");
      expect(res.page).toBe(1);
      expect(res.type).toBe("lp");
      expect(res.decade).toBe("1990");
      expect(res.sort).toBe("highest");
      expect(res.ratings.length).toBe(1);
      expect(res.ratings[0].artist).toBe("Radiohead");
      expect(res.ratings[0].title).toBe("OK Computer");
      expect(res.ratings[0].userRating).toBe(100);
      expect(res.ratings[0].mustHear).toBe(true);
      expect(res.ratings[0].reviewUrl).toBe("https://www.albumoftheyear.org/user/musicgeek/album/1-okc/");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("strips CDN size prefixes from user album block covers", async () => {
    const html = `
      <div class="albumBlock" data-type="LP">
        <div class="image"><a href="/album/1-okc/"><img src="https://cdn2.albumoftheyear.org/200x0/album/1-ok-computer_123.jpg" /></a></div>
        <div class="artistTitle">Radiohead</div>
        <div class="albumTitle">OK Computer</div>
        <div class="type functions">1997</div>
      </div>
    `;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(html, { status: 200 });

    try {
      const res = await scrapeUserRatings("musicgeek", undefined, { page: 1 });
      expect(res.ratings.length).toBe(1);
      expect(res.ratings[0].cover).toBe("https://cdn2.albumoftheyear.org/album/1-ok-computer_123.jpg");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("parses user listened and user library", async () => {
    const html = `
      <div class="albumBlock">
        <div class="image"><a href="/album/2-kid-a/"><img src="https://cdn.aoty.org/kida.jpg" /></a></div>
        <div class="artistTitle">Radiohead</div>
        <div class="albumTitle">Kid A</div>
        <div class="type functions">2000</div>
      </div>
    `;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(html, { status: 200 });

    try {
      const listened = await scrapeUserListened("musicgeek", 2);
      expect(listened.page).toBe(2);
      expect(listened.ratings.length).toBe(1);
      expect(listened.ratings[0].title).toBe("Kid A");

      const lib = await scrapeUserLibrary("musicgeek", undefined, { show: "unrated", sort: "title", page: 2 });
      expect(lib.show).toBe("unrated");
      expect(lib.sort).toBe("title");
      expect(lib.page).toBe(2);
      expect(lib.ratings.length).toBe(1);

      const libP1 = await scrapeUserLibrary("musicgeek");
      expect(libP1.page).toBe(1);

      const liked = await scrapeUserLikedAlbums("musicgeek", 1);
      expect(liked.page).toBe(1);
      expect(liked.ratings.length).toBe(1);
      expect(liked.ratings[0].title).toBe("Kid A");

      const likedP2 = await scrapeUserLikedAlbums("musicgeek", 2);
      expect(likedP2.page).toBe(2);
      expect(likedP2.ratings.length).toBe(1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("parses user tags and user tag detail", async () => {
    const html = `
      <div class="tagColumn">
        <div>
          <span class="tag"><a href="/user/musicgeek/tag/favorite/">Favorite</a></span>
          <span style="font-size: 12px; float:right; color: #777;">42</span>
        </div>
      </div>
    `;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(html, { status: 200 });

    try {
      const tags = await scrapeUserTags("musicgeek", "albums", "count");
      expect(tags.username).toBe("musicgeek");
      expect(tags.scope).toBe("albums");
      expect(tags.tags.length).toBe(1);
      expect(tags.tags[0].tag).toBe("Favorite");
      expect(tags.tags[0].count).toBe(42);

      const tagDetail = await scrapeUserTagDetail("musicgeek", "favorite", "date", undefined, 2);
      expect(tagDetail.tag).toBe("favorite");
      expect(tagDetail.sort).toBe("date");
      expect(tagDetail.page).toBe(2);

      const tagDetailP1 = await scrapeUserTagDetail("musicgeek", "favorite", null);
      expect(tagDetailP1.page).toBe(1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("parses user followers and following", async () => {
    const html = `
      <div class="listRow users">
        <div class="profilePic"><img src="https://cdn.aoty.org/fan.jpg" /></div>
        <div class="userName"><a href="/user/fan/">fan_person</a></div>
      </div>
    `;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(html, { status: 200 });

    try {
      const followers = await scrapeFollowList("musicgeek", "followers", 1);
      expect(followers.kind).toBe("followers");
      expect(followers.users.length).toBe(1);
      expect(followers.users[0].name).toBe("fan_person");
      expect(followers.users[0].url).toBe("https://www.albumoftheyear.org/user/fan/");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("parses user reviews (global and user-specific)", async () => {
    const globalHtml = `
      <div class="userReviewBlock">
        <div class="cover"><a href="/album/100-review/"><img src="https://cdn.aoty.org/rev.jpg" /></a></div>
        <div class="artistTitle"><a href="/artist/10-artist/">Great Artist</a></div>
        <div class="albumTitle"><a href="/album/100-album/">Great Album</a></div>
        <div class="profilePic"><a href="/user/reviewer/"><img src="https://cdn.aoty.org/reviewer.jpg" /></a></div>
        <div class="userName"><a href="/user/reviewer/">Reviewer</a></div>
        <div class="rating">90</div>
        <div class="reviewText">Incredible release from start to finish.</div>
        <div class="review_likes">15</div>
        <div class="review_comments">3</div>
        <div class="review_date" title="2024-01-01">Yesterday</div>
      </div>
    `;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(globalHtml, { status: 200 });

    try {
      const globalReviews = await scrapeUserReviewsPage("-", 1, "popular");
      expect(globalReviews.reviews.length).toBe(1);
      expect(globalReviews.reviews[0].artist).toBe("Great Artist");
      expect(globalReviews.reviews[0].album).toBe("Great Album");
      expect(globalReviews.reviews[0].rating).toBe(90);
      expect(globalReviews.reviews[0].likes).toBe(15);
      expect(globalReviews.reviews[0].comments).toBe(3);
    } finally {
      globalThis.fetch = originalFetch;
    }

    const userHtml = `
      <div class="albumReviewRow">
        <div class="userReviewImage"><a href="/user/musicgeek/album/100-album/"><img src="https://cdn.aoty.org/rev.jpg" /></a></div>
        <div class="userReviewName"><a href="/user/musicgeek/">musicgeek</a></div>
        <div class="artistTitle"><a href="/artist/10-artist/">Great Artist</a></div>
        <div class="albumTitle"><a href="/album/100-album/">Great Album</a></div>
        <div class="rating">85</div>
        <div class="albumReviewText">Personal favorite. read more</div>
        <div class="review_likes">5</div>
        <div class="review_comments">1</div>
        <div class="review_date">2 days ago</div>
        <div class="actionContainer" title="2 days ago"></div>
      </div>
      <div class="albumReviewRow">
        <div class="userReviewImage"><a href="/user/musicgeek/"><img src="https://cdn.aoty.org/avatar.jpg" /></a></div>
        <div class="userReviewName"><a href="/user/musicgeek/">musicgeek</a></div>
        <div class="artistTitle"><a href="/artist/10-artist/">Great Artist</a></div>
        <div class="albumTitle"><a href="/album/101-album/">Second Album</a></div>
        <div class="rating">90</div>
        <div class="albumReviewText"><a href="/user/musicgeek/album/101-album/">Full review</a> here.</div>
        <div class="review_date">3 days ago</div>
      </div>
    `;

    globalThis.fetch = async () => new Response(userHtml, { status: 200 });

    try {
      const userReviews = await scrapeUserReviewsPage("musicgeek", 1, "recent");
      expect(userReviews.reviews.length).toBe(2);
      expect(userReviews.reviews[0].album).toBe("Great Album");
      expect(userReviews.reviews[0].rating).toBe(85);
      expect(userReviews.reviews[0].text).toBe("Personal favorite.");
      expect(userReviews.reviews[1].album).toBe("Second Album");
      expect(userReviews.reviews[1].rating).toBe(90);

      const albumReviews = await scrapeAlbumUserReviews("100-album", "recent", 1);
      expect(albumReviews.reviews.length).toBe(2);

      const worstReviews = await scrapeAlbumUserReviews("100-album", "worst", 2);
      expect(worstReviews.sort).toBe("worst");
      expect(worstReviews.page).toBe(2);

      const bestReviews = await scrapeAlbumUserReviews("100-album", "best", 1);
      expect(bestReviews.sort).toBe("best");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("parses user review detail correctly", async () => {
    const html = `
      <h2 class="artist"><a href="/artist/10-artist/">Great Artist</a></h2>
      <h1 class="albumTitle"><a href="/album/100-album/">Great Album</a></h1>
      <div class="userReviewHeader"><div class="cover"><img src="https://cdn.aoty.org/cover.jpg" /></div></div>
      <div class="userReviewByline"><div class="image"><img src="https://cdn.aoty.org/avatar.jpg" /></div></div>
      <div class="userReviewScoreBox"><div class="albumCriticScore">95</div></div>
      <div class="userReviewText">Deeply moving soundscapes.</div>
      <div class="review_likes">42</div>
      <div class="comment_count">7</div>
      <div class="reviewDate"><span title="2024-05-01">May 1, 2024</span></div>
      <div class="albumListLinks"><a href="https://spotify.com/123"><div>Spotify</div></a></div>
      « <a href="/user/musicgeek/album/99-prev/" title="Previous Album"><img src="https://cdn.aoty.org/p.jpg" /></a>
      » <a href="/user/musicgeek/album/101-next/" title="Next Album"><img src="https://cdn.aoty.org/n.jpg" /></a>
      <div class="commentRow" id="comment_1">
        <div class="commentUserName"><a href="/user/commenter/">Commenter</a></div>
        <div class="commentText">Nice review!</div>
      </div>
      <table class="trackListTable">
        <tr>
          <td class="trackNumber">1</td>
          <td class="trackTitle"><a href="/song/1-intro/">Intro</a><span>90</span></td>
        </tr>
      </table>
    `;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(html, { status: 200 });

    try {
      const detail = await scrapeUserReviewDetail("musicgeek", "100-great-album");
      expect(detail.artist).toBe("Great Artist");
      expect(detail.album).toBe("Great Album");
      expect(detail.rating).toBe(95);
      expect(detail.text).toBe("Deeply moving soundscapes.");
      expect(detail.likes).toBe(42);
      expect(detail.comments).toBe(7);
      expect(detail.date).toBe("2024-05-01");
      expect(detail.albumId).toBe(100);
      expect(detail.trackRatings.length).toBe(1);
      expect(detail.trackRatings[0].title).toBe("Intro");
      expect(detail.trackRatings[0].rating).toBe(90);
      expect(detail.streamingLinks?.length).toBe(1);
      expect(detail.streamingLinks?.[0]?.platform).toBe("Spotify");
      expect(detail.previousReview?.title).toBe("Previous Album");
      expect(detail.nextReview?.title).toBe("Next Album");
      expect(detail.commentsList?.length).toBe(1);
      expect(detail.commentsList?.[0]?.username).toBe("Commenter");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("parses user lists, user lists index, search lists, user list detail, and community", async () => {
    const listRowHtml = `
      <div class="userListRow">
        <div class="listTitle"><a href="/user/musicgeek/list/1-top-10/">Top 10 of All Time</a></div>
        <div class="byLine"><a href="/user/musicgeek/">musicgeek</a></div>
        <div class="userImage"><img src="https://cdn.aoty.org/avatar.jpg" /></div>
        <div class="covers"><img src="https://cdn.aoty.org/c1.jpg" /><img src="https://cdn.aoty.org/c2.jpg" /></div>
        <div class="listDescription">A curated selection.</div>
        <div class="points">25</div>
        <div class="comment_count">4</div>
      </div>
    `;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(listRowHtml, { status: 200 });

    try {
      const userLists = await scrapeUserLists("musicgeek", undefined, 2);
      expect(userLists.page).toBe(2);
      expect(userLists.lists.length).toBe(1);
      expect(userLists.lists[0].title).toBe("Top 10 of All Time");
      expect(userLists.lists[0].covers.length).toBe(2);
      expect(userLists.lists[0].likes).toBe(25);
      expect(userLists.lists[0].comments).toBe(4);

      const userListsP1 = await scrapeUserLists("musicgeek");
      expect(userListsP1.page).toBe(1);

      const index = await scrapeUserListsIndex(undefined, 2);
      expect(index.length).toBe(1);

      const search = await scrapeSearchLists("electronic");
      expect(search.query).toBe("electronic");
      expect(search.lists.length).toBe(1);

      const community = await scrapeUsersCommunity();
      expect(community.lists.length).toBe(1);
    } finally {
      globalThis.fetch = originalFetch;
    }

    const detailHtml = `
      <div class="listHeader"><h1 class="headline">Top 10 of All Time</h1></div>
      <div class="listDescription">Essential records.</div>
      <div class="userListRow">
        <div class="rank">1</div>
        <div class="userCover"><a href="/album/1-okc/"><img src="https://cdn.aoty.org/okc.jpg" /></a></div>
        <div class="artistName"><a href="/artist/1-radiohead/">Radiohead</a></div>
        <div class="albumTitle"><a href="/album/1-okc/">OK Computer</a><a href="/releases/1997/">1997</a></div>
      </div>
    `;

    globalThis.fetch = async () => new Response(detailHtml, { status: 200 });

    try {
      const listDetail = await scrapeUserListDetail("musicgeek", "1-top-10");
      expect(listDetail.title).toBe("Top 10 of All Time");
      expect(listDetail.description).toBe("Essential records.");
      expect(listDetail.items.length).toBe(1);
      expect(listDetail.items[0].artist).toBe("Radiohead");
      expect(listDetail.items[0].title).toBe("OK Computer");
      expect(listDetail.items[0].year).toBe(1997);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("parses user genres correctly", async () => {
    const html = `
      <div class="genreRow">
        <a href="/genre/1-rock/">Rock</a>
        <span class="count">142</span>
        <span class="percentage">25%</span>
        <span class="averageScore">85</span>
      </div>
      <div class="genreRow">
        <a href="/genre/2-hip-hop/">Hip Hop</a>
        <span class="count">98</span>
      </div>
    `;

    const restore = mockFetch(async () => new Response(html, { status: 200 }));
    try {
      const res = await scrapeUserGenres("musicgeek");
      expect(res.username).toBe("musicgeek");
      expect(res.genres.length).toBe(2);
      expect(res.genres[0]?.name).toBe("Rock");
      expect(res.genres[0]?.url).toContain("/genre/1-rock/");
      expect(res.genres[0]?.count).toBe(142);
      expect(res.genres[0]?.percentage).toBe(25);
      expect(res.genres[0]?.averageScore).toBe(85);
      expect(res.genres[1]?.name).toBe("Hip Hop");
      expect(res.genres[1]?.count).toBe(98);
    } finally {
      restore();
    }
  });

  it("handles user genres fetch error", async () => {
    const restore = mockFetch(async () => new Response("Error", { status: 500 }));
    try {
      expect(scrapeUserGenres("musicgeek")).rejects.toThrow("User genres fetch failed: 500");
    } finally {
      restore();
    }
  });

  it("parses user badges correctly", async () => {
    const html = `
      <div class="badgeRow">
        <img src="badge1.png" />
        <div class="title">Gold Reviewer</div>
        <div class="desc">Written over 50 reviews</div>
        <div class="date">May 2024</div>
      </div>
    `;

    const restore = mockFetch(async () => new Response(html, { status: 200 }));
    try {
      const res = await scrapeUserBadges("musicgeek");
      expect(res.username).toBe("musicgeek");
      expect(res.badges.length).toBe(1);
      expect(res.badges[0]?.name).toBe("Gold Reviewer");
      expect(res.badges[0]?.description).toBe("Written over 50 reviews");
      expect(res.badges[0]?.image).toBe("badge1.png");
      expect(res.badges[0]?.date).toBe("May 2024");
    } finally {
      restore();
    }
  });

  it("handles user badges fetch error", async () => {
    const restore = mockFetch(async () => new Response("Error", { status: 500 }));
    try {
      expect(scrapeUserBadges("musicgeek")).rejects.toThrow("User badges fetch failed: 500");
    } finally {
      restore();
    }
  });

  it("parses user year-end list correctly", async () => {
    const html = `
      <div class="userName"><a title="musicgeek">Music Geek</a></div>
      <div class="userImage"><a href="/user/musicgeek/"><img src="https://cdn.aoty.org/avatar.jpg" /></a></div>
      <div class="yearEnd block" data-album-index="0"><img src="https://cdn.aoty.org/addison.jpg" /></div>
      <ol class="ranked">
        <li data-album-index="0"><a href="/album/1284540-addison.php">Addison Rae - Addison</a></li>
      </ol>
      <section class="fullWidth paddingBottom moreInfo">
        <div><span class="category">genres</span> / dance-pop, electropop</div>
        <div><span class="category">secondaries</span> / alt-pop, synthpop</div>
        <div><span class="category">descriptors</span> / energetic, party</div>
      </section>
    `;

    const restore = mockFetch(async () => new Response(html, { status: 200 }));
    try {
      const res = await scrapeUserYearEnd("musicgeek", 2025);
      expect(res.username).toBe("musicgeek");
      expect(res.displayName).toBe("Music Geek");
      expect(res.avatar).toBe("https://cdn.aoty.org/avatar.jpg");
      expect(res.year).toBe(2025);
      expect(res.albums.length).toBe(1);
      expect(res.albums[0]?.rank).toBe(1);
      expect(res.albums[0]?.artist).toBe("Addison Rae");
      expect(res.albums[0]?.album).toBe("Addison");
      expect(res.albums[0]?.cover).toBe("https://cdn.aoty.org/addison.jpg");
      expect(res.genres).toEqual(["dance-pop", "electropop"]);
      expect(res.secondaries).toEqual(["alt-pop", "synthpop"]);
      expect(res.descriptors).toEqual(["energetic", "party"]);
    } finally {
      restore();
    }
  });

  it("parses user distribution correctly", async () => {
    const html = `
      <table class="dist">
        <tr class="distRow"><td class="distLabel">100</td><td class="distCount">20</td><td class="max"><div class="distBar" style="width:50%;"></div></td></tr>
        <tr class="distRow"><td class="distLabel">90 - 99</td><td class="distCount">40</td><td class="max"><div class="distBar" style="width:100%;"></div></td></tr>
      </table>
    `;

    let calledBody = "";
    const restore = mockFetch(async (_input, init) => {
      calledBody = String(init?.body ?? "");
      return new Response(html, { status: 200 });
    });
    try {
      const res = await scrapeUserDistribution("512173", "singles");
      expect(res.username).toBe("512173");
      expect(res.format).toBe("singles");
      expect(calledBody).toContain("itemID=512173");
      expect(calledBody).toContain("format=singles");
      expect(res.rows.length).toBe(2);
      expect(res.rows[0]?.label).toBe("100");
      expect(res.rows[0]?.count).toBe(20);
      expect(res.rows[0]?.percentage).toBe(50);
    } finally {
      restore();
    }
  });

  it("handles user ratings with year and genre parameters", async () => {
    const html = `<div class="albumBlock" data-type="LP"><div class="artistTitle">Artist</div><div class="albumTitle">Album</div><div class="ratingRow"><div class="rating">90</div></div></div>`;
    let requestedUrl = "";
    const restore = mockFetch(async (input) => {
      requestedUrl = String(input);
      return new Response(html, { status: 200 });
    });
    try {
      await scrapeUserRatings("musicgeek", undefined, { year: "2026", genreId: "7", sort: "perfect" });
      expect(requestedUrl).toContain("/user/musicgeek/ratings/perfect/");
      expect(requestedUrl).toContain("y=2026");
      expect(requestedUrl).toContain("genreID=7");
    } finally {
      restore();
    }
  });

  it("handles scrapeUserArtistRatings correctly", async () => {
    const html = `
      <div class="content"><div class="inner"><div id="listEdit"><table>
        <tr>
          <td class="rank">1</td>
          <td class="tableCover"><a href="/album/887267-brat.php"><img src="brat.jpg"></a></td>
          <td class="albumInfo"><div class="largeTitle"><a href="/album/887267-brat.php">BRAT</a></div><div style="color: gray; font-size: .9em;">2024</div></td>
          <td class="tableRating"><div class="green-font">100</div></td>
          <td class="tableRating"><a href="/user/musicgeek/album/887267-brat/">Review</a></td>
        </tr>
      </table></div></div></div>
    `;
    let calledBody = "";
    const restore = mockFetch(async (_input, init) => {
      calledBody = String(init?.body ?? "");
      return new Response(html, { status: 200 });
    });
    try {
      const res = await scrapeUserArtistRatings("512173", "2255");
      expect(res.username).toBe("512173");
      expect(res.artistId).toBe(2255);
      expect(calledBody).toContain("userID=512173");
      expect(calledBody).toContain("artistID=2255");
      expect(res.ratings.length).toBe(1);
      expect(res.ratings[0]?.rank).toBe(1);
      expect(res.ratings[0]?.album).toBe("BRAT");
      expect(res.ratings[0]?.year).toBe(2024);
      expect(res.ratings[0]?.score).toBe(100);
      expect(res.ratings[0]?.reviewUrl).toContain("/user/musicgeek/album/887267-brat/");
    } finally {
      restore();
    }
  });

  it("handles scrapeUserAlbumTrackRatings correctly", async () => {
    const html = `
      <div class="albumHeadline small"><h1 class="albumTitle"><a href="/album/1-luck.php">Hilary Duff - luck… or something</a></h1></div>
      <div class="albumHeaderCover"><img src="https://cdn.aoty.org/c.jpg" /></div>
      <table class="trackListTable">
        <tr>
          <td class="trackNumber">1</td>
          <td class="trackTitle"><a href="/song/10-tennis/">Weather for Tennis</a><div class="length">3:16</div></td>
          <td class="trackRating"><span class="green-font">100</span></td>
        </tr>
      </table>
    `;
    let calledBody = "";
    const restore = mockFetch(async (_input, init) => {
      calledBody = String(init?.body ?? "");
      return new Response(html, { status: 200 });
    });
    try {
      const res = await scrapeUserAlbumTrackRatings("512173", "1535377");
      expect(res.username).toBe("512173");
      expect(res.albumId).toBe(1535377);
      expect(res.artist).toBe("Hilary Duff");
      expect(res.album).toBe("luck… or something");
      expect(res.cover).toBe("https://cdn.aoty.org/c.jpg");
      expect(calledBody).toContain("albumID=1535377");
      expect(calledBody).toContain("userID=512173");
      expect(res.tracks.length).toBe(1);
      expect(res.tracks[0]?.number).toBe(1);
      expect(res.tracks[0]?.title).toBe("Weather for Tennis");
      expect(res.tracks[0]?.length).toBe("3:16");
      expect(res.tracks[0]?.score).toBe(100);
    } finally {
      restore();
    }
  });

  it("parses featured-artist links in user track ratings", async () => {
    const html = `
      <div class="albumHeadline small"><h1 class="albumTitle"><a href="/album/1-x.php">Artist - Album</a></h1></div>
      <table class="trackListTable">
        <tr>
          <td class="trackNumber">1</td>
          <td class="trackTitle"><a href="/song/1-track/">Track One</a><div class="length">3:00</div><div class="featuredArtists">feat. <a href="/artist/5-guest/">Guest Star</a></div></td>
          <td class="trackRating"><span class="green-font">90</span></td>
        </tr>
      </table>
    `;
    const restore = mockFetch(async () => new Response(html, { status: 200 }));
    try {
      const res = await scrapeUserAlbumTrackRatings("512173", "1");
      expect(res.tracks.length).toBe(1);
      expect(res.tracks[0]?.features).toEqual(["Guest Star"]);
      expect(res.tracks[0]?.featureLinks).toEqual([
        { name: "Guest Star", url: "https://www.albumoftheyear.org/artist/5-guest/", image: null },
      ]);
    } finally {
      restore();
    }
  });
});
