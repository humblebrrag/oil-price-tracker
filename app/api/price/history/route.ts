/**
 * API Route: Fetch historical WTI price data for chart
 * Returns last 30 days. Uses TwelveData, Alpha Vantage, or fallback.
 */

const TWELVE_DATA_TS = "https://api.twelvedata.com/time_series";
const ALPHA_VANTAGE_URL = "https://www.alphavantage.co/query";
const DAYS = 30;

export interface HistoryPoint {
  date: string;
  price: number;
  time: number;
}

async function fetchTwelveDataHistory(apiKey: string): Promise<HistoryPoint[] | null> {
  try {
    const url = `${TWELVE_DATA_TS}?symbol=CL&interval=1day&outputsize=${DAYS}&apikey=${apiKey}`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    const data = await res.json();
    const values = data?.values;
    if (!Array.isArray(values) || values.length === 0) return null;
    return values
      .map((v: { datetime: string; close: string }) => ({
        date: v.datetime.split(" ")[0],
        price: parseFloat(v.close),
        time: new Date(v.datetime).getTime(),
      }))
      .filter((p: HistoryPoint) => !isNaN(p.price))
      .sort((a: HistoryPoint, b: HistoryPoint) => a.time - b.time);
  } catch {}
  return null;
}

async function fetchAlphaVantageHistory(apiKey: string): Promise<HistoryPoint[] | null> {
  if (!apiKey || apiKey === "demo") return null;
  try {
    const url = `${ALPHA_VANTAGE_URL}?function=WTI&interval=daily&apikey=${apiKey}`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    const data = await res.json();
    if (data["Information"]) return null;
    const dataKey = Object.keys(data).find((k) => k.toLowerCase().startsWith("data"));
    if (!dataKey || !Array.isArray(data[dataKey])) return null;
    const arr = data[dataKey].slice(0, DAYS);
    return arr
      .map((v: { date: string; value: string }) => ({
        date: v.date,
        price: parseFloat(v.value),
        time: new Date(v.date).getTime(),
      }))
      .filter((p: HistoryPoint) => !isNaN(p.price))
      .sort((a: HistoryPoint, b: HistoryPoint) => a.time - b.time);
  } catch {}
  return null;
}

function generateFallbackHistory(currentPrice: number): HistoryPoint[] {
  const points: HistoryPoint[] = [];
  let p = currentPrice - 2;
  for (let i = DAYS; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    p += (Math.random() - 0.48) * 1.5;
    p = Math.max(70, Math.min(120, p));
    points.push({
      date: d.toISOString().split("T")[0],
      price: Math.round(p * 100) / 100,
      time: d.getTime(),
    });
  }
  return points;
}

export async function GET() {
  const twelveKey = process.env.TWELVE_DATA_API_KEY || process.env.NEXT_PUBLIC_TWELVE_DATA_API_KEY;
  const alphaKey = process.env.ALPHA_VANTAGE_API_KEY;

  try {
    if (twelveKey) {
      const hist = await fetchTwelveDataHistory(twelveKey);
      if (hist?.length) {
        return Response.json({ success: true, data: hist });
      }
    }
    if (alphaKey) {
      const hist = await fetchAlphaVantageHistory(alphaKey);
      if (hist?.length) {
        return Response.json({ success: true, data: hist });
      }
    }
    const fallback = generateFallbackHistory(85);
    return Response.json({ success: true, data: fallback, note: "Simulated data" });
  } catch (error) {
    console.error("Price history API error:", error);
    const fallback = generateFallbackHistory(85);
    return Response.json({ success: true, data: fallback, note: "Fallback" });
  }
}
