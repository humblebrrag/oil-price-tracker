"use client";

import { useEffect, useState } from "react";

// --- Types ---
type PriceZone =
  | "SAFE ZONE"
  | "BREAKOUT WATCH"
  | "DECISION ZONE"
  | "DANGER ZONE"
  | "EXIT MODE";

type TradeAction =
  | "ADD NO $100"
  | "HOLD"
  | "REDUCE NO $100"
  | "SELL $110 YES";

interface NewsHeadline {
  title: string;
  link: string;
}

// --- Hardcoded positions ---
const POSITIONS = [
  { contract: "NO $100", shares: 1000 },
  { contract: "NO $105", shares: 1000 },
  { contract: "YES $110", shares: 700 },
];

// --- Zone logic: returns zone and color class ---
function getPriceZone(price: number): { zone: PriceZone; color: string } {
  if (price < 99) return { zone: "SAFE ZONE", color: "text-terminal-success" };
  if (price < 100)
    return { zone: "BREAKOUT WATCH", color: "text-terminal-info" };
  if (price < 102)
    return { zone: "DECISION ZONE", color: "text-terminal-warning" };
  if (price < 105)
    return { zone: "DANGER ZONE", color: "text-orange-500" };
  return { zone: "EXIT MODE", color: "text-terminal-danger" };
}

// --- Trade action logic ---
function getTradeAction(price: number): {
  action: TradeAction;
  color: string;
} {
  if (price < 99) return { action: "ADD NO $100", color: "border-terminal-success" };
  if (price < 102) return { action: "HOLD", color: "border-terminal-info" };
  if (price < 105) return { action: "REDUCE NO $100", color: "border-terminal-warning" };
  return { action: "SELL $110 YES", color: "border-terminal-danger" };
}

// --- PnL calculation for each scenario ---
function calculatePnL(price: number): number {
  let pnl = 0;
  // NO $100: wins if price < 100. Each share pays $1 if win.
  if (price < 100) {
    pnl += 1000 * 1;
  } else {
    pnl += 1000 * -1; // loses $1 per share
  }
  // NO $105: wins if price < 105
  if (price < 105) {
    pnl += 1000 * 1;
  } else {
    pnl += 1000 * -1;
  }
  // YES $110: wins if price > 110. Each share pays (price - 100) or similar - adjust for prediction market
  // Typical structure: YES $110 pays $1 if price > 110 at expiry
  if (price > 110) {
    pnl += 700 * 1;
  } else {
    pnl += 700 * -1;
  }
  return pnl;
}

// --- Scenario labels ---
const SCENARIOS = [
  { label: "Price < 100", price: 98 },
  { label: "Price 100–105", price: 102 },
  { label: "Price 105–110", price: 107 },
  { label: "Price > 110", price: 112 },
];

