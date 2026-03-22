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

interface MarketOddsRow {
  strike: string;
  yesPct: number;
  noPct: number;
}

// Position config: contract type, strike price, and payout rules
const POSITION_CONFIG = [
  { id: "no100", contract: "NO $100", strike: 100, type: "no" as const },
  { id: "no105", contract: "NO $105", strike: 105, type: "no" as const },
  { id: "yes110", contract: "YES $110", strike: 110, type: "yes" as const },
];

interface PositionInput {
  shares: number;
  avgPriceCents: number;
}

// Default position inputs (user can edit)
const DEFAULT_POSITIONS: Record<string, PositionInput> = {
  no100: { shares: 1000, avgPriceCents: 30 },
  no105: { shares: 1000, avgPriceCents: 50 },
  yes110: { shares: 700, avgPriceCents: 35 },
};

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

// --- Payout and PnL helpers (use position inputs) ---
function getPayoutForScenario(
  positions: Record<string, PositionInput>,
  settlementPrice: number
): number {
  let payout = 0;
  for (const cfg of POSITION_CONFIG) {
    const pos = positions[cfg.id] ?? { shares: 0, avgPriceCents: 0 };
    const shares = pos.shares;
    if (shares <= 0) continue;
    if (cfg.type === "no") {
      payout += settlementPrice < cfg.strike ? shares * 1 : 0;
    } else {
      payout += settlementPrice > cfg.strike ? shares * 1 : 0;
    }
  }
  return payout;
}

function getCostBasis(positions: Record<string, PositionInput>): number {
  return Object.values(positions).reduce(
    (sum, p) => sum + p.shares * (p.avgPriceCents / 100),
    0
  );
}

function getCurrentPortfolioValue(
  positions: Record<string, PositionInput>,
  odds: MarketOddsRow[]
): number {
  let value = 0;
  for (const cfg of POSITION_CONFIG) {
    const pos = positions[cfg.id] ?? { shares: 0, avgPriceCents: 0 };
    const shares = pos.shares;
    if (shares <= 0) continue;
    const oddsRow = odds.find((o) => o.strike === String(cfg.strike));
    const pct = cfg.type === "no" ? (oddsRow?.noPct ?? 0) : (oddsRow?.yesPct ?? 0);
    value += shares * (pct / 100);
  }
  return value;
}

const SCENARIOS = [
  { label: "Price < 100", price: 98 },
  { label: "Price 100–105", price: 102 },
  { label: "Price 105–110", price: 107 },
  { label: "Price > 110", price: 112 },
];

const STORAGE_KEY = "oil-tracker-positions";

function loadPositions(): Record<string, PositionInput> {
  if (typeof window === "undefined") return { ...DEFAULT_POSITIONS };
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) {
      const parsed = JSON.parse(s) as Record<string, { shares: number; avgPriceCents: number }>;
      return { ...DEFAULT_POSITIONS, ...parsed };
    }
  } catch {}
  return { ...DEFAULT_POSITIONS };
}

