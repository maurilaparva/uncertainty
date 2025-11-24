'use client';
import React, { useState } from 'react';
import { Button } from './ui/button';

export default function PostTrialSurvey({ onDone, onBack }) {
  const [finalAnswer, setFinalAnswer] = useState('');
  const [aiConfidence, setAiConfidence] = useState(3);
  const [selfConfidence, setSelfConfidence] = useState(3);
  const [trustScore, setTrustScore] = useState(3);
  const [helpfulness, setHelpfulness] = useState(3);

  function handleSubmit() {
    if (!finalAnswer) return;

    onDone({
      finalAnswer,
      aiConfidence,
      selfConfidence,
      trustScore,
      helpfulness
    });
  }

  return (
    <div
      className="
        fade-in border rounded-xl p-6 mt-6 shadow-sm bg-white 
        font-[Inter] text-gray-900 max-w-2xl mx-auto
      "
      style={{
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale'
      }}
    >
      {/* HEADER */}
      <div className="mb-4 flex items-center justify-between">
        <h1
          className="text-xl font-semibold text-gray-900"
          style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
        >
          Post-Interface Questionnaire
        </h1>

        {onBack && (
          <Button
            variant="ghost"
            onClick={onBack}
            className="text-gray-700 hover:text-gray-900 text-sm"
            style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
          >
            ← Back
          </Button>
        )}
      </div>

      <p className="text-sm text-gray-600 mb-6 leading-relaxed">
        Please answer a few short questions about your experience.
      </p>

      <div className="space-y-6">

        {/* RADIO QUESTION */}
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

        {/* SLIDERS */}
        {[
          {
            label: '2. How confident are you in the AI’s answer?',
            value: aiConfidence,
            setter: setAiConfidence
          },
          {
            label: '3. How confident are you in your own answer?',
            value: selfConfidence,
            setter: setSelfConfidence
          },
          {
            label: '4. How much do you trust the uncertainty information?',
            value: trustScore,
            setter: setTrustScore
          },
          {
            label: '5. How helpful were the uncertainty scores?',
            value: helpfulness,
            setter: setHelpfulness
          }
        ].map(({ label, value, setter }, idx) => (
          <div key={idx}>
            <label className="font-medium text-gray-800">{label}</label>

            <input
              type="range"
              min={1}
              max={5}
              value={value}
              onChange={(e) => setter(Number(e.target.value))}
              className="w-full mt-2 appearance-none cursor-pointer h-2 rounded-lg bg-transparent"
              style={
                {
                  '--value': value,
                  '--min': 1,
                  '--max': 5,
                  '--fill': '#6b6b6b',  // black filled left side
                  '--track': '#e8dfd2'  // beige unfilled right side
                } as React.CSSProperties
              }
            />

            <p className="text-xs text-gray-500 mt-1">
              Selected: <span className="font-medium">{value}</span>
            </p>
          </div>
        ))}
      </div>

      {/* BUTTON ROW */}
      <div className="mt-8 flex justify-end gap-3">
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
