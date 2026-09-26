import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Maximilian Kelly",
  description: "Director, editor and image maker. Selected films and visual work.",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }, { url: "/favicon.ico", sizes: "48x48" }],
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
