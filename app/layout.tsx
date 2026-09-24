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
        {/* Only player.vimeo.com is on the hero's critical path (the iframe
            document and player.js). i.vimeocdn.com (poster images) and
            f.vimeocdn.com (player UI chrome) are both preconnects the
            hero's background=1 embed likely never even uses — it has no
            poster state and effectively no visible UI — so they were just
            extra handshakes competing for the same limited connection
            capacity on a slow mobile-data link. The Google Fonts stylesheet
            for the About section (used only below the fold) is now
            injected client-side after mount instead of living here, so it
            doesn't compete with the hero at all during initial load — see
            the effect in page.tsx. */}
        <link rel="preconnect" href="https://player.vimeo.com" />
      </head>
      <body>{children}</body>
    </html>
  );
}
