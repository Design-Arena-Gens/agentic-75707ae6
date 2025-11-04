import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Instagram Post Downloader",
  description: "Download Instagram posts, reels, and videos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-gradient-to-br from-purple-50 to-pink-50 min-h-screen">
        {children}
      </body>
    </html>
  );
}
