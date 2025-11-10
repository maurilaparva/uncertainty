import { pipeline } from '@huggingface/transformers';
export async function loadPhi3() {
  // Load the small Phi-3 model for browser/WebGPU inference
  const generator = await pipeline(
    'text-generation',
    'Xenova/Phi-3-mini-4k-instruct',
    { device: 'webgpu' }
  );

  // Return a function for inference
  return async (prompt: string, opts: { max_new_tokens?: number } = {}) => {
    const output = await generator(prompt, {
      max_new_tokens: opts.max_new_tokens ?? 400,
      temperature: 0.7,
      do_sample: true,
    });
    return output[0]?.generated_text || '';
  };
}
