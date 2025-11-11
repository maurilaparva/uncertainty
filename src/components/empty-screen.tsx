import React, { useEffect, useState } from 'react';
import { UseChatHelpers } from 'ai/react';
import { Button } from './ui/button.tsx';
import { IconArrowRight } from './ui/icons.tsx';
import { useAtom } from 'jotai';
import { viewModeAtom } from '../lib/state.ts';

type EmptyScreenProps = Pick<UseChatHelpers, 'setInput' | 'append'> & {
  id: string;
  initialOpen?: boolean;
  isModelLoaded?: boolean;
};

const exampleMessages = [
  {
    heading: 'Did Dupilumab receive FDA approval for Asthma before Chronic Rhinosinusitis?',
    message: 'Did Dupilumab receive FDA approval for Asthma before Chronic Rhinosinusitis?'
  },
  {
    heading: 'Is there more antihistamine in Benadryl than Rhinocort?',
    message: 'Is there more antihistamine in Benadryl than Rhinocort?'
  },
  {
    heading: 'Is Deep Vein Thrombosis a common side effect of Ocella?',
    message: 'Is Deep Vein Thrombosis a common side effect of Ocella?'
  },
  {
    heading: 'Is Spironolactone an FDA-approved drug for treating acne?',
    message: 'Is Spironolactone an FDA-approved drug for treating acne?'
  },
  {
    heading: 'Are both Simvastatin and Ambien drugs that are recommended to be taken at night?',
    message: 'Are both Simvastatin and Ambien drugs that are recommended to be taken at night?'
  },
  {
    heading: 'Is Uveitis a common symptom of Ankylosing Spondylitis?',
    message: 'Is Uveitis a common symptom of Ankylosing Spondylitis?'
  },
  {
    heading: 'Is fever a common symptom of Jock Itch?',
    message: 'Is fever a common symptom of Jock Itch?'
  },
  {
    heading: 'Can an adult who has not had chickenpox get shingles?',
    message: 'Can an adult who has not had chickenpox get shingles?'
  }
];

export function EmptyScreen({
  append,
  isModelLoaded = false
}: EmptyScreenProps) {
  const [dots, setDots] = useState('');
  const [viewMode, setViewMode] = useAtom(viewModeAtom);

  useEffect(() => {
    if (!isModelLoaded) {
      const interval = setInterval(() => {
        setDots(prev => (prev.length >= 3 ? '' : prev + '.'));
      }, 400);
      return () => clearInterval(interval);
    }
  }, [isModelLoaded]);

  if (!isModelLoaded) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <h1 className="text-xl font-semibold text-gray-700 animate-pulse">
          Model loading{dots}
        </h1>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 fade-in">
      <div className="flex flex-col gap-3 rounded-lg border bg-background p-8 shadow-sm">
        <h1 className="text-lg font-semibold">Uncertainty Visualization</h1>

        {/* 🔘 Visualization Mode Toggle */}
        <div className="flex items-center space-x-3 my-2">
          <span className="text-sm text-muted-foreground">Visualization Mode:</span>
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as any)}
            className="border rounded-md px-2 py-1 text-sm"
          >
            <option value="paragraph">Paragraph-Level</option>
            <option value="relation">Relation-Level</option>
            <option value="token">Token-Level</option>
          </select>
        </div>

        <p className="text-sm text-muted-foreground mb-3">
          Choose one mode to explore uncertainty visualization:
          <br />• <strong>Paragraph</strong> — overall + per-paragraph confidence
          <br />• <strong>Relation</strong> — uncertainty across knowledge-graph edges
          <br />• <strong>Token</strong> — per-word highlight of high uncertainty (≥ 0.8)
        </p>

        <hr className="my-3 border-border" />

        <h2 className="text-base font-semibold mt-2 mb-1">
          FAccT ’24 Benchmark Questions (E.1–E.8)
        </h2>
        <p className="text-sm text-muted-foreground mb-2">
          These correspond to the uncertainty-expression test cases from “Examining the Impact of
          Large Language Models’ Uncertainty Expression on User Reliance and Trust” FAccT 2024.
        </p>

        <div className="flex flex-col items-start space-y-1">
          {exampleMessages.map((message, index) => (
            <Button
              key={index}
              variant="link"
              className="h-auto p-0 text-base hover:underline text-left"
              onClick={() => append(message.message)}
            >
              <IconArrowRight className="mr-2 text-muted-foreground" />
              {message.heading}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
