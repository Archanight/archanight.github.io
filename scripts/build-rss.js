import fs from "node:fs";
import path from "node:path";
import { XMLParser } from "fast-xml-parser";

const FEEDS = [
  "https://www.google.fr/alerts/feeds/08396268160163584311/18237269061384757812",
  "https://www.google.fr/alerts/feeds/08396268160163584311/14055474122595071547",
  "https://www.google.fr/alerts/feeds/08396268160163584311/3684539829631735690"
];

const OUT_DIR = "data";
const OUT_FILE = path.join(OUT_DIR, "news.json");

// réglages : combien d’articles max au total
const MAX_ITEMS = 12;

function safeText(v) {
  if (v == null) return "";
  if (typeof v === "string") return v;
  return String(v);
}

function stripHtml(html) {
  return safeText(html)
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/<\/?[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function asArray(x) {
  if (!x) return [];
  return Array.isArray(x) ? x : [x];
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (GitHub Actions RSS builder)"
    }
  });
  if (!res.ok) throw new Error(`Fetch failed ${res.status} for ${url}`);
  return await res.text();
}

function parseAtomOrRss(xml) {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_"
  });

  const doc = parser.parse(xml);

  // ATOM
  if (doc.feed) {
    const entries = asArray(doc.feed.entry);
    return entries.map((e) => {
      const links = asArray(e.link);
      const href =
        links.find((l) => l?.["@_rel"] === "alternate")?.["@_href"] ||
        links[0]?.["@_href"] ||
        "";

      const published = e.published || e.updated || "";
      const summary = stripHtml(e.summary?.["#text"] ?? e.summary ?? "");

      return {
        title: safeText(e.title?.["#text"] ?? e.title),
        url: safeText(href),
        date: safeText(published),
        excerpt: summary
      };
    });
  }

  // RSS 2.0
  if (doc.rss?.channel) {
    const items = asArray(doc.rss.channel.item);
    return items.map((it) => ({
      title: safeText(it.title),
      url: safeText(it.link),
      date: safeText(it.pubDate),
      excerpt: stripHtml(it.description)
    }));
  }

  return [];
}

function toTimestamp(dateStr) {
  const t = Date.parse(dateStr);
  return Number.isFinite(t) ? t : 0;
}

async function main() {
  const all = [];

  for (const feed of FEEDS) {
    try {
      const xml = await fetchText(feed);
      const items = parseAtomOrRss(xml);
      for (const it of items) {
        if (!it.url || !it.title) continue;
        all.push(it);
      }
    } catch (err) {
      console.error(`Feed error: ${feed}`, err);
    }
  }

  // dédoublonnage par url
  const uniq = new Map();
  for (const it of all) {
    if (!uniq.has(it.url)) uniq.set(it.url, it);
  }

  const merged = Array.from(uniq.values())
    .sort((a, b) => toTimestamp(b.date) - toTimestamp(a.date))
    .slice(0, MAX_ITEMS)
    .map((it) => ({
      ...it,
      // format de date lisible si possible
      date: it.date
    }));

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const payload = {
    generatedAt: new Date().toISOString(),
    sources: FEEDS,
    items: merged
  };

  fs.writeFileSync(OUT_FILE, JSON.stringify(payload, null, 2), "utf8");
  console.log(`Wrote ${OUT_FILE} with ${merged.length} items`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
