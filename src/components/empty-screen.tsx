import React, { useEffect, useState } from 'react';
import { UseChatHelpers } from 'ai/react';
import { Button } from './ui/button.tsx';
import { IconArrowRight } from './ui/icons.tsx';
import { useAtom } from 'jotai';
import { viewModeAtom } from '../lib/state.ts';
import { useTrial } from '../lib/useTrial';


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
    heading: 'Are both Simvastatin and Ambien drugs recommended to be taken at night?',
    message: 'Are both Simvastatin and Ambien drugs recommended to be taken at night?'
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
  const trial = useTrial();
  useEffect(() => {
    if (!isModelLoaded) {
      const interval = setInterval(() => {
        setDots(prev => (prev.length >= 3 ? '' : prev + '.'));
      }, 400);
      return () => clearInterval(interval);
    }
  }, [isModelLoaded]);

  // --- Loading state ---
  if (!isModelLoaded) {
    return (
      <div className="flex items-center justify-center h-screen bg-white transition-all duration-700">
        <h1
          className="text-2xl font-semibold text-neutral-800 tracking-tight animate-pulse"
          style={{
            fontFamily: 'Inter, system-ui, sans-serif',
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
            letterSpacing: '-0.015em'
          }}
        >
          <span className="opacity-90">Loading model{dots}</span>
        </h1>
      </div>
    );
  }

  // --- Main content ---
  return (
    <div className="fade-in transition-opacity duration-700 ease-out">
      <div className="mx-auto max-w-3xl px-6 py-4">
        <div className="flex flex-col gap-4 rounded-xl border bg-background p-8 shadow-md">
          <h1
            className="text-xl font-semibold text-gray-900"
            style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
          >
            Uncertainty Visualization
          </h1>

          {/* 🔘 Visualization Mode Toggle */}
          <div className="flex items-center space-x-3 my-1">
            <span className="text-sm text-muted-foreground font-medium">
              Visualization Mode:
            </span>
            <select
              value={viewMode}
              onChange={(e) => {
                const mode = e.target.value as any;
                setViewMode(mode);            // UI visualization mode
                trial.setInterfaceMode(mode); // ⭐ update trial state (needed for logging)
              }}
              className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300 transition"
            >

              <option value="baseline">Baseline</option>
              <option value="paragraph">Paragraph-Level</option>
              <option value="relation">Relation-Level</option>
              <option value="token">Token-Level</option>
              <option value="raw">Raw Output</option>
            </select>
          </div>

          <p className="text-sm text-gray-600 leading-relaxed">
            Choose one mode to explore how uncertainty is visualized:
            <br />• <strong>Paragraph</strong> — overall + per-paragraph confidence
            <br />• <strong>Relation</strong> — uncertainty across knowledge-graph edges
            <br />• <strong>Token</strong> — per-word highlight of high uncertainty (≥ 0.8)
          </p>

          <hr className="my-3 border-gray-200" />

          <h2 className="text-base font-semibold text-gray-800 mt-1">
            FAccT ’24 Benchmark Questions (E.1–E.8)
          </h2>
          <p className="text-sm text-gray-600 mb-2">
            These correspond to the uncertainty-expression test cases from
            <em> “Examining the Impact of Large Language Models’ Uncertainty Expression on
            User Reliance and Trust”</em> (FAccT 2024).
          </p>

          <div className="flex flex-col items-start space-y-1 mt-1">
            {exampleMessages.map((message, index) => (
              <Button
                key={index}
                variant="link"
                className="h-auto p-0 text-base hover:underline text-left text-gray-800"
                onClick={() => {
                // ⭐ Set question ID in global trial state
                trial.setQuestionId(`q${index + 1}`);

                if (message.message === '__demo_dupilumab__') {
                  append('__demo_dupilumab__');
                } else {
                  append(message.message);
                }
              }}
              >
                <IconArrowRight className="mr-2 text-gray-500" />
                {message.heading}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
