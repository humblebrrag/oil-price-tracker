# Oil Price Prediction Market Tracker

A production-ready web app for traders to monitor crude oil prices (WTI), breaking news, and manage prediction market positions.

## Tech Stack

- Next.js 14+ (App Router)
- TypeScript
- Tailwind CSS
- No external database
- Simple API routes

## Features

- **Live Oil Price (WTI/CL)** — Updates every 5 seconds via TwelveData API
- **Price Zone Detection** — SAFE ZONE, BREAKOUT WATCH, DECISION ZONE, DANGER ZONE, EXIT MODE
- **Trade Action Engine** — Recommended actions based on price (ADD NO $100, HOLD, REDUCE NO $100, SELL $110 YES)
- **News Feed** — Filtered Reuters headlines (oil, iran, israel, opec, strait), refresh every 60 seconds
- **Position Tracker** — Hardcoded positions with estimated PnL by scenario

## Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### API Keys (Required for Live Price)

The dashboard needs a valid API key to show the WTI crude oil price (TwelveData demo key does not work).

**Option 1: TwelveData** (recommended)
1. Sign up at [twelvedata.com](https://twelvedata.com) (free tier available)
2. Create `.env.local`:
   ```
   TWELVE_DATA_API_KEY=your_api_key
   ```

**Option 2: Alpha Vantage**
1. Sign up at [alphavantage.co](https://www.alphavantage.co/support/#api-key)
2. Add to `.env.local`:
   ```
   ALPHA_VANTAGE_API_KEY=your_api_key
   ```

Price source: WTI Crude Oil front-month futures (CL), aligned with Polymarket CME resolution.

## Deploy on Vercel

1. Push your code to GitHub (or GitLab, Bitbucket).
2. Go to [vercel.com](https://vercel.com) and sign in with your Git provider.
3. Click **Add New Project** and import your repository.
4. Vercel will auto-detect Next.js — keep defaults and click **Deploy**.
5. Add `TWELVE_DATA_API_KEY` or `ALPHA_VANTAGE_API_KEY` under Project → Settings → Environment Variables (required for live price).

Your app will be live at `https://your-project.vercel.app`.

## Project Structure

```
/app
  page.tsx         # Main dashboard
  layout.tsx
  globals.css
  api/
    price/route.ts # TwelveData oil price
    news/route.ts  # Reuters RSS + filter
```
