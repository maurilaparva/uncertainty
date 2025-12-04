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

===========================================================
ABSOLUTE RULES (CRITICAL FOR EXPERIMENT)
===========================================================

1. The answer MUST match AI_ANSWER_LABEL, even if medically incorrect.
2. The first paragraph MUST NOT begin with "Yes," or "No,". However, its reasoning must match AI_ANSWER_LABEL.
3. All other paragraphs MUST NOT start with "Yes," or "No,".
4. The "central_claim" MUST NOT begin with "Yes," or "No," but its meaning MUST still align with AI_ANSWER_LABEL.
5. SUPPORTS relations MUST support the AI_ANSWER_LABEL.
6. ATTACKS relations MUST challenge the AI_ANSWER_LABEL.
7. You must NOT attempt medical correctness when AI_ANSWER_LABEL contradicts it.
8. Treat AI_ANSWER_LABEL as the truth the AI believes.
9. The answer must be 2 paragraphs of reasoning supporting AI_ANSWER_LABEL. 
   The central claim is NOT explicitly mentioned in these paragraphs.
10.The answer MUST contain exactly 2 paragraphs separated by a blank line (“\n\n”). 
    Paragraphs may NOT be combined into one block.

These rules override medical knowledge.

===========================================================
UNCERTAINTY REQUIREMENTS
===========================================================

PARAGRAPH-LEVEL UNCERTAINTY:
- "overall_uncertainty" is a float from 0 to 1.
- 0 = fully certain, 1 = maximally uncertain.
- Estimate uncertainty using:
    • complexity of reasoning
    • inconsistency among sources
    • speculation
    • ambiguous medical claims
- Must be non-zero unless absolute certainty is justified.
- Must vary across questions.

TOKEN UNCERTAINTY:
- Token scores are floats 0–1 (0 = certain, 1 = uncertain).
- MUST vary across tokens.
- MUST correlate with ambiguity or speculation.
- One entry per token; no skipping, no merging.
- Distribution of token uncertainties should be normally distributed from 0 to 1, it can be slightly skewed towards lower uncertainty but not heavily skewed.
- There should be high uncertainty (0.7-1.0) on at least 10% of tokens, medium uncertainty (0.4-0.7) on at least 20% of tokens, and low uncertainty (0-0.4) on at least 30% of tokens.

===========================================================
RELATION REQUIREMENTS (SUPPORTS & ATTACKS)
===========================================================

DEFINITION OF A SUB-ARGUMENT:
-A sub-argument is **not** a fact or a restatement.
-A sub-argument is a *reason* (logical or causal) that makes the claim more or less believable.
-It MUST include a connector such as:
“because”, “since”, “therefore”, “which suggests”, “as a result”, “this implies”, 
“this means that”, “this undermines the idea that”.
-Dates are not allowed as sub-arguments.

SUPPORTING SUB-ARGUMENTS:
- Are NOT required to come from the answer paragraphs.
- MUST be logically coherent reasons why the claim could be true.
- MUST NOT be:
  • timeline facts
  • date comparisons
  • restatements of the claim
  • trivial inversions


ATTACKING SUB-ARGUMENTS:
- MUST NOT be taken from the answer paragraphs.
- MUST be plausible counterarguments someone might raise.
- MUST NOT be simple factual contradictions or the opposite of the claim.

EXPLANATION RULES (CRITICAL):

- For SUPPORTS relations:
    explanation MUST start with exactly:
    “This supports the claim because …”

- For ATTACKS relations:
    explanation MUST start with exactly:
    “This attacks the claim because …”

- Explanations must NOT use the SUPPORT phrasing for ATTACKS, and must NOT use the ATTACK phrasing for SUPPORTS.
- Explanations MUST match the type field exactly.

===========================================================
RELATION EXPLANATION FAIRNESS REQUIREMENT 
===========================================================

To ensure the relation-level condition does not introduce 
information absent from other conditions:

- Every SUPPORT or ATTACK explanation MUST be fully grounded 
  in reasoning that already appears in the 2-paragraph "answer".
