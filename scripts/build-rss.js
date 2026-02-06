import fs from "fs";
import path from "path";
import Parser from "rss-parser";

const parser = new Parser({
  timeout: 20000,
  headers: {
    "User-Agent": "Mozilla/5.0 (GitHubActions RSS fetcher)"
  }
});

const FEEDS = [
  {
    name: "Google Alerts — ChatGPT model updates",
    url: "https://www.google.fr/alerts/feeds/08396268160163584311/18237269061384757812",
  },
  {
    name: "Google Alerts — AI security / prompt injection",
    url: "https://www.google.fr/alerts/feeds/08396268160163584311/14055474122595071547",
  },
  {
    name: "Google Alerts — CERT/éditeurs sécurité",
    url: "https://www.google.fr/alerts/feeds/08396268160163584311/3684539829631735690",
  },
];

const OUT_DIR = "data";
const OUT_FILE = "news.json";

// Limites (pour éviter une page trop lourde)
const MAX_ITEMS_TOTAL = 12;
const MAX_PER_FEED = 6;

// util
function toISODate(d) {
  try {
    const date = new Date(d);
    if (isNaN(date.getTime())) return null;
    return date.toISOString();
  } catch {
    return null;
  }
}

function cleanText(str, maxLen = 220) {
  if (!str) return "";
  // retire HTML basique
  const noHtml = str.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (noHtml.length <= maxLen) return noHtml;
  return noHtml.slice(0, maxLen - 1).trimEnd() + "…";
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function fetchFeed(feed) {
  const parsed = await parser.parseURL(feed.url);

  const items = (parsed.items || [])
    .slice(0, MAX_PER_FEED)
    .map((it) => {
      const pub = toISODate(it.isoDate || it.pubDate || it.published || it.date);
      const title = (it.title || "").trim();
      const link = (it.link || it.guid || "").trim();

      // Certaines entrées Google Alerts ont un "contentSnippet" ou "content"
      const description = cleanText(it.contentSnippet || it.content || it.summary || "");

      return {
        source: feed.name,
        title,
        link,
        publishedAt: pub,
        description
      };
    })
    .filter((it) => it.title && it.link);

  return items;
}

(async () => {
  const startedAt = new Date().toISOString();

  let all = [];
  for (const feed of FEEDS) {
    try {
      const items = await fetchFeed(feed);
      all.push(...items);
    } catch (e) {
      // on log et on continue (ne pas casser tout le build si 1 flux bloque)
      console.error(`[RSS] Failed: ${feed.name} -> ${feed.url}`);
      console.error(e?.message || e);
    }
  }

  // tri : plus récent d’abord
  all.sort((a, b) => {
    const da = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
    const db = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
    return db - da;
  });

  // dédoublonnage par lien
  const seen = new Set();
  const dedup = [];
  for (const it of all) {
    if (seen.has(it.link)) continue;
    seen.add(it.link);
    dedup.push(it);
  }

  const finalItems = dedup.slice(0, MAX_ITEMS_TOTAL);

  const output = {
    generatedAt: startedAt,
    total: finalItems.length,
    items: finalItems
  };

  ensureDir(OUT_DIR);
  const outPath = path.join(OUT_DIR, OUT_FILE);
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2), "utf-8");

  console.log(`[RSS] OK -> ${outPath} (${finalItems.length} items)`);
})();
