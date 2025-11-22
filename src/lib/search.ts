// src/lib/search.ts
// DuckDuckGo Lite HTML scraper — NO API KEY NEEDED

export interface SearchResult {
  title: string;
  snippet: string;
  link: string;
}

/**
 * Performs a lightweight, keyless search using DuckDuckGo's lite HTML endpoint.
 * Returns ~5 real search results with title, URL, and snippet.
 */
export async function webSearch(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return [];

  const url = `https://duckduckgo.com/lite/?q=${encodeURIComponent(query)}`;

  try {
    const res = await fetch(url);
    const html = await res.text();

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    const results: SearchResult[] = [];

    const anchors = Array.from(doc.querySelectorAll("a")) as HTMLAnchorElement[];

    for (let a of anchors) {
      const title = a.textContent?.trim() || "";
      const link = a.getAttribute("href") || "";

      if (!title || !link) continue;

      // Skip internal DDG links
      if (link.startsWith("/")) continue;

      const snippetElement = a.parentElement?.querySelector("td:nth-child(2)");
      const snippet = snippetElement?.textContent?.trim() || title;

      results.push({
        title,
        link,
        snippet
      });

      if (results.length >= 5) break;
    }

    return results;
  } catch (err) {
    console.error("DuckDuckGo Lite search failed:", err);
    return [];
  }
}
