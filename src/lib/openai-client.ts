// src/lib/openai-client.ts
import OpenAI from 'openai';

const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

if (!apiKey) {
  console.warn('⚠️ VITE_OPENAI_API_KEY is not set. GPT-4 calls will fail.');
}

export const openai = new OpenAI({
  apiKey,
  dangerouslyAllowBrowser: true, // required for client-side calls
});

// -------------------------------------------------------
// GPT-4 CALL WITH UPDATED UNCERTAINTY + BALANCED RELATIONS
// -------------------------------------------------------
export async function askGpt4Once(userQuestion: string): Promise<string> {
  if (!apiKey) {
    throw new Error('Missing VITE_OPENAI_API_KEY');
  }

  const SYSTEM_PROMPT = `
You are a medical reasoning assistant. 
Given a question, return STRICT JSON capturing reasoning and uncertainty.

### OUTPUT FORMAT ###
{
  "answer": "<multi-paragraph reasoning>",
  "overall_confidence": 0.0,
  "token_uncertainty": [
    { "token": "...", "score": 0.0 }
  ],
  "relations": [
    { "source": "...", "type": "SUPPORTS" or "ATTACKS", "target": "...", "score": 0.0 }
  ]
}

### REQUIRED RULES ###

#### ANSWER
- Must contain **2–4 paragraphs**.
- Must be medically accurate and well reasoned.

#### OVERALL CONFIDENCE
- MUST be a float between 0 and 1.

#### TOKEN UNCERTAINTY
- Include **only tokens/phrases the model is MOST uncertain about**.
- **Every score must be ≥ 0.8**.
- Typically **3–7 tokens**, but fewer allowed if certainty is strong.
- Tokens must be short (1–3 words).

#### RELATIONS (BALANCED ARGUMENT SET)
- Provide **4–8 relations total**.
- MUST be **unique** and not semantically redundant.
- Relation fields:
  - "source": short span (≤ 8 words)
  - "type": MUST be SUPPORTS or ATTACKS (uppercase)
  - "target": short span (≤ 8 words)
  - "score": float 0–1
- **The number of SUPPORTS must equal the number of ATTACKS.**
  Examples:
    - 2 SUPPORTS + 2 ATTACKS
    - 3 SUPPORTS + 3 ATTACKS
    - 4 SUPPORTS + 4 ATTACKS
- If the reasoning does not naturally produce balance, 
  you MUST expand or reduce relations until they are balanced.

#### JSON RULES
- Must output VALID JSON ONLY.
- No comments.
- No trailing commas.
- Keys must be double-quoted.
- Strings must be double-quoted.
- Escape internal quotes if needed.

If any field cannot be expressed, return null for that field.
Return ONLY the JSON object.
`;

  // First attempt
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userQuestion }
    ]
  });

  let content = response.choices[0]?.message?.content ?? "";

  // Try parsing
  try {
    JSON.parse(content);
    return content;
  } catch (_) {
    console.warn("⚠ GPT-4 output invalid JSON, attempting repair…");
  }

  // Attempt repair
  const repairResponse = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    messages: [
      { role: "system", content: "Fix the following into VALID JSON. Return JSON ONLY." },
      { role: "user", content }
    ]
  });

  const repaired = repairResponse.choices[0]?.message?.content ?? "";

  try {
    JSON.parse(repaired);
    return repaired;
  } catch (_) {
    console.error("❌ Second repair attempt failed — returning raw string.");
    return repaired;
  }
}
