'use client';

import React, { useEffect, useRef } from 'react';

export default function WebSearchPanel({
  onSearchClick
}: {
  onSearchClick?: () => void;   // ⭐ NEW
}) {
  const ENGINE_ID = "54a1c495969ee43cd";

  const scriptLoaded = useRef(false);
  const listenerAttached = useRef(false);

  /* -----------------------------------------
     Load Google Search Engine Script
  ------------------------------------------- */
  useEffect(() => {
    if (scriptLoaded.current) return;

    const script = document.createElement("script");
    script.src = `https://cse.google.com/cse.js?cx=${ENGINE_ID}`;
    script.async = true;
    scriptLoaded.current = true;
    document.body.appendChild(script);
  }, []);

  /* -----------------------------------------
     Attach click listeners to Google CSE elements
     after they appear in the DOM
  ------------------------------------------- */
  useEffect(() => {
    if (listenerAttached.current) return;

    const interval = setInterval(() => {
      const button = document.querySelector("button.gsc-search-button");

      if (button) {
        listenerAttached.current = true;

        // ⭐ Log when CSE search button is clicked
        button.addEventListener("click", () => {
          if (onSearchClick) onSearchClick();
        });

        clearInterval(interval);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [onSearchClick]);

  /* -----------------------------------------
     Fallback: clicking anywhere in search panel
     also counts as search engagement
  ------------------------------------------- */
  function handleFallbackClick() {
    if (onSearchClick) onSearchClick();
  }

  return (
    <div
      className="hidden lg:block w-[340px]  pl-4 ml-6"
      onClick={handleFallbackClick} // ⭐ fallback
    >
      <h1
        className="text-xl font-semibold text-gray-900 mb-3"
        style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
      >
        Web Search
      </h1>

      {/* Google Programmable Search: box + results */}
      <div className="gcse-search" />
    </div>
  );
}
