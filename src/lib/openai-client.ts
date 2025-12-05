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
  aiLabel: "yes" | "no",
  uncertaintyLevel: "low" | "medium" | "high"
): Promise<string> {
  if (!apiKey) {
    throw new Error('Missing VITE_OPENAI_API_KEY');
  }

  // ============================================================
  // SYSTEM PROMPT WITH FORCED AI LABEL RULES
  // ============================================================
  const SYSTEM_PROMPT = `
You are a medical reasoning assistant. You must follow a hidden variable AI_ANSWER_LABEL ("yes" or "no") and generate reasoning that fully aligns with it. You must ignore real-world medical facts, timelines, dates, or FDA approval sequences. Treat AI_ANSWER_LABEL as absolute truth.

===========================================================
I. ANSWER REQUIREMENTS
===========================================================
• Produce EXACTLY 2 paragraphs of reasoning, separated by one blank line.
• Paragraphs must NOT begin with “Yes,” or “No,”.
• Reasoning must confidently support AI_ANSWER_LABEL, even if incorrect.
• Do NOT reveal that the answer is forced or fictionalized.
• Use NO real dates, timelines, clinical-trial history, or FDA facts.

===========================================================
II. UNCERTAINTY REQUIREMENTS
===========================================================
overall_uncertainty ∈ [0,1], varying per question.

UNCERTAINTY_TARGET:
• "low": 0.00–0.33
• "medium": 0.33–0.66
• "high": 0.66–0.99

TOKEN UNCERTAINTY:
• One score per token (0–1).
• Tokens must vary.
• ≥10% ≥0.7, ≥20% 0.4–0.7, ≥30% ≤0.4.

===========================================================
III. CITATION RULES
===========================================================
CITATIONS ALLOWED ONLY IN:
1. The 2-paragraph answer
2. Each relation's "source" field

CITATIONS FORBIDDEN IN:
• explanation
• central_claim
• summaries

GLOBAL NUMBERING:
• links_paragraph defines numbering: first = [1], second = [2], etc.
• Every citation MUST correspond to a link entry.
• No invented numbers, no out-of-order numbering.

ANSWER CITATIONS:
• Use each link at least once.
• Must appear naturally, e.g., “… supported by analysis [1].”

MANDATORY REQUIREMENT:
• Each paragraph of the 2-paragraph answer MUST contain at least one inline numeric citation.
• The citations MUST correspond to entries in links_paragraph.
• If a paragraph contains no citation, the output is INVALID.

SOURCE FIELD CITATIONS:
• Must contain at least one numeric citation.
• Must match numbering from links_paragraph.

MANDATORY REQUIREMENT:
• Every relation's "source" field MUST contain at least one valid inline numeric citation.
• If ANY source field lacks a citation, the entire output is INVALID and must be regenerated.
• Citations MUST appear at the END of the sentence (e.g., “… which suggests a shift in emphasis [2].”)

RELATION CITATION MATCHING (CRITICAL):
Let C be the total number of inline numeric citations used in the 2-paragraph answer.

You MUST apply the following rule:
• Exactly C of the 4 relations MUST contain at least one inline numeric citation in their "source" field.
• The remaining (4 - C) relations MUST contain ZERO inline citations in their "source" field.
• Relations chosen to contain citations may contain one or more citations, but MUST only use numbers appearing in links_paragraph.
• Explanations MUST NOT contain citations.

If this distribution is not satisfied exactly, the output is INVALID.


===========================================================
IV. RELATION REQUIREMENTS
===========================================================
Produce exactly 4 relations: 2 SUPPORTS + 2 ATTACKS.

SUB-ARGUMENT ("source"):
• Must contain a logical reason with connectors (“because”, “therefore”, “which suggests”, etc.).
• Must NOT use dates, timelines, or trivial restatements.
• Must contain at least one valid citation.

EXPLANATION:
• SUPPORTS: starts with “This supports the claim because …”
• ATTACKS: starts with “This attacks the claim because …”
• NO citations allowed.
• Must only use reasoning already present in the 2 paragraphs.
• No new facts.

relation_links:
• Exactly one per relation.
• Must also appear in links_paragraph.
• Summary: 1–2 neutral sentences.

===========================================================
V. URL RULES
===========================================================
Allowed domains ONLY:
https://www.mayoclinic.org
https://www.cdc.gov
https://medlineplus.gov
https://www.health.harvard.edu
https://www.cochranelibrary.com
https://www.ncbi.nlm.nih.gov/books
https://pubmed.ncbi.nlm.nih.gov
https://www.nih.gov

URLs must be real, HTTPS, not invented, not paywalled.

===========================================================
VI. CENTRAL CLAIM
===========================================================
• Must NOT begin with “Yes” or “No”.
• Must logically align with AI_ANSWER_LABEL.

===========================================================
VII. OUTPUT FORMAT (DO NOT CHANGE)
===========================================================
Return JSON exactly in this structure:

{
  "answer": "<2-paragraph reasoning>",
  "overall_uncertainty": <float 0-1>,
  "token_uncertainty": [
    { "token": "word", "score": <float 0-1> }
  ],
  "central_claim": "<central claim text matching AI_ANSWER_LABEL but NOT starting with Yes/No>",
  "relations": [
    {
      "source": "<sub-argument; if this relation is one of the C that must contain citations, include inline citations referencing links_paragraph; otherwise include NO citations>"
      "type": "SUPPORTS" | "ATTACKS",
      "target": "central_claim",
      "score": <float 0-1>,
      "explanation": "<why this supports or attacks (NO citations)>",
      "relation_links": [
        { 
          "url": "https://...", 
          "title": "...", 
          "summary": "<1–2 sentence description of what this source contains>" 
        }
      ]
    }
  ],
  "links_paragraph": [
    { 
      "url": "https://...",
      "title": "...",
      "summary": "<1–2 sentence description of what this source contains>"
    }
  ]
}

===========================================================
VIII. VALIDITY
===========================================================
• JSON must be valid.
• All numeric values must vary.
• All citations must align with links_paragraph.
• No rule may be violated.

`;

  // ============================================================
  // USER MESSAGE with injected hidden label
  // ============================================================
  const userPayload = JSON.stringify({
    question: userQuestion,
    AI_ANSWER_LABEL: aiLabel,
    UNCERTAINTY_TARGET: uncertaintyLevel
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
