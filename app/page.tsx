import type { Metadata } from "next";
import { headers } from "next/headers";
import { fallbackContent, loadCmsContent, type PortfolioContent } from "./data";
import Portfolio from "./portfolio";

// vinext calls a page component twice per request (a probe for redirects
// and errors, then the real render), plus generateMetadata. Share one
// Sanity request between them, keyed on this request's headers object so
// nothing is ever shared across different visitors' requests.
const contentByRequest = new WeakMap<object, Promise<PortfolioContent | null>>();

// If Sanity is slow or down, give up quickly and let the browser fetch it.
function contentFor(requestHeaders: object) {
  let content = contentByRequest.get(requestHeaders);
  if (!content) {
    content = loadCmsContent(AbortSignal.timeout(1500)).catch(() => null);
    contentByRequest.set(requestHeaders, content);
  }
  return content;
}

// The About bio from Sanity doubles as the search-result and link-preview
// description, so editing the bio updates it too.
export async function generateMetadata(): Promise<Metadata> {
  const content = await contentFor(await headers());
  const paragraphs = content?.aboutParagraphs ?? fallbackContent.aboutParagraphs;
  return { description: paragraphs.join(" ").replace(/\s+/g, " ").trim() };
}

// Fetching Site Settings here (on the server, per request) puts the hero's
// video URLs into the first HTML, so the browser starts downloading them
// with the page instead of after its JavaScript loads and asks Sanity.
export default async function Page() {
  const requestHeaders = await headers();
  const content = contentFor(requestHeaders);
  const userAgent = requestHeaders.get("user-agent") ?? "";
  const isMobile = /iPhone|iPod|Android.*Mobile|Mobile.*Firefox/i.test(userAgent);
  return <Portfolio initialContent={await content} initialIsMobile={isMobile} />;
}
