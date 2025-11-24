// lib/useTrial.tsx
'use client';

import React, { createContext, useContext, useState } from 'react';
import { useTrialState } from './hooks/useTrialState'; 
import { useLocalStorage } from './hooks/use-local-storage';

// What the trial global context contains
const TrialContext = createContext(null);

export function TrialProvider({ children }) {
  // participant ID (persistent)
  const [participantId] = useLocalStorage(
    'participant-id',
    crypto.randomUUID()
  );

  // interface mode (baseline / paragraph / token / relation)
  const [interfaceMode, setInterfaceMode] = useState('baseline');

  // question ID (q1–q8)
  const [questionId, setQuestionId] = useState('q1');

  // actual performance / confidence / search tracking:
  const trialState = useTrialState(questionId);

  const value = {
    participantId,
    interfaceMode,
    setInterfaceMode,

    questionId,
    setQuestionId,

    ...trialState
  };

  return (
    <TrialContext.Provider value={value}>
      {children}
    </TrialContext.Provider>
  );
}

export function useTrial() {
  const ctx = useContext(TrialContext);
  if (!ctx) throw new Error("useTrial must be used inside <TrialProvider>");
  return ctx;
}
