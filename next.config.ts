import type { NextConfig } from "next";

// Pages from the old Squarespace site that search engines and old links
// still point to. The new site is a single page, so /about lands on the
// About section and everything else lands on the homepage.
const oldSquarespacePages = [
  "director",
  "creator",
  "creator-archive",
  "editorial",
  "projects",
  "references",
  "home",
  "homeold",
  "new-page",
  "new-cover-page-1",
  "mortimer-sands",
];

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/about/:rest*", destination: "/#about", permanent: true },
      ...oldSquarespacePages.map((page) => ({ source: `/${page}/:rest*`, destination: "/", permanent: true })),
    ];
  },
};

export default nextConfig;
