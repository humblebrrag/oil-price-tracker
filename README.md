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

### API Keys (Optional)

For production, add a TwelveData API key to avoid rate limits:

1. Sign up at [twelvedata.com](https://twelvedata.com)
2. Create `.env.local` with:
   ```
   TWELVE_DATA_API_KEY=your_api_key
   ```

The app works with the demo key but may show simulated prices under heavy use.

## Deploy on Vercel

1. Push your code to GitHub (or GitLab, Bitbucket).
2. Go to [vercel.com](https://vercel.com) and sign in with your Git provider.
3. Click **Add New Project** and import your repository.
4. Vercel will auto-detect Next.js — keep defaults and click **Deploy**.
5. Optional: Add `TWELVE_DATA_API_KEY` under Project → Settings → Environment Variables.

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
