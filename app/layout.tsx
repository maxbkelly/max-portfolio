import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Max — Director & Editor",
  description: "Director, editor and image maker. Selected films and visual work.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500&display=swap" rel="stylesheet" />
        {/* Lets the browser start the connection to Vimeo's domains before
            the hero iframe itself requests them, shaving connection setup
            time off the reel's start — most noticeable on mobile data. */}
        <link rel="preconnect" href="https://player.vimeo.com" />
        <link rel="preconnect" href="https://i.vimeocdn.com" />
        <link rel="preconnect" href="https://f.vimeocdn.com" />
      </head>
      <body>{children}</body>
    </html>
  );
}
