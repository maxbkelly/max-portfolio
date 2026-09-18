import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const {default: worker} = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {headers: {accept: "text/html"}}),
    {ASSETS: {fetch: async () => new Response("Not found", {status: 404})}},
    {waitUntil() {}, passThroughOnException() {}},
  );
}

test("renders the portfolio shell and fallback content", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Max — Director &amp; Editor<\/title>/i);
  assert.match(html, /MAXIMILIAN KELLY/);
  assert.match(html, /DIRECTOR/);
  assert.match(html, /EDITOR/);
  assert.match(html, /A\.I\./);
  assert.match(html, /Charlie Kaufman/);
  assert.doesNotMatch(html, /Your site is taking shape|Building your site/);
});
