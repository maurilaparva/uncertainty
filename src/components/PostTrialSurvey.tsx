'use client';
import React, { useState } from 'react';
import { Button } from './ui/button';

export default function PostTrialSurvey({ onDone, onBack }) {
  const [finalAnswer, setFinalAnswer] = useState('');
  const [aiConfidence, setAiConfidence] = useState(3);
  const [selfConfidence, setSelfConfidence] = useState(3);

  // Multi-select reliance variables
  const [useAI, setUseAI] = useState(false);
  const [useLink, setUseLink] = useState(false);
  const [useInternet, setUseInternet] = useState(false);

  function handleSubmit() {
    if (!finalAnswer) return;

    onDone({
      finalAnswer,
      aiConfidence,
      selfConfidence,

      useAI,
      useLink,
      useInternet
    });
  }

  return (
    <div
      className="
        fade-in border rounded-xl p-6 mt-6 shadow-sm bg-white 
        font-[Inter] text-gray-900 max-w-2xl mx-auto
      "
    >
      {/* HEADER */}
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">
          Post-Question Survey
        </h1>

        {onBack && (
          <Button
            variant="ghost"
            onClick={onBack}
            className="text-gray-700 hover:text-gray-900 text-sm"
          >
            ← Back
          </Button>
        )}
      </div>

      <div className="space-y-8">

        {/* 1. Final Answer */}
        <div>
          <label className="font-medium text-gray-800">
            1. What is your final answer?
          </label>
          <div className="mt-2 flex gap-6 text-gray-700">
            {['yes', 'no'].map((val) => (
              <label key={val} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="finalAnswer"
                  checked={finalAnswer === val}
                  onChange={() => setFinalAnswer(val)}
                  className="h-4 w-4 accent-neutral-700"
                />
                <span className="capitalize">{val}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 2. Confidence in AI */}
        <div>
          <label className="font-medium text-gray-800">
            2. How confident are you in the AI’s answer?
          </label>

          <input
            type="range"
            min={1}
            max={5}
            value={aiConfidence}
            onChange={(e) => setAiConfidence(Number(e.target.value))}
            className="w-full mt-2 cursor-pointer"
          />
          <p className="text-xs text-gray-500 mt-1">Selected: {aiConfidence}</p>
        </div>

        {/* 3. Confidence in Own Answer */}
        <div>
          <label className="font-medium text-gray-800">
            3. How confident are you in your own answer?
          </label>

          <input
            type="range"
            min={1}
            max={5}
            value={selfConfidence}
            onChange={(e) => setSelfConfidence(Number(e.target.value))}
            className="w-full mt-2 cursor-pointer"
          />
          <p className="text-xs text-gray-500 mt-1">Selected: {selfConfidence}</p>
        </div>

        {/* 4. Reliance Checkboxes */}
        <div>
          <label className="font-medium text-gray-800">
            4. What was your final answer based on? (Select all that apply)
          </label>

          <div className="mt-3 flex flex-col gap-3 text-gray-700">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={useAI}
                onChange={() => setUseAI(!useAI)}
                className="h-4 w-4 accent-neutral-700"
              />
              AI system’s answer
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={useLink}
                onChange={() => setUseLink(!useLink)}
                className="h-4 w-4 accent-neutral-700"
              />
              Linked sources in the AI answer
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={useInternet}
                onChange={() => setUseInternet(!useInternet)}
                className="h-4 w-4 accent-neutral-700"
              />
              Your own Internet search
            </label>
          </div>
        </div>
      </div>

      {/* BUTTON ROW */}
      <div className="mt-10 flex justify-end gap-3">
        <Button
          onClick={handleSubmit}
          disabled={!finalAnswer}
          className="px-6"
        >
          Submit
        </Button>
      </div>
    </div>
  );
}
