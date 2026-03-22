/**
 * API Route: Fetch live WTI Crude Oil Front-Month Futures (CL) price
 * Aligns with Polymarket resolution: CME Active Month settlement for CL futures
 *
 * Sources (in order):
 * 1. TwelveData - symbol CL (WTI front-month futures)
 * 2. Alpha Vantage - WTI commodity (set ALPHA_VANTAGE_API_KEY)
 * 3. Oil Price API demo - no key required (20 req/hr limit, cached 5 min)
 */

const TWELVE_DATA_PRICE = "https://api.twelvedata.com/price";
const TWELVE_DATA_TIMESERIES = "https://api.twelvedata.com/time_series";
const ALPHA_VANTAGE_URL = "https://www.alphavantage.co/query";
const OIL_PRICE_API_DEMO = "https://api.oilpriceapi.com/v1/demo/prices";

// WTI front-month futures - CME/NYMEX CL (matches Polymarket resolution source)
const TWELVE_SYMBOLS = ["CL", "CL/USD"];

async function fetchTwelveDataPrice(apiKey: string): Promise<number | null> {
  for (const symbol of TWELVE_SYMBOLS) {
    try {
      const url = `${TWELVE_DATA_PRICE}?symbol=${encodeURIComponent(symbol)}&apikey=${apiKey}`;
      const res = await fetch(url, { next: { revalidate: 0 } });
      const data = await res.json();

      if (data.price && typeof data.price === "string") {
        const price = parseFloat(data.price);
        if (!isNaN(price) && price > 0) return price;
      }
    } catch {
      continue;
    }
  }
  return null;
}

async function fetchTwelveDataTimeSeries(apiKey: string): Promise<number | null> {
  try {
    const url = `${TWELVE_DATA_TIMESERIES}?symbol=CL&interval=1day&outputsize=1&apikey=${apiKey}`;
    const res = await fetch(url, { next: { revalidate: 0 } });
    const data = await res.json();
    const values = data?.values;
    if (Array.isArray(values) && values[0]?.close) {
      const price = parseFloat(values[0].close);
      if (!isNaN(price) && price > 0) return price;
    }
  } catch {}
  return null;
}

async function fetchAlphaVantageWti(apiKey: string): Promise<number | null> {
  if (!apiKey || apiKey === "demo") return null;
  try {
    const url = `${ALPHA_VANTAGE_URL}?function=WTI&interval=daily&apikey=${apiKey}`;
    const res = await fetch(url, { next: { revalidate: 0 } });
    const data = await res.json();
    if (data["Information"]) return null; // Demo key or rate limit
    // Format 1: Realtime Commodity Exchange Rate with "5. Exchange Rate"
    const realtime = data["Realtime Commodity Exchange Rate"];
    if (realtime?.["5. Exchange Rate"]) {
      const price = parseFloat(realtime["5. Exchange Rate"]);
      if (!isNaN(price) && price > 0) return price;
    }
    // Format 2: time series with data array
    const dataKey = Object.keys(data).find((k) => k.toLowerCase().startsWith("data"));
    if (dataKey && Array.isArray(data[dataKey]) && data[dataKey][0]?.value) {
      const price = parseFloat(data[dataKey][0].value);
      if (!isNaN(price) && price > 0) return price;
    }
  } catch {}
  return null;
}

async function fetchOilPriceApiDemo(): Promise<number | null> {
  try {
    const res = await fetch(OIL_PRICE_API_DEMO, {
      next: { revalidate: 300 }, // 5 min cache - demo allows 20 req/hr
    });
    const data = await res.json();
    if (data?.status !== "success") return null;
    const prices = data?.data?.prices;
    if (Array.isArray(prices)) {
      const wti = prices.find((p: { code?: string }) => p?.code === "WTI_USD");
      if (wti?.price != null) {
        const price = parseFloat(String(wti.price));
        if (!isNaN(price) && price > 0) return price;
      }
    }
  } catch {}
  return null;
}

export async function GET() {
  const twelveKey = process.env.TWELVE_DATA_API_KEY || process.env.NEXT_PUBLIC_TWELVE_DATA_API_KEY;
  const alphaKey = process.env.ALPHA_VANTAGE_API_KEY;

  try {
    // 1. TwelveData price (primary) - requires valid API key (demo often returns 401)
    if (twelveKey) {
      let price = await fetchTwelveDataPrice(twelveKey);
      if (price == null) price = await fetchTwelveDataTimeSeries(twelveKey);
      if (price != null) {
        return Response.json({
          success: true,
          price,
          symbol: "CL",
          source: "TwelveData",
          note: "WTI front-month futures (aligns with Polymarket CME resolution)",
          timestamp: new Date().toISOString(),
        });
      }
    }

    // 2. Alpha Vantage WTI (fallback)
    if (alphaKey) {
      const price = await fetchAlphaVantageWti(alphaKey);
      if (price != null) {
        return Response.json({
          success: true,
          price,
          symbol: "CL",
          source: "Alpha Vantage",
          note: "WTI crude oil",
          timestamp: new Date().toISOString(),
        });
      }
    }

    // 3. Oil Price API demo (no key, 20 req/hr)
    const demoPrice = await fetchOilPriceApiDemo();
    if (demoPrice != null) {
      return Response.json({
        success: true,
        price: demoPrice,
        symbol: "CL",
        source: "Oil Price API (demo)",
        note: "WTI crude · 5 min cache (demo limit)",
        timestamp: new Date().toISOString(),
      });
    }

    return Response.json(
      {
        success: false,
        error: "Unable to fetch WTI price. Add TWELVE_DATA_API_KEY or ALPHA_VANTAGE_API_KEY to .env.local",
        hint: "Get a free key at twelvedata.com or alphavantage.co",
      },
      { status: 503 }
    );
  } catch (error) {
    console.error("Price API error:", error);
    return Response.json(
      {
        success: false,
        error: "Network error fetching oil price",
      },
      { status: 500 }
    );
  }
}
