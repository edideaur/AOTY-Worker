import { BASE, decodeEntities, parseCount } from "../constants.js";
import type { UserListEntry } from "../types.js";

type RawUserListEntry = {
  url: string;
  title: string;
  username: string;
  userUrl: string;
  avatar: string | null;
  covers: string[];
  description: string | null;
  likes: string | null;
  comments: string | null;
};

export async function scrapeUserListRows(res: Response): Promise<UserListEntry[]> {
  const lists: RawUserListEntry[] = [];
  let cur: RawUserListEntry | null = null;
  let inTitle = false;
  let inUser = false;
  await new HTMLRewriter()
    .on(".userListRow", {
      element() {
        cur = { url: "", title: "", username: "", userUrl: "", avatar: null, covers: [], description: null, likes: null, comments: null };
        lists.push(cur);
        inTitle = false;
        inUser = false;
      },
    })
    .on(".userListRow .listTitle a", {
      element(el) {
        const href = el.getAttribute("href") ?? "";
        if (cur && !cur.url && href) {
          cur.url = href.startsWith("http") ? href : BASE + href;
          inTitle = true;
        }
      },
      text(t) {
        if (cur && inTitle) cur.title = (cur.title ?? "") + t.text;
      },
    })
    .on(".userListRow .byLine a", {
      element(el) {
        const href = el.getAttribute("href") ?? "";
        if (cur && href.includes("/user/")) {
          inUser = true;
          if (!cur.userUrl) cur.userUrl = href.startsWith("http") ? href : BASE + href;
        }
      },
      text(t) {
        if (cur && inUser && !(cur.username ?? "").trim()) cur.username = (cur.username ?? "") + t.text;
      },
    })
    .on(".userListRow .userImage img", {
      element(el) {
        if (cur) cur.avatar = el.getAttribute("src") ?? null;
      },
    })
    .on(".userListRow .covers img", {
      element(el) {
        const src = el.getAttribute("src");
        if (cur && src) (cur.covers as string[]).push(src);
      },
    })
    .on(".userListRow .listDescription", {
      text(t) {
        if (cur) cur.description = ((cur.description ?? "") as string) + t.text;
      },
    })
    .on(".userListRow .like_count, .userListRow .points", {
      text(t) {
        if (cur) cur.likes = (cur.likes ?? "") + t.text;
      },
    })
    .on(".userListRow .comment_count", {
      text(t) {
        if (cur) cur.comments = (cur.comments ?? "") + t.text;
      },
    })
    .transform(res)
    .arrayBuffer();
  return lists.map((l) => ({
    url: l.url ?? "",
    title: decodeEntities((l.title ?? "").trim()),
    username: decodeEntities((l.username ?? "").trim()),
    userUrl: l.userUrl ?? "",
    avatar: l.avatar ?? null,
    covers: l.covers ?? [],
    description: l.description ? decodeEntities((l.description as string).trim()) : null,
    likes: parseCount((l.likes ?? "").trim()),
    comments: parseCount((l.comments ?? "").trim()),
  }));
}
