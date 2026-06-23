import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ReelTruth - AI Influencer Product Evaluator",
  description: "Verify marketing claims on Instagram Reels instantly using Gemini 2.5 Flash and community critiques.",
  manifest: "/manifest.json"
};

export const viewport: Viewport = {
  themeColor: "#070510",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover"
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-[#070510] text-white min-h-screen">
        {children}
      </body>
    </html>
  );
}
