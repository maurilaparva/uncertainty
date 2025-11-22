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
  ],
  "links": [
    { "url": "...", "title": "..." }
  ]
}

### REQUIRED RULES ###

#### ANSWER
- The FIRST SENTENCE of the FIRST PARAGRAPH must begin with **“Yes,”** or **“No,”** directly answering the user’s question.
- The “yes” or “no” MUST reflect the same conclusion expressed by the central_claim.
- Must contain **2–4 paragraphs**.
- Must be medically accurate and well reasoned.

#### OVERALL CONFIDENCE
- MUST be a float between 0 and 1.

#### TOKEN UNCERTAINTY
- Include **only tokens/phrases the model is MOST uncertain about**.
- **Every score must be ≥ 0.8**.
- Typically **3–7 tokens**, but fewer allowed if certainty is strong.
- Tokens must be one word only.

#### CENTRAL CLAIM
You MUST output a single field:
  "central_claim": "<the main conclusion of the answer>"

- The central_claim MUST begin with either **“Yes,”** or **“No,”** directly answering the user's question.
- Must be ≤ 12 words total (including the “Yes,” or “No,”).
- Must clearly answer the user's question.
- All relations MUST point toward this claim.

#### RELATIONS (Balanced Argument Set)
You MUST output an array "relations": [
  { "source": "...", "type": "SUPPORTS", "target": "central_claim", "score": 0.0 },
  { "source": "...", "type": "ATTACKS",  "target": "central_claim", "score": 0.0 }
]

Rules:
- Provide 2-6 relations total.
- You MUST output exactly the same number of SUPPORTS and ATTACKS. 
- For example: 2 SUPPORTS + 2 ATTACKS, or 3 SUPPORTS + 3 ATTACKS. 
-You may NOT output uneven counts such as 5 SUPPORTS + 3 ATTACKS.
- Every relation's "target" MUST be exactly the central_claim string.
- "source" must be ≤ 8 words.
- "type" must be SUPPORTS or ATTACKS (uppercase).
- "score" is a float 0–1 representing uncertainty.
- All relations MUST be explicit arguments that directly address the truth or falsehood of the central_claim. 
- Statements that are merely background facts, definitions, or explanations without argumentative force are NOT allowed.
- A SUPPORTS relation must present evidence that directly strengthens, justifies, or explains why the central_claim is true.
- An ATTACKS relation must present evidence that directly challenges, contradicts, or weakens the central_claim.
- Relations MUST be genuine arguments, not unrelated facts or generic statements.

#### SOURCE LINKS
You MUST output a field:
  "links": [
    { "url": "<valid iframe-safe medical URL>", "title": "<short label>" }
  ]

Rules:
- Provide 1–3 links.
- Links must be iframe-safe.
- NEVER fabricate URLs. If uncertain, return an empty array.
- Every link must begin with "https://".
- Titles must be ≤ 10 words.
- **Every link MUST directly support the central_claim.**
- Links must NOT support any ATTACKS relation.
- Links must match known pages only; if uncertain, output: "url": null, "title": null.

#### RELATION UNCERTAINTY RULES
For each relation, "score" MUST represent how uncertain the model is about that specific supporting or attacking claim.
The score reflects the model's internal doubt about the correctness of that argument.

Scores MUST vary — relations cannot all have the same score.
You MUST output exactly the same number of SUPPORTS and ATTACKS, if not possible, then trim down so they are even.
Rules:
- Scores MUST vary. Relations cannot all share the same score.
- 0.0–0.3 → model is highly uncertain this argument is correct
- 0.3–0.6 → model is moderately uncertain
- 0.6–0.85 → model is mostly confident
- 0.85–1.0 → model is extremely confident (very low uncertainty)

No two relation scores may be identical.
Each score must reflect the differing strength of evidence.
If you cannot produce an equal number of SUPPORTS and ATTACKS, you must adjust or rewrite the arguments until the counts match.

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
