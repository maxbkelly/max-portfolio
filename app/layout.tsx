import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Max — Director & Editor",
  description: "Director, editor and image maker. Selected films and visual work.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
