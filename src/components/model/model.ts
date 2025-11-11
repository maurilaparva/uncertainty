import { pipeline } from '@huggingface/transformers';
export async function loadPhi3() {
  console.log("⏳ Loading Phi-3-mini-4k-instruct...");
  const generator = await pipeline(
    "text-generation",
    "Xenova/Phi-3-mini-4k-instruct",
    { device: "webgpu" }
  );
  console.log("✅ Phi3 model loaded");
  return async (prompt: string, opts: { max_new_tokens?: number } = {}) => {
    // ✅ Ensure the input is always a string
    if (typeof prompt !== "string") {
      console.warn("⚠️ Non-string prompt passed to Phi3, coercing to string:", prompt);
      prompt = JSON.stringify(prompt);
      console.log("ℹ️ Coerced prompt:", prompt);
    }

    const output = await generator(prompt, {
      max_new_tokens: opts.max_new_tokens ?? 400,
      temperature: 0.7,
      do_sample: true,
    });

    return output[0]?.generated_text || "";
  };
}
