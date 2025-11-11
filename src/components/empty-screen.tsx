import React, { useEffect, useState } from 'react';
import { UseChatHelpers } from 'ai/react';
import { Button } from './ui/button.tsx';
import { IconArrowRight } from './ui/icons.tsx';

type EmptyScreenProps = Pick<UseChatHelpers, 'setInput' | 'append'> & {
  id: string;
  initialOpen?: boolean;
  isModelLoaded?: boolean; // ✅ indicates Phi-3 load status
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
  const [showAll, setShowAll] = useState(false);
  const [dots, setDots] = useState('');

  // simple animated dots (...)
  useEffect(() => {
    if (!isModelLoaded) {
      const interval = setInterval(() => {
        setDots(prev => (prev.length >= 3 ? '' : prev + '.'));
      }, 400);
      return () => clearInterval(interval);
    }
  }, [isModelLoaded]);

  // --- ⏳ Show loading screen until model is ready ---
  if (!isModelLoaded) {
    return (
      <div className="flex items-center justify-center h-screen bg-white transition-opacity duration-500">
        <h1 className="text-xl font-semibold text-gray-700 animate-pulse">
          Model loading{dots}
        </h1>
      </div>
    );
  }

  // --- Once loaded, show the normal intro screen ---
  const visibleExamples = showAll ? exampleMessages : exampleMessages.slice(0, 3);

  return (
    <div className="mx-auto max-w-2xl px-4 fade-in">
      <div className="flex flex-col gap-2 rounded-lg border bg-background p-8 shadow-sm transition-all duration-500">
        <h1 className="text-lg font-semibold">Uncertainty Visualization</h1>

        <p className="mb-2 leading-normal text-muted-foreground">
          This prototype investigates how large language models express and quantify uncertainty in
          biomedical question answering. It visualizes paragraph-level, claim-level, and token-level confidence derived from
          model outputs to help users interpret factual reliability and reasoning consistency.
          <br />
          The example questions below are adapted from the FAccT ’24 study <em>“I’m Not Sure, But…”</em>.
        </p>

        <hr className="my-3 border-border" />

        <h2 className="text-sm font-semibold text-muted-foreground mb-1">
          FAccT ’24 Medical Claim Questions
        </h2>

        <div className="mt-2 flex flex-col items-start space-y-1">
          {visibleExamples.map((message, index) => (
            <Button
              key={index}
              variant="link"
              className="h-auto p-0 text-base hover:underline text-left"
              onClick={() => {
                if (!isModelLoaded) {
                  alert('Model is still loading, please wait...');
                  return;
                }
                append(message.message); // ✅ directly trigger model with question
              }}
            >
              <IconArrowRight className="mr-2 text-muted-foreground" />
              {message.heading}
            </Button>
          ))}

          <button
            onClick={() => setShowAll(!showAll)}
            className="text-xs text-muted-foreground mt-2 hover:underline"
          >
            {showAll ? 'Show fewer questions' : 'Show all 8 questions'}
          </button>
        </div>

        <hr className="my-4 border-border" />

        <p className="leading-normal text-muted-foreground">
          You can also start a custom conversation about a medical entity or supplement and explore
          its claims, evidence, and uncertainty.
        </p>
      </div>
    </div>
  );
}
