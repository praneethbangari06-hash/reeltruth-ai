import type { Metadata, Viewport } from "next";
import "./globals.css";

export const dynamic = "force-dynamic";

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
      <body className="bg-[#070510] text-white min-h-screen font-sans">
        {children}
      </body>
    </html>
  );
}
