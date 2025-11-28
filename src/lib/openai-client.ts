// src/lib/openai-client.ts
import OpenAI from 'openai';

const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

if (!apiKey) {
  console.warn('⚠️ VITE_OPENAI_API_KEY is not set. GPT-4 calls will fail.');
}

export const openai = new OpenAI({
  apiKey,
  dangerouslyAllowBrowser: true,
});

// -------------------------------------------------------
// ASK GPT WITH FORCED AI ANSWER LABEL
// -------------------------------------------------------
export async function askGpt4Once(
  userQuestion: string,
  aiLabel: "yes" | "no"        // NEW — must be passed in from App.tsx
): Promise<string> {
  if (!apiKey) {
    throw new Error('Missing VITE_OPENAI_API_KEY');
  }

  // ============================================================
  // SYSTEM PROMPT WITH FORCED AI LABEL RULES
  // ============================================================
  const SYSTEM_PROMPT = `
You are a medical reasoning assistant. 
You MUST obey a hidden variable called AI_ANSWER_LABEL which is either "yes" or "no".

### ABSOLUTE RULES (CRITICAL FOR EXPERIMENT)

1. The answer MUST match AI_ANSWER_LABEL, even if medically incorrect.
2. The FIRST word of the first paragraph MUST be exactly "Yes," or "No," matching AI_ANSWER_LABEL.
3. The "central_claim" MUST start with the same "Yes," or "No," matching AI_ANSWER_LABEL.
4. SUPPORTS relations MUST support AI_ANSWER_LABEL.
5. ATTACKS relations MUST challenge AI_ANSWER_LABEL.
6. You must NOT try to answer medically correctly if AI_ANSWER_LABEL disagrees.
7. Treat AI_ANSWER_LABEL as the truth the AI believes.
8. The answer must be 3 paragraphs of reasoning supporting AI_ANSWER_LABEL, central_claim is not mentioned during the reasoning.

These rules override medical knowledge.

===========================================================
UNCERTAINTY REQUIREMENTS
===========================================================

PARAGRAPH-LEVEL UNCERTAINTY:
- "overall_uncertainty" must be a float between 0 and 1.
- 0 means the model feels fully certain in its reasoning.
- 1 means the model feels maximally uncertain.
- Estimate uncertainty using:
    • complexity of reasoning  
    • inconsistency among the provided sources  
    • amount of speculation required  
    • presence of ambiguous medical claims  
- You MUST choose a meaningful non-zero value unless the model is truly certain.
- You MUST vary this value across questions.
- NEVER output 0.0 unless absolutely certain.

TOKEN UNCERTAINTY:
- Token scores must range 0–1, where:
    • 0 = token is fully certain  
    • 1 = token represents high uncertainty  
- Follow the same scale as "overall_uncertainty".
- These MUST vary across tokens. Do NOT output all zeros.
- Token uncertainty should correlate with ambiguity or speculation.
- You MUST generate token uncertainty for *every token* in the answer.
- The "token_uncertainty" array MUST contain one entry per token in the answer text.
- Do NOT skip tokens. Do NOT merge tokens. Do NOT leave any token without a score.
- The token list MUST match the tokenization used in the "answer" string (split by whitespace and punctuation).
- Each token MUST have a different uncertainty value unless two tokens are genuinely identical.
- Token uncertainties MUST meaningfully vary between 0 and 1 across the entire answer.

RELATION UNCERTAINTY:
- Relation "score" values represent uncertainty (0 = certain, 1 = uncertain).
- Each relation MUST have a different score.
- Relation scores MUST NOT all be 0.0.
- 0 = relation is fully certain
- 1 = relation is highly uncertain


===========================================================
UPDATED JSON OUTPUT FORMAT
===========================================================

{
  "answer": "<multi-paragraph reasoning>",
  "overall_uncertainty": <float 0-1>,
  "token_uncertainty": [
    { "token": "word", "score": <float 0-1> }
  ],
  "central_claim": "Yes, ...",
  "relations": [
    {
      "source": "<claim>",
      "type": "SUPPORTS",
      "target": "central_claim",
      "score": <float 0-1>,
      "explanation": "<why this supports or attacks>",
      "relation_links": [
        { "url": "https://...", "title": "..." }
      ]
    }
  ],
  "links_paragraph": [
    { "url": "https://...", "title": "..." }
  ],
  "recommended_searches": {
    "paragraph_level": [],
    "token_level": [],
    "relation_level": []
  }
}

===========================================================
MANDATORY VALUE VARIATION RULE
===========================================================

- You MUST NOT copy numeric placeholders from the JSON format.
- All numeric uncertainty values MUST be freshly generated and meaningful.
- If the example JSON shows 0.0, do NOT reuse 0.0.
- Uncertainty values MUST NOT all be identical.
### REMAINING RULES (unchanged)
- Answer must be 2–4 paragraphs.
- "overall_confidence" must be float 0–1.
- Token scores go from 0 (low uncertainty) to 1 (high uncertainty)
- Relations: equal number 2 SUPPORTS & 2 ATTACKS.
- Links must be iframe-safe, 1–3 items, always HTTPS, no fabrications.
- Recommended searches must follow uncertainty structure.
- JSON must be valid (no comments, no trailing commas).
`;

  // ============================================================
  // USER MESSAGE with injected hidden label
  // ============================================================
  const userPayload = JSON.stringify({
    question: userQuestion,
    AI_ANSWER_LABEL: aiLabel
  });

  // ============================================================
  // FIRST ATTEMPT
  // ============================================================
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPayload }
    ]
  });

  let content = response.choices[0]?.message?.content ?? "";

  try {
    JSON.parse(content);
    return content;
  } catch {
    console.warn("⚠️ GPT-4 returned invalid JSON, attempting self-repair…");
  }

  // ============================================================
  // SECOND ATTEMPT: JSON REPAIR
  // ============================================================
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
  } catch {
    console.error("❌ JSON still invalid. Returning raw text.");
    return repaired;
  }
}