export default function Dashboard() {
  const [price, setPrice] = useState<number | null>(null);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [headlines, setHeadlines] = useState<NewsHeadline[]>([]);
  const [newsError, setNewsError] = useState<string | null>(null);
  const [polymarketOdds, setPolymarketOdds] = useState<MarketOddsRow[]>([]);
  // draftPositions: what user types in inputs. positions: committed values used for calculations.
  const [draftPositions, setDraftPositions] = useState<Record<string, PositionInput>>(DEFAULT_POSITIONS);
  const [positions, setPositions] = useState<Record<string, PositionInput>>(DEFAULT_POSITIONS);

  // Load saved positions from localStorage on mount (persists across reloads)
  useEffect(() => {
    const loaded = loadPositions();
    setDraftPositions(loaded);
    setPositions(loaded);
  }, []);

  const updateDraft = (id: string, field: "shares" | "avgPriceCents", value: number) => {
    setDraftPositions((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] ?? { shares: 0, avgPriceCents: 0 }),
        [field]: value,
      },
    }));
  };

  const commitPositions = () => {
    const toSave = { ...draftPositions };
    setPositions(toSave);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    }
  };

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
          setPriceError(data.error || data.hint || "Failed to fetch");
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

  // Fetch Polymarket odds every 30 seconds
  useEffect(() => {
    const fetchOdds = async () => {
      try {
        const res = await fetch("/api/polymarket");
        const data = await res.json();
        if (data.odds?.length) {
          setPolymarketOdds(data.odds);
        }
      } catch {
        // Fallback handled by API
        setPolymarketOdds([
          { strike: "100", yesPct: 71, noPct: 29 },
          { strike: "105", yesPct: 53, noPct: 47 },
          { strike: "110", yesPct: 37, noPct: 63 },
        ]);
      }
    };

    fetchOdds();
    const interval = setInterval(fetchOdds, 30000);
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

      {/* POLYMARKET ODDS TRACKER */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-4 uppercase tracking-tight">
          Polymarket Odds Tracker
        </h2>
        <div className="rounded-lg bg-terminal-surface border border-terminal-border overflow-hidden">
          <div className="px-4 py-3 border-b border-terminal-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h3 className="font-semibold text-white">Market Odds</h3>
            <p className="text-xs text-terminal-muted">
              Latest Polymarket sell price (¢) · Refresh 30s
            </p>
          </div>

          {/* Edge detection banner for $100 (sell price in cents) */}
          {polymarketOdds.length > 0 && (() => {
            const odds100 = polymarketOdds.find((o) => o.strike === "100");
            const yes100 = odds100?.yesPct ?? 0;
            if (yes100 > 60) {
              return (
                <div className="px-4 py-2 bg-red-950/50 border-b border-terminal-border">
                  <span className="text-red-400 font-medium">
                    $100 &gt; 60¢ → OVERPRICED → BUY NO
                  </span>
                </div>
              );
            }
            if (yes100 < 40) {
              return (
                <div className="px-4 py-2 bg-green-950/50 border-b border-terminal-border">
                  <span className="text-green-400 font-medium">
                    $100 &lt; 40¢ → UNDERPRICED → BUY YES
                  </span>
                </div>
              );
            }
            return null;
          })()}

          <div className="p-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-terminal-muted text-left border-b border-terminal-border">
                  <th className="py-2 pr-4">Strike</th>
                  <th className="py-2 pr-4">YES (¢)</th>
                  <th className="py-2">NO (¢)</th>
                </tr>
              </thead>
              <tbody>
                {polymarketOdds.length > 0 ? (
                  polymarketOdds.map((row) => {
                    const isOverpriced = row.strike === "100" && row.yesPct > 60;
                    const isUnderpriced =
                      row.strike === "100" && row.yesPct < 40;
                    const rowHighlight = isOverpriced
                      ? "bg-red-950/30"
                      : isUnderpriced
                      ? "bg-green-950/30"
                      : "";
                    return (
                      <tr
                        key={row.strike}
                        className={`border-b border-terminal-border/50 ${rowHighlight}`}
                      >
                        <td className="py-2 pr-4 font-medium">${row.strike}</td>
                        <td
                          className={`py-2 pr-4 font-mono tabular-nums ${
                            isOverpriced
                              ? "text-red-400"
                              : isUnderpriced
                              ? "text-green-400"
                              : "text-terminal-text"
                          }`}
                        >
                          {row.yesPct.toFixed(1)}¢
                        </td>
                        <td className="py-2 font-mono text-terminal-muted tabular-nums">
                          {row.noPct.toFixed(1)}¢
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={3} className="py-4 text-terminal-muted">
                      Loading odds...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

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

        {/* Position Tracker — Editable inputs + Update button + Portfolio value + Net outcomes */}
        <section className="rounded-lg bg-terminal-surface border border-terminal-border overflow-hidden">
          <div className="px-4 py-3 border-b border-terminal-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="font-semibold text-white">Position Tracker</h2>
            <p className="text-xs text-terminal-muted">
              Enter shares and avg price (¢), click Update — saved on reload.
            </p>
            </div>
            <button
              onClick={commitPositions}
              className="shrink-0 px-4 py-2 bg-terminal-info text-terminal-bg font-medium rounded-lg hover:opacity-90 transition-opacity"
            >
              Update latest quantities
            </button>
          </div>
          <div className="p-4 overflow-x-auto space-y-4">
            {/* Input table: Contract | Shares | Avg Price (¢) | Cost Basis */}
            <table className="w-full text-sm">
              <thead>
                <tr className="text-terminal-muted text-left border-b border-terminal-border">
                  <th className="py-2 pr-3">Contract</th>
                  <th className="py-2 pr-3">Shares</th>
                  <th className="py-2 pr-3">Avg ¢</th>
                  <th className="py-2 text-right">Cost</th>
                </tr>
              </thead>
              <tbody>
                {POSITION_CONFIG.map((cfg) => {
                  const pos = draftPositions[cfg.id] ?? { shares: 0, avgPriceCents: 0 };
                  const cost = pos.shares * (pos.avgPriceCents / 100);
                  return (
                    <tr key={cfg.id} className="border-b border-terminal-border/50">
                      <td className="py-2 pr-3 font-medium">{cfg.contract}</td>
                      <td className="py-2 pr-3">
                        <input
                          type="number"
                          min={0}
                          value={pos.shares || ""}
                          onChange={(e) =>
                            updateDraft(cfg.id, "shares", Math.max(0, parseInt(e.target.value, 10) || 0))
                          }
                          placeholder="0"
                          className="w-20 bg-terminal-bg border border-terminal-border rounded px-2 py-1 text-terminal-text font-mono text-sm"
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <input
                          type="number"
                          min={0}
                          max={99}
                          value={pos.avgPriceCents || ""}
                          onChange={(e) =>
                            updateDraft(
                              cfg.id,
                              "avgPriceCents",
                              Math.min(99, Math.max(0, parseInt(e.target.value, 10) || 0))
                            )
                          }
                          placeholder="0"
                          className="w-16 bg-terminal-bg border border-terminal-border rounded px-2 py-1 text-terminal-text font-mono text-sm"
                        />
                      </td>
                      <td className="py-2 text-right font-mono text-terminal-muted">
                        ${cost.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Current portfolio value (from Polymarket) */}
            <div className="rounded-lg bg-terminal-bg/50 border border-terminal-border p-3">
              <h3 className="font-medium text-white mb-2">Current Portfolio Value</h3>
              <p className="text-terminal-muted text-xs mb-1">
                Based on live Polymarket sell prices (¢)
              </p>
              {(() => {
                const costBasis = getCostBasis(positions);
                const currentValue = getCurrentPortfolioValue(positions, polymarketOdds);
                const unrealizedPnl = currentValue - costBasis;
                return (
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-terminal-muted">Cost basis</span>
                      <span className="font-mono">${costBasis.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-terminal-muted">Current value</span>
                      <span className="font-mono font-medium">${currentValue.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm pt-1 border-t border-terminal-border">
                      <span className="text-terminal-muted">Unrealized P&L</span>
                      <span
                        className={`font-mono font-medium ${
                          unrealizedPnl >= 0 ? "text-terminal-success" : "text-terminal-danger"
                        }`}
                      >
                        {unrealizedPnl >= 0 ? "+" : ""}${unrealizedPnl.toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Net outcomes by scenario */}
            <div>
              <h3 className="font-medium text-white mb-2">Net Outcomes by Scenario</h3>
              <p className="text-terminal-muted text-xs mb-2">
                Payout at settlement minus cost basis
              </p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-terminal-muted text-left border-b border-terminal-border">
                    <th className="py-2 pr-4">Scenario</th>
                    <th className="py-2 pr-4 text-right">Payout</th>
                    <th className="py-2 text-right">Net P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {SCENARIOS.map((s, i) => {
                    const costBasis = getCostBasis(positions);
                    const payout = getPayoutForScenario(positions, s.price);
                    const netPnl = payout - costBasis;
                    return (
                      <tr key={i} className="border-b border-terminal-border/50">
                        <td className="py-2 pr-4">{s.label}</td>
                        <td className="py-2 pr-4 text-right font-mono">${payout.toFixed(2)}</td>
                        <td
                          className={`py-2 text-right font-mono font-medium ${
                            netPnl >= 0 ? "text-terminal-success" : "text-terminal-danger"
                          }`}
                        >
                          {netPnl >= 0 ? "+" : ""}${netPnl.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="mt-8 text-center text-terminal-muted text-xs">
        Data: TwelveData (price) · Reuters (news) · Polymarket (odds) · Updates: price 5s, news 60s, odds 30s
      </footer>
    </main>
  );
}
