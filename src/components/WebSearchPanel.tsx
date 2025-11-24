'use client';
import React from 'react';

export default function WebSearchPanel({
  recommended,
  viewMode
}: {
  recommended: {
    paragraph_level?: string[];
    token_level?: string[];
    relation_level?: string[];
  };
  viewMode: "paragraph" | "token" | "relation" | "raw";
}) {
  const levelMap = {
    paragraph: recommended?.paragraph_level ?? [],
    token: recommended?.token_level ?? [],
    relation: recommended?.relation_level ?? [],
    raw: []
  };

  const activeQueries = levelMap[viewMode] ?? [];

  const descriptionMap = {
    paragraph:
      "These searches are generated from the overall reasoning to help verify the answer.",
    token:
      "These searches are generated from tokens with high uncertainty (≥ 0.8).",
    relation:
      "These searches are based on the supporting and attacking argument nodes.",
    raw: "No uncertainty-based searches are available in raw mode."
  };

  function openQuery(q: string) {
    const encoded = encodeURIComponent(q);
    window.open(`https://www.google.com/search?q=${encoded}`, '_blank');
  }

  return (
    <div className="hidden lg:block w-80 border-l border-neutral-200 pl-4 ml-6">

      <h1 className="text-xl font-semibold text-gray-900 font-inter mb-1">
        Recommended Web Searches
      </h1>

      <p className="text-xs text-gray-600 mb-4 font-inter">
        {descriptionMap[viewMode]}
      </p>

      {activeQueries.length === 0 && (
        <p className="text-xs text-gray-500 italic">
          No recommended searches available for this interface.
        </p>
      )}

      <div className="space-y-2">
        {activeQueries.map((q, idx) => (
          <button
            key={idx}
            onClick={() => openQuery(q)}
            className="
              w-full text-left text-sm
              px-3 py-2 rounded-lg border border-neutral-200
              bg-white text-gray-800
              shadow-sm

              hover:shadow-md
              hover:bg-neutral-50
              hover:-translate-y-[2px]

              active:translate-y-[0px]
              active:shadow-sm

              transition-all duration-200 ease-out
            "
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
