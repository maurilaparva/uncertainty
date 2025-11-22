'use client';
import React, { useState } from 'react';

export interface SearchResult {
  title: string;
  link: string;
  snippet: string;
}

export default function WebSearchPanel({
  onSearch
}: {
  onSearch: (q: string) => Promise<SearchResult[]>;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);

    const res = await onSearch(query);
    setResults(res);

    setLoading(false);
  }

  return (
    <div className="hidden lg:block w-80 border-l border-neutral-200 pl-4">
      <h2 className="text-lg font-semibold mb-2">Web Search</h2>

      <form onSubmit={handleSearch} className="mb-3">
        <div className="p-3 border rounded-md bg-white hover:bg-neutral-50 transition">
            <a
                href={r.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[15px] font-semibold text-blue-700"
            >
                {r.title}
            </a>
            <p className="text-[13px] text-gray-600 mt-1 leading-snug">
                {r.snippet}
            </p>
            </div>
      </form>

      {loading && (
        <p className="text-sm text-gray-500">Searching…</p>
      )}

      <div className="space-y-3">
        {results.map((r, i) => (
          <div
            key={i}
            className="p-2 border rounded hover:bg-neutral-50 transition"
          >
            <a
              href={r.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 font-medium"
            >
              {r.title}
            </a>
            <p className="text-xs text-gray-600 mt-1">{r.snippet}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
