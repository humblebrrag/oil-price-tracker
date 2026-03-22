/**
 * API Route: Fetch Polymarket odds for "Will crude oil hit X by end of March"
 * Extracts YES/NO prices for $100, $105, $110 strikes
 */

const POLYMARKET_SLUG = "will-crude-oil-cl-hit-by-end-of-march";
const GAMMA_API = `https://gamma-api.polymarket.com/events/slug/${POLYMARKET_SLUG}`;

// Fallback values when API fails
const FALLBACK_ODDS = {
  "100": { yes: 71, no: 29 },
  "105": { yes: 53, no: 47 },
  "110": { yes: 37, no: 63 },
};

interface MarketOdds {
  strike: string;
  yesPct: number;
  noPct: number;
}

interface PolymarketMarket {
  question?: string;
  groupItemTitle?: string;
  outcomePrices?: string;
}

function extractOdds(markets: PolymarketMarket[]): MarketOdds[] {
  const result: MarketOdds[] = [];
  const strikes = ["$100", "$105", "$110"];

  for (const strike of strikes) {
    // Match "↑ $100", "↑ $105", "↑ $110" (HIGH markets only)
    const market = markets.find(
      (m) =>
        m.groupItemTitle?.includes(strike) &&
        m.groupItemTitle?.startsWith("↑")
    );

    if (market?.outcomePrices) {
      try {
        const prices = JSON.parse(market.outcomePrices) as string[];
        const yesDecimal = parseFloat(prices[0] ?? "0");
        const noDecimal = parseFloat(prices[1] ?? "0");
        result.push({
          strike: strike.replace("$", ""),
          yesPct: Math.round(yesDecimal * 100),
          noPct: Math.round(noDecimal * 100),
        });
      } catch {
        const fb = FALLBACK_ODDS[strike.replace("$", "") as keyof typeof FALLBACK_ODDS];
        result.push({
          strike: strike.replace("$", ""),
          yesPct: fb.yes,
          noPct: fb.no,
        });
      }
    } else {
      const fb = FALLBACK_ODDS[strike.replace("$", "") as keyof typeof FALLBACK_ODDS];
      result.push({
        strike: strike.replace("$", ""),
        yesPct: fb.yes,
        noPct: fb.no,
      });
    }
  }

  return result;
}

export async function GET() {
  try {
    const res = await fetch(GAMMA_API, {
      headers: { Accept: "application/json" },
      next: { revalidate: 30 }, // Cache 30 seconds
    });

    if (!res.ok) {
      throw new Error(`Polymarket API failed: ${res.status}`);
    }

    const data = await res.json();
    const markets: PolymarketMarket[] = data.markets ?? [];

    if (markets.length === 0) {
      const fallbackOdds = ["100", "105", "110"].map((strike) => ({
        strike,
        yesPct: FALLBACK_ODDS[strike as keyof typeof FALLBACK_ODDS].yes,
        noPct: FALLBACK_ODDS[strike as keyof typeof FALLBACK_ODDS].no,
      }));
      return Response.json({
        success: true,
        odds: fallbackOdds,
        note: "Using fallback values",
      });
    }

    const odds = extractOdds(markets);

    return Response.json({
      success: true,
      odds,
      source: "Polymarket Gamma API",
    });
  } catch (error) {
    console.error("Polymarket API error:", error);
    const fallbackOdds = ["100", "105", "110"].map((strike) => ({
      strike,
      yesPct: FALLBACK_ODDS[strike as keyof typeof FALLBACK_ODDS].yes,
      noPct: FALLBACK_ODDS[strike as keyof typeof FALLBACK_ODDS].no,
    }));
    return Response.json({
      success: true,
      odds: fallbackOdds,
      note: "API unavailable - using fallback values",
    });
  }
}
