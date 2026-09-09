import { BASE, FETCH_OPTS, REQ_HEADERS, cleanImageUrl, decodeEntities, type FetchOpts } from "../constants.js";
import type { LabelAutocompleteItem, SearchArtist, SearchAutocompleteItem, SearchLabel } from "../types.js";

export async function scrapeArtistSearch(url: string, opts: FetchOpts = FETCH_OPTS): Promise<SearchArtist[]> {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`Artist search failed: ${res.status}`);

  const artists: SearchArtist[] = [];
  let current: SearchArtist | null = null;

  await new HTMLRewriter()
    .on(".artistBlock", {
      element() {
        current = { url: "", name: "", image: null };
        artists.push(current);
      },
    })
    .on(".artistBlock .image a", {
      element(el) {
        if (current) {
          const href = el.getAttribute("href");
          if (href) current.url = BASE + href;
        }
      },
    })
    .on(".artistBlock .image img", {
      element(el) {
        if (current) current.image = cleanImageUrl(el.getAttribute("src") ?? null);
      },
    })
    .on(".artistBlock > a", {
      element(el) {
        if (current && !current.url) {
          const href = el.getAttribute("href");
          if (href) current.url = BASE + href;
        }
      },
    })
    .on(".artistBlock .name a", {
      text(t) { if (current) current.name += t.text; },
    })
    .transform(res)
    .arrayBuffer();

  return artists.map((a) => ({
    ...a,
    name: decodeEntities((a.name ?? "").trim()),
    image: cleanImageUrl(a.image ?? null),
  }));
}

export async function scrapeUserSearch(url: string, opts: FetchOpts = FETCH_OPTS): Promise<SearchArtist[]> {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`User search failed: ${res.status}`);

  const users: SearchArtist[] = [];
  let current: SearchArtist | null = null;

  await new HTMLRewriter()
    .on(".userRatingBlock", {
      element() {
        current = { url: "", name: "", image: null };
        users.push(current);
      },
    })
    .on(".userRatingBlock a", {
      element(el) {
        if (current) {
          const href = el.getAttribute("href");
          if (href?.includes("/user/")) {
            if (!current.url) current.url = BASE + href;
            const title = el.getAttribute("title");
            if (title && !current.name) current.name = title;
          }
        }
      },
      text(t) {
        if (current && !(current.name ?? "").trim()) current.name = (current.name ?? "") + t.text;
      },
    })
    .on(".userRatingBlock img", {
      element(el) {
        if (current) current.image = cleanImageUrl(el.getAttribute("src") ?? null);
      },
    })
    .transform(res)
    .arrayBuffer();

  return users.map((a) => ({
    ...a,
    name: decodeEntities((a.name ?? "").trim()),
    image: cleanImageUrl(a.image ?? null),
  }));
}

export async function scrapeLabelSearch(url: string, opts: FetchOpts = FETCH_OPTS): Promise<SearchLabel[]> {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`Label search failed: ${res.status}`);

  const labels: SearchLabel[] = [];
  let current: SearchLabel | null = null;

  await new HTMLRewriter()
    .on(".tagRow", {
      element() {
        current = { url: "", name: "", description: null };
        labels.push(current);
      },
    })
    .on(".tagRow a[href*='/label/']", {
      element(el) {
        if (current && !current.url) {
          const href = el.getAttribute("href");
          if (href) current.url = BASE + href;
        }
      },
      text(t) { if (current) current.name += t.text; },
    })
    .on(".tagRow .ui-autocomplete-descriptor", {
      text(t) { if (current) current.description = (current.description ?? "") + t.text; },
    })
    .transform(res)
    .arrayBuffer();

  return labels.map((l) => ({
    url: l.url ?? "",
    name: decodeEntities((l.name ?? "").trim()),
    description: l.description ? decodeEntities(l.description.trim()) : null,
  }));
}

export async function scrapeLabelAutocomplete(query: string, opts: FetchOpts = FETCH_OPTS): Promise<LabelAutocompleteItem[]> {
  const enc = encodeURIComponent(query);
  const res = await fetch(`${BASE}/scripts/labelAutocomplete.php?q=${enc}&term=${enc}`, {
    ...opts,
    headers: { ...REQ_HEADERS, "X-Requested-With": "XMLHttpRequest", Referer: `${BASE}/` },
  });
  if (!res.ok) throw new Error(`Label autocomplete fetch failed: ${res.status}`);
  const data = (await res.json()) as Array<Record<string, unknown>>;
  return data
    .map((item) => {
      const value = decodeEntities(String(item["value"] ?? item["label"] ?? item["name"] ?? "").trim());
      const rawLink = String(item["link"] ?? item["url"] ?? "");
      const link = rawLink.startsWith("http") ? rawLink : rawLink ? `${BASE}${rawLink.startsWith("/") ? "" : "/"}${rawLink}` : "";
      const rawDesc = item["description"] ?? item["desc"];
      return {
        value,
        link,
        description: rawDesc ? decodeEntities(String(rawDesc).trim()) : null,
      };
    })
    .filter((item) => Boolean(item.value));
}

export async function scrapeSearchAutocomplete(query: string, opts: FetchOpts = FETCH_OPTS): Promise<SearchAutocompleteItem[]> {
  const enc = encodeURIComponent(query);
  const res = await fetch(`${BASE}/scripts/autocomplete.php?q=${enc}&term=${enc}`, {
    ...opts,
    headers: { ...REQ_HEADERS, "X-Requested-With": "XMLHttpRequest", Referer: `${BASE}/` },
  });
  if (!res.ok) throw new Error(`Search autocomplete fetch failed: ${res.status}`);
  const data = (await res.json()) as Array<Record<string, unknown>>;
  return data
    .map((item) => {
      const value = decodeEntities(String(item["value"] ?? item["name"] ?? "").trim());
      const rawLabel = item["label"] ? decodeEntities(String(item["label"]).trim()) : undefined;
      const rawLink = item["link"] ? String(item["link"]) : item["url"] ? String(item["url"]) : undefined;
      const link = rawLink ? (rawLink.startsWith("http") ? rawLink : `${BASE}${rawLink.startsWith("/") ? "" : "/"}${rawLink}`) : undefined;
      const type = item["type"] ? String(item["type"]).trim() : undefined;
      const image = item["image"] ? cleanImageUrl(String(item["image"]).trim()) : null;
      return {
        value,
        ...(rawLabel ? { label: rawLabel } : {}),
        ...(link ? { link } : {}),
        ...(type ? { type } : {}),
        ...(image ? { image } : {}),
      };
    })
    .filter((item) => Boolean(item.value));
}

