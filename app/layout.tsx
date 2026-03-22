import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Oil Price Prediction Market Tracker",
  description: "Monitor crude oil prices, breaking news, and manage prediction market positions",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-terminal-bg text-terminal-text antialiased font-mono">
        {children}
      </body>
    </html>
  );
}
