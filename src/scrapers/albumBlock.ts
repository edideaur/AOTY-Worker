import { BASE, decodeEntities, cleanImageUrl, parseCount, parseScore } from "../constants.js";
import type { AlbumBlock } from "../types.js";

type RawAlbumBlock = {
  url: string;
  artist: string;
  artistUrl: string;
  title: string;
  cover: string;
  mediaType: string;
  releaseDate: string;
  criticScore: string | null;
  criticCount: string | null;
  userScore: string | null;
  userCount: string | null;
  mustHear: boolean;
};

export async function scrapeAlbumBlocks(res: Response): Promise<AlbumBlock[]> {
  const rawAlbums: RawAlbumBlock[] = [];
  let cur: RawAlbumBlock | null = null;
  let ratingValue = "";
  let lastRatingType: "critic" | "user" | null = null;

  await new HTMLRewriter()
    .on(".albumBlock", {
      element(el) {
        cur = {
          url: "",
          artist: "",
          artistUrl: "",
          title: "",
          cover: "",
          mediaType: el.getAttribute("data-type") ?? "",
          releaseDate: "",
          criticScore: null,
          criticCount: null,
          userScore: null,
          userCount: null,
          mustHear: false,
        };
        rawAlbums.push(cur);
        lastRatingType = null;
        ratingValue = "";
      },
    })
    .on(".albumBlock .image a", {
      element(el) {
        if (cur && !cur.url) {
          const href = el.getAttribute("href");
          if (href) cur.url = BASE + href;
        }
      },
    })
    .on(".albumBlock .image img", {
      element(el) {
        if (cur) cur.cover = el.getAttribute("src") || el.getAttribute("data-src") || "";
      },
    })
    .on(".albumBlock .image .mustHear", {
      element() {
        if (cur) cur.mustHear = true;
      },
    })
    .on(".albumBlock .artistTitle", {
      text(t) {
        if (cur) cur.artist = (cur.artist ?? "") + t.text;
      },
    })
    .on(".albumBlock a", {
      element(el) {
        // artistTitle is sometimes a link (or wrapped in one); first /artist/ href wins.
        // Plain-text artist names leave artistUrl empty.
        const href = el.getAttribute("href") ?? "";
        if (cur && !cur.artistUrl && href.includes("/artist/")) {
          cur.artistUrl = href.startsWith("http") ? href : BASE + href;
        }
      },
    })
    .on(".albumBlock .albumTitle", {
      text(t) {
        if (cur) cur.title = (cur.title ?? "") + t.text;
      },
    })
    .on(".albumBlock .type", {
      text(t) {
        if (cur) cur.releaseDate = (cur.releaseDate ?? "") + t.text;
      },
    })
    .on(".albumBlock .ratingRow", {
      element() {
        ratingValue = "";
      },
    })
    .on(".albumBlock .ratingBlock .rating", {
      text(t) {
        ratingValue += t.text;
      },
    })
    .on(".albumBlock .ratingText", {
      text(t) {
        const text = t.text.trim().toLowerCase();
        if (text === "critic score") {
          if (cur) cur.criticScore = ratingValue.trim() || null;
          lastRatingType = "critic";
        } else if (text === "user score") {
          if (cur) cur.userScore = ratingValue.trim() || null;
          lastRatingType = "user";
        } else if (text.startsWith("(") && lastRatingType) {
          const count = text.replace(/[()]/g, "").trim();
          if (lastRatingType === "critic" && cur) cur.criticCount = count || null;
          else if (lastRatingType === "user" && cur) cur.userCount = count || null;
          lastRatingType = null;
        }
      },
    })
    .transform(res)
    .arrayBuffer();

  return rawAlbums.map((a) => ({
    url: a.url,
    artist: decodeEntities(a.artist.trim()),
    artistUrl: a.artistUrl,
    artistImage: null,
    title: decodeEntities(a.title.trim()),
    releaseDate: decodeEntities(a.releaseDate.trim()),
    cover: cleanImageUrl(a.cover.trim()),
    mediaType: a.mediaType,
    criticScore: parseScore(a.criticScore),
    criticCount: parseCount(a.criticCount),
    userScore: parseScore(a.userScore),
    userCount: parseCount(a.userCount),
    mustHear: a.mustHear,
  }));
}
