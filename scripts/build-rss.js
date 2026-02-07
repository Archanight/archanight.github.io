import fs from "node:fs";
import path from "node:path";
import { XMLParser } from "fast-xml-parser";

const FEEDS = [
  "https://www.google.fr/alerts/feeds/08396268160163584311/18237269061384757812",
  "https://www.google.fr/alerts/feeds/08396268160163584311/14055474122595071547",
  "https://www.google.fr/alerts/feeds/08396268160163584311/3684539829631735690",
];

const OUT_DIR = "data";
const OUT_FILE = path.join(OUT_DIR, "news.json");
const MAX_ITEMS = 12;

function stripHtml(s = "") {
  return s
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeGoogleAlertUrl(u) {
  if (!u) return "";
  // Si déjà absolu OK
  if (/^https?:\/\//i.test(u) === false && /^\/\//.test(u) === false) {
    // évite les liens relatifs -> on force https
    return "https://" + u.replace(/^\/+/, "");
  }
  if (/^\/\//.test(u)) return "https:" + u;

  try {
    const urlObj = new URL(u);
    // Google Alerts fournit souvent : https://www.google.com/url?...&url=<REAL_URL>...
    if (urlObj.hostname.includes("google.") && urlObj.pathname === "/url") {
      const real = urlObj.searchParams.get("url") || urlObj.searchParams.get("q");
      if (real) return real;
    }
    return u;
  } catch {
    return u;
  }
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (compatible; RSSBot/1.0; +https://github.com/)",
      accept: "application/atom+xml,application/xml,text/xml,*/*",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} on ${url}`);
  return await res.text();
}

function parseAtom(xml) {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
  });
  const obj = parser.parse(xml);

  const feed = obj.feed;
  if (!feed) return { feedTitle: "Google Alerts", entries: [] };

  const feedTitle = stripHtml(feed.title ?? "Google Alerts");

  let entries = feed.entry ?? [];
  if (!Array.isArray(entries)) entries = [entries];

  const items = entries
    .map((e) => {
      const title = stripHtml(e.title ?? "");
      const link = e.link?.["@_href"] || e.link?.href || "";
      const url = decodeGoogleAlertUrl(link);

      const dateRaw = e.published || e.updated || "";
      const date = dateRaw ? new Date(dateRaw).toISOString() : "";

      const contentRaw = e.content?.["#text"] || e.content || e.summary?.["#text"] || e.summary || "";
      const excerpt = stripHtml(String(contentRaw)).slice(0, 220);

      if (!title || !url) return null;

      return {
        title,
        url,
        date,
        excerpt,
        source: feedTitle,
      };
    })
    .filter(Boolean);

  return { feedTitle, entries: items };
}

function dedupeByUrl(items) {
  const seen = new Set();
  const out = [];
  for (const it of items) {
    const key = it.url;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(it);
  }
  return out;
}

async function main() {
  const all = [];

  for (const f of FEEDS) {
    const xml = await fetchText(f);
    const parsed = parseAtom(xml);
    all.push(...parsed.entries);
  }

  const items = dedupeByUrl(all)
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
    .slice(0, MAX_ITEMS);

  const out = {
    generatedAt: new Date().toISOString(),
    sources: FEEDS,
    items,
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(out, null, 2), "utf-8");
  console.log(`Wrote ${OUT_FILE} with ${items.length} items`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
