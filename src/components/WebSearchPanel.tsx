'use client';

import React, { useEffect, useRef } from 'react';

export default function WebSearchPanel({
  onSearchClick
}: {
  onSearchClick?: () => void;
}) {
  const ENGINE_ID = "54a1c495969ee43cd";
  const scriptLoaded = useRef(false);

  // Prevent multiple listener bindings
  const listenersAttached = useRef(false);

  /* Load Google CSE script */
  useEffect(() => {
    if (scriptLoaded.current) return;

    const script = document.createElement("script");
    script.src = `https://cse.google.com/cse.js?cx=${ENGINE_ID}`;
    script.async = true;
    scriptLoaded.current = true;

    document.body.appendChild(script);
  }, []);

  /* Attach search listeners ONCE */
  useEffect(() => {
    const interval = setInterval(() => {
      if (listenersAttached.current) return; // ⛔ Already attached — stop.

      const searchBtn = document.querySelector("button.gsc-search-button");
      const searchInput = document.querySelector("input.gsc-input");

      if (searchBtn && searchInput) {
        console.log("Search elements detected ✔");

        // Attach listeners exactly ONCE
        listenersAttached.current = true;

        searchBtn.addEventListener("click", () => {
          console.log("Search button clicked ✔");
          if (onSearchClick) onSearchClick();
        });

        searchInput.addEventListener("keydown", (e: any) => {
          if (e.key === "Enter") {
            console.log("Search triggered via ENTER ✔");
            if (onSearchClick) onSearchClick();
          }
        });

        clearInterval(interval);
      }
    }, 300);

    return () => clearInterval(interval);
  }, [onSearchClick]);

  return (
    <div className="hidden lg:block w-[340px] pl-4 ml-6">
      <h1
        className="text-xl font-semibold text-neutral-800 tracking-tight mb-3"
        style={{
          fontFamily: 'Inter, system-ui, sans-serif',
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
          letterSpacing: '-0.015em'
        }}
      >
        Web Search
      </h1>
      <div className="gcse-search" />
    </div>
  );
}