- The explanation must NOT introduce new facts, new causal chains, 
  new medical concepts, or new reasoning not stated in the paragraphs.
- All reasoning used in explanations MUST be present in the paragraphs 
  using similar wording.
- Explanations MUST still follow the required templates:
    “This supports the claim because …”
    “This attacks the claim because …”
- Explanations MUST remain concise (one sentence), but their content 
  MUST be traceable to the main answer.
- The paragraphs MUST therefore include all conceptual reasoning 
  needed to justify each SUPPORT and ATTACK relation.

GENERAL RULES:
- Produce exactly 2 SUPPORTS and 2 ATTACKS.
- Each explanation must be one sentence long.
- Relation "score" values (0–1 uncertainty) MUST differ and MUST NOT all be 0.

===========================================================
INLINE CITATION REQUIREMENTS FOR MAIN TEXT (NEW)
===========================================================

The 2-paragraph "answer" MUST include inline numeric citations
in the form [1], [2], [3], ... inside the text.

RULES:
- These numeric citations MUST correspond exactly to the order
  of entries in "links_paragraph".
- The first source in "links_paragraph" MUST be cited as [1],
  the second as [2], and so on.
- Citations MUST appear naturally within the sentences 
  (e.g., “... which is supported by clinical observations [1].”).
- Citations MUST be used at least once per source.
- Citations MUST NOT be invented; they MUST correspond to 
  real entries in "links_paragraph".
- Citations MUST NOT appear in the "central_claim" or the sub-argument text, but may appear in explanations for sub-argument text.
- Citations MUST appear inline exactly as: [1], [2], [3].

"links_paragraph" MUST contain at least as many entries as
the number of citations used.

RELATION EXPLANATION CITATIONS (UPDATED):

- Relation explanations MAY include inline numeric citations like [1], [2], etc.
- Include inline citations in at least one supporting and one attacking argument explanation.
- These citations MUST correspond to entries in "links_paragraph".
- They MUST use the same numbering as the citations inside the 2-paragraph answer.
- Explanations MUST include at least one inline citation.
- Citations MUST appear naturally within the sentence or at the end of the explanation.
- Relation explanations MUST NOT invent citations that do not exist in "links_paragraph".

SOURCE SUMMARY REQUIREMENTS:
-The summary MUST BE 1-2 short sentences.
-The summary MUST describe what information the source contains.
-The summary MUST NOT introduce new facts beyond what the 2-paragraph answer already implies.
-The summary MUST be neutral and factual (not supporting or attacking the claim directly).
-The summary MUST be suitable for display as a tooltip.

OU MUST ALWAYS RETURN THE FIELD "answer".
- "answer" must contain exactly 2 paragraphs of reasoning.


===========================================================
UPDATED JSON OUTPUT FORMAT
===========================================================

{
  "answer": "<2-paragraph reasoning>",
  "overall_uncertainty": <float 0-1>,
  "token_uncertainty": [
    { "token": "word", "score": <float 0-1> }
  ],
  "central_claim": "<central claim text matching AI_ANSWER_LABEL but NOT starting with Yes/No>",
  "relations": [
    {
      "source": "<sub-argument>",
      "type": "SUPPORTS" | "ATTACKS",
      "target": "central_claim",
      "score": <float 0-1>,
      "explanation": "<why this supports or attacks>",
      "relation_links": [
        { "url": "https://...", "title": "..." }
      ]
    }
  ],
  "links_paragraph": [
    { 
    "url": "https://...", 
    "title": "...",
    "summary": "<1–2 sentence description of what this source contains>"
  }
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

- You MUST NOT copy numeric placeholders.
- ALL uncertainty values (paragraph, token, relation) MUST vary meaningfully.
- Values MUST NOT be identical.

===========================================================
OTHER RULES
===========================================================

- Answer must be 2 paragraphs total.
- "overall_confidence" must remain a float 0–1 (alias for uncertainty).
- Relations: exactly 2 SUPPORTS & 2 ATTACKS.
- Links must be iframe-safe HTTPS.
- JSON must be valid.
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
