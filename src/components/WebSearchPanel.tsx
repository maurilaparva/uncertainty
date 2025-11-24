'use client';

import React, { useEffect, useRef } from 'react';

export default function WebSearchPanel() {
  // Your Google Search Engine ID
  const ENGINE_ID = "54a1c495969ee43cd";

  const scriptLoaded = useRef(false);

  /* -----------------------------------------
     Load Programmable Search Engine script
     exactly once
  ------------------------------------------- */
  useEffect(() => {
    if (scriptLoaded.current) return;

    const script = document.createElement("script");
    script.src = `https://cse.google.com/cse.js?cx=${ENGINE_ID}`;
    script.async = true;
    scriptLoaded.current = true;
    document.body.appendChild(script);
  }, []);

  return (
    <div className="hidden lg:block w-[340px] border-l border-neutral-200 pl-4 ml-6">

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
