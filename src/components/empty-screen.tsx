import React, { useEffect, useState } from 'react';
import { UseChatHelpers } from 'ai/react';
import { Button } from './ui/button.tsx';
import { IconArrowRight } from './ui/icons.tsx';

type EmptyScreenProps = Pick<UseChatHelpers, 'setInput' | 'append'> & {
  id: string;
  setApiKey: (key: string) => void;
  setSerperKey: (key: string) => void;
  initialOpen?: boolean;
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
  setInput,
  id,
  append,
  setApiKey,
  setSerperKey,
  initialOpen
}: EmptyScreenProps) {
  const [open, setOpen] = useState<boolean>(!!initialOpen);
  const [openaiKeyInput, setOpenaiKeyInput] = useState<string>('');
  const [googleKeyInput, setGoogleKeyInput] = useState<string>('');
  const [googleCxInput, setGoogleCxInput] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const visibleExamples = showAll ? exampleMessages : exampleMessages.slice(0, 3);

  useEffect(() => {
    setOpen(!!initialOpen);
  }, [initialOpen]);

  const saveKey = () => {
    const k = openaiKeyInput.trim().replace(/^["']|["']$/g, '');
    const g = googleKeyInput.trim().replace(/^["']|["']$/g, '');
    const cx = googleCxInput.trim().replace(/^["']|["']$/g, '');

    if (!k || k.length < 20 || !k.startsWith('sk-')) {
      setError('Please paste a valid OpenAI API key (e.g., starts with "sk-").');
      return;
    }
    if (!g || g.length < 20) {
      setError('Please paste a valid Google API key (from Google Cloud Console).');
      return;
    }
    if (!cx || cx.length < 8) {
      setError('Please paste your Search Engine ID (cx).');
      return;
    }

    setError(null);
    setApiKey(k);
    setSerperKey(g);
    try {
      localStorage.setItem('google-cx', cx);
      localStorage.setItem('has-token-been-set', 'true');
    } catch {}

    setOpen(false);
    setOpenaiKeyInput('');
    setGoogleKeyInput('');
    setGoogleCxInput('');
  };

  return (
    <div className="mx-auto max-w-2xl px-4">
      <div className="flex flex-col gap-2 rounded-lg border bg-background p-8">
        <h1 className="text-lg font-semibold">Uncertainty Visualization</h1>

        <p className="mb-2 leading-normal text-muted-foreground">
          This prototype investigates how large language models express and quantify uncertainty in
          biomedical question answering. It visualizes paragraph-level, claim-level, token-level confidence derived from
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
              onClick={() => setInput(message.message)}
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

        <div className="mt-6 flex items-center gap-3">
          <Button variant="outline" onClick={() => setOpen(true)}>
            Set API keys
          </Button>
          <span className="text-xs text-muted-foreground">
            Your keys (OpenAI + Google API + Search Engine ID) are stored locally in your browser.
          </span>
        </div>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-lg border bg-background p-6 shadow-xl">
            <h2 className="text-base font-semibold mb-2">Enter your API keys</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Paste your OpenAI key, your Google API key, and your Search Engine ID (cx).
              These are stored only in your browser and sent with requests from this page.
            </p>

            <label htmlFor="openai-key" className="text-sm font-medium">OpenAI API key</label>
            <input
              id="openai-key"
              type="password"
              placeholder="sk-********************************"
              value={openaiKeyInput}
              onChange={(e) => setOpenaiKeyInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') saveKey(); }}
              className="w-full rounded-md border px-3 py-2 mb-3 outline-none focus:ring-2 focus:ring-ring"
              autoFocus
            />

            <label htmlFor="google-key" className="text-sm font-medium">Google API key</label>
            <input
              id="google-key"
              type="password"
              placeholder="AIza***********************************"
              value={googleKeyInput}
              onChange={(e) => setGoogleKeyInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') saveKey(); }}
              className="w-full rounded-md border px-3 py-2 mb-3 outline-none focus:ring-2 focus:ring-ring"
            />

            <label htmlFor="google-cx" className="text-sm font-medium">Search Engine ID (cx)</label>
            <input
              id="google-cx"
              type="text"
              placeholder="e.g. 85bd440b6cefc4c80"
              value={googleCxInput}
              onChange={(e) => setGoogleCxInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') saveKey(); }}
              className="w-full rounded-md border px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
            />

            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={saveKey}>Save</Button>
            </div>

            <div className="mt-3 text-xs text-muted-foreground">
              Don’t have keys? Create an OpenAI API key in your OpenAI account, a Google API key in
              Google Cloud Console (Custom Search API enabled), and a Search Engine ID in
              Programmable Search Engine.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
