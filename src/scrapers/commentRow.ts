import { BASE, decodeEntities } from "../constants.js";
import type { AotyComment } from "../types.js";

export async function scrapeCommentRows(res: Response): Promise<AotyComment[]> {
  const comments: AotyComment[] = [];
  const st: { cur: AotyComment | null; textBuf: string } = { cur: null, textBuf: "" };
  await new HTMLRewriter()
    .on(".commentRow", {
      element(el) {
        if (st.cur) st.cur.text = st.textBuf.trim();
        st.cur = { id: (el.getAttribute("id") ?? "").replace("comment_", ""), username: "", userUrl: "", avatar: null, date: "", dateExact: "", text: "", replies: "" };
        comments.push(st.cur);
        st.textBuf = "";
      },
    })
    .on(".commentRow .commentImage a", {
      element(el) {
        const href = el.getAttribute("href") ?? "";
        if (st.cur && !st.cur.userUrl && href.includes("/user/")) st.cur.userUrl = href.startsWith("http") ? href : BASE + href;
      },
    })
    .on(".commentRow .commentImage img", {
      element(el) {
        if (st.cur) st.cur.avatar = el.getAttribute("src") ?? null;
      },
    })
    .on(".commentRow .commentUserName a", {
      text(t) {
        if (st.cur) st.cur.username = (st.cur.username ?? "") + t.text;
      },
    })
    .on(".commentRow .commentDate", {
      element(el) {
        if (st.cur) st.cur.dateExact = el.getAttribute("title") ?? "";
      },
      text(t) {
        if (st.cur) st.cur.date = (st.cur.date ?? "") + t.text;
      },
    })
    .on(".commentRow .commentText", {
      text(t) {
        st.textBuf += t.text;
      },
    })
    .on(".commentRow .showReplies span", {
      text(t) {
        if (st.cur) st.cur.replies = (st.cur.replies ?? "") + t.text;
      },
    })
    .transform(res)
    .arrayBuffer();
  if (st.cur) st.cur.text = st.textBuf.trim();
  return comments.map((c) => ({
    id: c.id ?? "",
    username: decodeEntities((c.username ?? "").trim()),
    userUrl: c.userUrl ?? "",
    avatar: c.avatar ?? null,
    date: (c.date ?? "").trim(),
    dateExact: c.dateExact ?? "",
    text: decodeEntities((c.text ?? "").trim()),
    replies: (c.replies ?? "").trim() || "0",
  }));
}
