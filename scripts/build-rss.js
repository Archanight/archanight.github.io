import fs from "node:fs";
import path from "node:path";
import { XMLParser } from "fast-xml-parser";

const FEEDS = [
  "https://www.google.fr/alerts/feeds/08396268160163584311/3684539829631735690",
  "https://www.google.fr/alerts/feeds/08396268160163584311/14055474122595071547",
  "https://www.google.fr/alerts/feeds/08396268160163584311/18237269061384757812",
];

const OUT_DIR = "data";
const OUT_FILE = path.join(OUT_DIR, "news.json");
const MAX_ITEMS = 12;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
});

function decodeEntities(input) {
  return String(input ?? "")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function stripHtml(input) {
  if (input == null) return "";

  let value = input;

  if (Array.isArray(value)) value = value.join(" ");
  if (typeof value === "object") {
    value =
      value["#text"] ??
      value._ ??
      value.text ??
      value.value ??
      value.content ??
      value.summary ??
      JSON.stringify(value);
  }

  return decodeEntities(String(value))
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeIsoDate(rawDate) {
  if (!rawDate) return "";
  const d = new Date(rawDate);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString();
}

function extractAtomLink(linkNode) {
  if (!linkNode) return "";

  if (Array.isArray(linkNode)) {
    const preferred =
      linkNode.find((x) => x?.["@_rel"] === "alternate") ||
      linkNode.find((x) => x?.["@_href"] || x?.href) ||
      linkNode[0];
    return preferred?.["@_href"] || preferred?.href || "";
  }

  return linkNode?.["@_href"] || linkNode?.href || "";
}

function decodeGoogleAlertUrl(rawUrl) {
  if (!rawUrl) return "";

  if (/^\/\//.test(rawUrl)) return `https:${rawUrl}`;

  if (!/^https?:\/\//i.test(rawUrl)) {
    return `https://${rawUrl.replace(/^\/+/, "")}`;
  }

  try {
    const urlObj = new URL(rawUrl);

    if (urlObj.hostname.includes("google.") && urlObj.pathname === "/url") {
      const real = urlObj.searchParams.get("url") || urlObj.searchParams.get("q");
      if (real) return real;
    }

    return rawUrl;
  } catch {
    return rawUrl;
  }
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; RSSBot/1.0; +https://github.com/)",
      accept: "application/atom+xml,application/xml,text/xml,*/*",
    },
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.text();
}

function parseAtom(xml) {
  const obj = parser.parse(xml);
  const feed = obj?.feed;

  if (!feed) return { feedTitle: "Google Alerts", entries: [] };

  const feedTitle = stripHtml(feed.title ?? "Google Alerts");
  let entries = feed.entry ?? [];

  if (!Array.isArray(entries)) entries = [entries];

  const items = entries
    .map((entry) => {
      const title = stripHtml(entry.title ?? "");
      const linkRaw = extractAtomLink(entry.link);
      const link = decodeGoogleAlertUrl(linkRaw);

      const dateRaw = entry.published || entry.updated || "";
      const publishedAt = normalizeIsoDate(dateRaw);

      const contentRaw =
        entry.content?.["#text"] ||
        entry.content ||
        entry.summary?.["#text"] ||
        entry.summary ||
        "";

      const description = stripHtml(contentRaw).slice(0, 220);

      if (!title || !link) return null;

      return {
        title,
        link,
        url: link,
        publishedAt,
        date: publishedAt,
        description,
        excerpt: description,
        source: feedTitle,
      };
    })
    .filter(Boolean);

  return { feedTitle, entries: items };
}

function dedupeByLink(items) {
  const seen = new Set();
  const out = [];

  for (const item of items) {
    const key = item.link || item.url;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }

  return out;
}

async function main() {
  const allItems = [];
  const failedSources = [];

  for (const feedUrl of FEEDS) {
    try {
      const xml = await fetchText(feedUrl);
      const parsed = parseAtom(xml);
      allItems.push(...parsed.entries);
    } catch (error) {
      const message = error?.message || String(error);
      failedSources.push({ feedUrl, error: message });
      console.error(`[WARN] ${feedUrl} => ${message}`);
    }
  }

  if (!allItems.length) {
    throw new Error("Aucune entree RSS recuperable depuis les flux configures.");
  }

  const items = dedupeByLink(allItems)
    .sort((a, b) => (b.publishedAt || "").localeCompare(a.publishedAt || ""))
    .slice(0, MAX_ITEMS);

  const out = {
    generatedAt: new Date().toISOString(),
    sources: FEEDS,
    failedSources,
    items,
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(out, null, 2), "utf-8");

  const okCount = FEEDS.length - failedSources.length;
  console.log(`Wrote ${OUT_FILE} with ${items.length} items (${okCount}/${FEEDS.length} feeds ok)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
