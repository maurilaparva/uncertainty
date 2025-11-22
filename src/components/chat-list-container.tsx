'use client';
import React, { useState } from 'react';
import ChatList from './chat-list';

export default function ChatListContainer(props) {
  // Shared link preview state
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewPos, setPreviewPos] = useState({ x: 0, y: 0 });

  // NEW: persistent animation-complete registry
  const [sourcesVisible, setSourcesVisible] = useState<Record<string, boolean>>({});

  // Called by ChatList when animation finishes
  function markSourcesVisible(id: string) {
    setSourcesVisible((prev) => {
      // If already visible, don't trigger a re-render
      if (prev[id]) return prev;

      return { ...prev, [id]: true };
    });
  }

  return (
    <ChatList
      {...props}
      previewUrl={previewUrl}
      previewPos={previewPos}
      setPreviewUrl={setPreviewUrl}
      setPreviewPos={setPreviewPos}
      
      // Pass required animation props
      sourcesVisible={sourcesVisible}
      markSourcesVisible={markSourcesVisible}
    />
  );
}