export default function Dashboard() {
  const [price, setPrice] = useState<number | null>(null);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [headlines, setHeadlines] = useState<NewsHeadline[]>([]);
  const [newsError, setNewsError] = useState<string | null>(null);

  // Fetch oil price every 5 seconds
  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const res = await fetch("/api/price");
        const data = await res.json();
        if (data.price != null) {
          setPrice(data.price);
          setPriceError(null);
        } else {
          setPriceError(data.error || "Failed to fetch");
        }
      } catch {
        setPriceError("Network error");
      }
    };

    fetchPrice();
    const interval = setInterval(fetchPrice, 5000);
    return () => clearInterval(interval);
  }, []);

  // Fetch news every 60 seconds
  useEffect(() => {
    const fetchNews = async () => {
      try {
        const res = await fetch("/api/news");
        const data = await res.json();
        if (data.headlines?.length) {
          setHeadlines(data.headlines);
          setNewsError(null);
        } else {
          setNewsError("No headlines");
        }
      } catch {
        setNewsError("Failed to fetch news");
      }
    };

    fetchNews();
    const interval = setInterval(fetchNews, 60000);
    return () => clearInterval(interval);
  }, []);

  const zone = price != null ? getPriceZone(price) : null;
  const trade = price != null ? getTradeAction(price) : null;

  return (
    <main className="min-h-screen p-6 max-w-5xl mx-auto">
      {/* Header: Title + Live Price */}
      <header className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          OIL PRICE PREDICTION MARKET TRACKER
        </h1>
        <div className="flex items-baseline gap-2">
          <span className="text-terminal-muted text-sm uppercase">WTI / CL</span>
          {price != null ? (
            <span className="text-3xl font-bold text-terminal-success tabular-nums">
              ${price.toFixed(2)}
            </span>
          ) : (
            <span className="text-terminal-muted">
              {priceError || "Loading..."}
            </span>
          )}
        </div>
      </header>

      {/* Trade Action Card - Big highlighted */}
      {trade && (
        <section className="mb-8">
          <div
            className={`rounded-xl border-2 ${trade.color} bg-terminal-surface p-6 flex items-center justify-between`}
          >
            <span className="text-terminal-muted uppercase text-sm font-medium">
              Recommended Action
            </span>
            <span className="text-xl sm:text-2xl font-bold text-white">
              {trade.action}
            </span>
          </div>
        </section>
      )}

      {/* Price Zone Indicator */}
      {zone && (
        <section className="mb-8">
          <div className="rounded-lg bg-terminal-surface border border-terminal-border p-4">
            <span className="text-terminal-muted uppercase text-sm">Zone</span>
            <p className={`text-lg font-semibold mt-1 ${zone.color}`}>
              {zone.zone}
            </p>
          </div>
        </section>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* News Feed */}
        <section className="rounded-lg bg-terminal-surface border border-terminal-border overflow-hidden">
          <div className="px-4 py-3 border-b border-terminal-border">
            <h2 className="font-semibold text-white">News Feed</h2>
            <p className="text-xs text-terminal-muted">
              Filtered: oil, iran, israel, opec, strait · Refresh 60s
            </p>
          </div>
          <ul className="divide-y divide-terminal-border max-h-64 overflow-y-auto">
            {headlines.length > 0 ? (
              headlines.map((h, i) => (
                <li key={i} className="px-4 py-3 hover:bg-terminal-bg/50">
                  <a
                    href={h.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-terminal-text hover:text-terminal-info transition-colors line-clamp-2"
                  >
                    {h.title}
                  </a>
                </li>
              ))
            ) : (
              <li className="px-4 py-4 text-terminal-muted text-sm">
                {newsError || "Loading..."}
              </li>
            )}
          </ul>
        </section>

        {/* Position PnL Table */}
        <section className="rounded-lg bg-terminal-surface border border-terminal-border overflow-hidden">
          <div className="px-4 py-3 border-b border-terminal-border">
            <h2 className="font-semibold text-white">Position Tracker</h2>
          </div>
          <div className="p-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-terminal-muted text-left border-b border-terminal-border">
                  <th className="py-2 pr-4">Contract</th>
                  <th className="py-2 pr-4">Shares</th>
                </tr>
              </thead>
              <tbody>
                {POSITIONS.map((p, i) => (
                  <tr key={i} className="border-b border-terminal-border/50">
                    <td className="py-2 pr-4 font-medium">{p.contract}</td>
                    <td className="py-2">{p.shares.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h3 className="font-medium text-white mt-4 mb-2">Estimated PnL by Scenario</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-terminal-muted text-left border-b border-terminal-border">
                  <th className="py-2 pr-4">Scenario</th>
                  <th className="py-2 text-right">PnL</th>
                </tr>
              </thead>
              <tbody>
                {SCENARIOS.map((s, i) => {
                  const pnl = calculatePnL(s.price);
                  return (
                    <tr key={i} className="border-b border-terminal-border/50">
                      <td className="py-2 pr-4">{s.label}</td>
                      <td
                        className={`py-2 text-right font-mono ${
                          pnl >= 0 ? "text-terminal-success" : "text-terminal-danger"
                        }`}
                      >
                        {pnl >= 0 ? "+" : ""}${pnl.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="mt-8 text-center text-terminal-muted text-xs">
        Data: TwelveData (price) · Reuters (news) · Updates: price 5s, news 60s
      </footer>
    </main>
  );
}
