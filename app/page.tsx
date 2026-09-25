import { headers } from "next/headers";
import { loadCmsContent, type PortfolioContent } from "./data";
import Portfolio from "./portfolio";

// vinext calls a page component twice per request (a probe for redirects
// and errors, then the real render). Share one Sanity request between the
// two, keyed on this request's headers object so nothing is ever shared
// across different visitors' requests.
const contentByRequest = new WeakMap<object, Promise<PortfolioContent | null>>();

// Fetching Site Settings here (on the server, per request) puts the hero's
// video URLs into the first HTML, so the browser starts downloading them
// with the page instead of after its JavaScript loads and asks Sanity. If
// Sanity is slow or down, give up quickly and let the browser fetch it.
export default async function Page() {
  const requestHeaders = await headers();
  let content = contentByRequest.get(requestHeaders);
  if (!content) {
    content = loadCmsContent(AbortSignal.timeout(1500)).catch(() => null);
    contentByRequest.set(requestHeaders, content);
  }
  const userAgent = requestHeaders.get("user-agent") ?? "";
  const isMobile = /iPhone|iPod|Android.*Mobile|Mobile.*Firefox/i.test(userAgent);
  return <Portfolio initialContent={await content} initialIsMobile={isMobile} />;
}
