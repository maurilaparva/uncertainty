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
  // pick ONLY the relevant list based on the viewMode
  const levelMap = {
    paragraph: recommended?.paragraph_level ?? [],
    token: recommended?.token_level ?? [],
    relation: recommended?.relation_level ?? [],
    raw: []
  };

  const activeQueries = levelMap[viewMode] ?? [];

  // description text depending on interface
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

      {/* TITLE */}
      <h1
        className="text-xl font-semibold text-gray-900"
        style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
      >
        Recommended Web Searches
      </h1>

      {/* Description */}
      <p className="text-xs text-gray-600 mb-4" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
        {descriptionMap[viewMode]}
      </p>

      {/* If nothing available */}
      {activeQueries.length === 0 && (
        <p className="text-xs text-gray-500 italic">
          No recommended searches available for this interface.
        </p>
      )}

      {/* Active Queries */}
      <div className="space-y-2">
        {activeQueries.map((q, idx) => (
          <button
            key={idx}
            onClick={() => openQuery(q)}
            className="
              w-full text-left text-sm p-2 rounded border
              hover:bg-neutral-50 transition
            "
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
