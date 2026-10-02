import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Maximilian Kelly",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }, { url: "/favicon.ico", sizes: "48x48" }],
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
        {/* Cloudflare Web Analytics: cookie-free visitor counts. The token
            is public by design. Installed by hand because automatic
            injection doesn't reach this Worker-served site. */}
        <script
          defer
          src="https://static.cloudflareinsights.com/beacon.min.js"
          data-cf-beacon='{"token": "ed4b5db3d8df4a3baf24f9f949473717"}'
        />
      </body>
    </html>
  );
}
