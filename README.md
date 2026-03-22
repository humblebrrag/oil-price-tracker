# Oil Price Prediction Market Tracker

A production-ready web app for traders to monitor crude oil prices (WTI), breaking news, and manage prediction market positions.

## Tech Stack

- Next.js 14+ (App Router)
- TypeScript
- Tailwind CSS
- No external database
- Simple API routes

## Features

- **Live Oil Price (WTI/CL)** — Updates every 5 seconds via Yahoo Finance (CL=F)
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

No API keys required — price and chart data come from Yahoo Finance (CL=F), aligned with Polymarket CME settlement.

## Deploy on Vercel

1. Push your code to GitHub (or GitLab, Bitbucket).
2. Go to [vercel.com](https://vercel.com) and sign in with your Git provider.
3. Click **Add New Project** and import your repository.
4. Vercel will auto-detect Next.js — keep defaults and click **Deploy**.

Your app will be live at `https://your-project.vercel.app`.

## Project Structure

```
/app
  page.tsx         # Main dashboard
  layout.tsx
  globals.css
  api/
    price/route.ts # Yahoo Finance CL=F (live + chart)
    news/route.ts  # Reuters RSS + filter
```
