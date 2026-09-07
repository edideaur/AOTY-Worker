import { describe, it, expect } from "bun:test";
import {
  scrapeArtistSearch,
  scrapeLabelAutocomplete,
  scrapeLabelSearch,
  scrapeSearchAutocomplete,
  scrapeUserSearch,
} from "../src/scrapers/search.js";
import { mockFetch } from "./test_utils.js";

describe("search scrapers unit tests", () => {
  it("parses artist search results", async () => {
    const html = `
      <div class="artistBlock">
        <div class="image"><a href="/artist/183-kanye-west/"><img src="https://cdn.aoty.org/kanye.jpg" /></a></div>
        <div class="name"><a href="/artist/183-kanye-west/">Kanye West</a></div>
      </div>
      <div class="artistBlock">
        <a href="/artist/100-mike-dean/">
          <div class="name"><a>Mike Dean</a></div>
        </a>
      </div>
    `;

    const restore = mockFetch(async () => new Response(html, { status: 200 }));
    try {
      const res = await scrapeArtistSearch("http://mock/search/artists/?q=kanye");
      expect(res.length).toBe(2);
      expect(res[0]?.name).toBe("Kanye West");
      expect(res[0]?.url).toContain("/artist/183-kanye-west/");
      expect(res[0]?.image).toBe("https://cdn.aoty.org/kanye.jpg");
      expect(res[1]?.name).toBe("Mike Dean");
      expect(res[1]?.url).toContain("/artist/100-mike-dean/");
    } finally {
      restore();
    }
  });

  it("parses user search results", async () => {
    const html = `
      <div class="userRatingBlock">
        <a href="/user/zed/" title="zed"><img src="https://cdn.aoty.org/zed.jpg" />zed</a>
      </div>
    `;

    const restore = mockFetch(async () => new Response(html, { status: 200 }));
    try {
      const res = await scrapeUserSearch("http://mock/search/?q=zed");
      expect(res.length).toBe(1);
      expect(res[0]?.name).toBe("zed");
      expect(res[0]?.url).toContain("/user/zed/");
      expect(res[0]?.image).toBe("https://cdn.aoty.org/zed.jpg");
    } finally {
      restore();
    }
  });

  it("parses label search results", async () => {
    const html = `
      <div class="tagRow">
        <a href="/label/1-def-jam/">Def Jam</a>
        <div class="ui-autocomplete-descriptor">Legendary hip hop label.</div>
      </div>
    `;

    const restore = mockFetch(async () => new Response(html, { status: 200 }));
    try {
      const res = await scrapeLabelSearch("http://mock/search/labels/?q=def+jam");
      expect(res.length).toBe(1);
      expect(res[0]?.name).toBe("Def Jam");
      expect(res[0]?.url).toContain("/label/1-def-jam/");
      expect(res[0]?.description).toBe("Legendary hip hop label.");
    } finally {
      restore();
    }
  });

  it("parses label autocomplete suggestions", async () => {
    const json = [
      { value: "Def Jam", link: "/label/1-def-jam/", desc: "Hip Hop" },
      { label: "XL Recordings", url: "https://www.albumoftheyear.org/label/2-xl/" },
    ];

    const restore = mockFetch(async () => new Response(JSON.stringify(json), { status: 200 }));
    try {
      const res = await scrapeLabelAutocomplete("def");
      expect(res.length).toBe(2);
      expect(res[0]?.value).toBe("Def Jam");
      expect(res[0]?.link).toContain("/label/1-def-jam/");
      expect(res[0]?.description).toBe("Hip Hop");
      expect(res[1]?.value).toBe("XL Recordings");
      expect(res[1]?.link).toBe("https://www.albumoftheyear.org/label/2-xl/");
    } finally {
      restore();
    }
  });

  it("handles label autocomplete fetch error", async () => {
    const restore = mockFetch(async () => new Response("Error", { status: 500 }));
    try {
      expect(scrapeLabelAutocomplete("def")).rejects.toThrow("Label autocomplete fetch failed: 500");
    } finally {
      restore();
    }
  });

  it("parses search autocomplete suggestions", async () => {
    const json = [
      { value: "Radiohead", label: "Radiohead (Artist)", link: "/artist/1-radiohead/", type: "artist", image: "rh.jpg" },
      { name: "OK Computer", url: "https://www.albumoftheyear.org/album/1-okc/", type: "album" },
    ];

    const restore = mockFetch(async () => new Response(JSON.stringify(json), { status: 200 }));
    try {
      const res = await scrapeSearchAutocomplete("radio");
      expect(res.length).toBe(2);
      expect(res[0]?.value).toBe("Radiohead");
      expect(res[0]?.label).toBe("Radiohead (Artist)");
      expect(res[0]?.link).toContain("/artist/1-radiohead/");
      expect(res[0]?.type).toBe("artist");
      expect(res[0]?.image).toBe("rh.jpg");
      expect(res[1]?.value).toBe("OK Computer");
      expect(res[1]?.link).toBe("https://www.albumoftheyear.org/album/1-okc/");
      expect(res[1]?.type).toBe("album");
    } finally {
      restore();
    }
  });

  it("handles search autocomplete fetch error", async () => {
    const restore = mockFetch(async () => new Response("Error", { status: 500 }));
    try {
      expect(scrapeSearchAutocomplete("radio")).rejects.toThrow("Search autocomplete fetch failed: 500");
    } finally {
      restore();
    }
  });
});
