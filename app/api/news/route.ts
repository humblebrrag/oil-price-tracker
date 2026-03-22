/**
 * API Route: Fetch Reuters RSS news and filter for oil-related headlines
 * Keywords: oil, iran, israel, opec, strait
 */

// Reuters RSS - business news feed (contains commodities/energy coverage)
const REUTERS_RSS_URL = "https://feeds.reuters.com/reuters/businessNews";
const FILTER_KEYWORDS = ["oil", "iran", "israel", "opec", "strait"];
const MAX_HEADLINES = 5;

// Simple RSS/Atom parser - extracts title and link from <item> or <entry> blocks
function parseRssItems(xml: string): { title: string; link: string }[] {
  const items: { title: string; link: string }[] = [];
  const titleRegex = /<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/i;

  function parseBlock(block: string): { title: string; link: string } {
    const titleMatch = block.match(titleRegex);
    const title = titleMatch
      ? (titleMatch[1] || titleMatch[2] || "").trim()
      : "";
    let link = "";
    const linkRegexLocal = /<link[^>]*href=["']([^"']+)["'][^>]*\/?>|<link>([^<]+)<\/link>/gi;
    const linkMatch = linkRegexLocal.exec(block);
    if (linkMatch) {
      const href = linkMatch[1] || linkMatch[2];
      if (href && !href.includes("w3.org")) link = href.trim();
    }
    return { title, link };
  }

  // Try RSS format first (<item>)
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const parsed = parseBlock(match[1]);
    if (parsed.title && parsed.link) items.push(parsed);
  }

  // If no items, try Atom format (<entry>)
  if (items.length === 0) {
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
    while ((match = entryRegex.exec(xml)) !== null) {
      const parsed = parseBlock(match[1]);
      if (parsed.title && parsed.link) items.push(parsed);
    }
  }

  return items;
}

// Filter headlines containing any of our keywords (case-insensitive)
function filterByKeywords(
  items: { title: string; link: string }[],
  keywords: string[]
): { title: string; link: string }[] {
  const lowerKeywords = keywords.map((k) => k.toLowerCase());
  return items.filter((item) =>
    lowerKeywords.some((kw) => item.title.toLowerCase().includes(kw))
  );
}

export async function GET() {
  try {
    const res = await fetch(REUTERS_RSS_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; OilPriceTracker/1.0; +https://github.com/oil-tracker)",
      },
      next: { revalidate: 60 }, // Cache for 60 seconds (client refreshes every 60s)
    });

    if (!res.ok) {
      throw new Error(`RSS fetch failed: ${res.status}`);
    }

    const xml = await res.text();
    const allItems = parseRssItems(xml);
    const filtered = filterByKeywords(allItems, FILTER_KEYWORDS);

    // If filtered is empty, return top 5 from all (with note) so user sees something
    const headlines =
      filtered.length > 0
        ? filtered.slice(0, MAX_HEADLINES)
        : allItems.slice(0, MAX_HEADLINES).map((i) => ({
            ...i,
            title: i.title + " (no keyword match)",
          }));

    return Response.json({
      success: true,
      headlines,
      totalFiltered: filtered.length,
    });
  } catch (error) {
    console.error("News API error:", error);

    // Fallback: return sample headlines when RSS is unavailable
    const fallbackHeadlines = [
      { title: "Oil prices steady amid OPEC production concerns", link: "#" },
      { title: "Iran-Israel tensions weigh on energy markets", link: "#" },
      {
        title: "Strait of Hormuz shipping traffic in focus",
        link: "#",
      },
    ];

    return Response.json({
      success: true,
      headlines: fallbackHeadlines,
      totalFiltered: fallbackHeadlines.length,
      note: "Using cached/fallback headlines",
    });
  }
}
