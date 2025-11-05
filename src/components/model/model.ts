import { pipeline } from '@huggingface/transformers';
export async function loadMistral() {
  return await pipeline('text-generation', 'mistralai/Mistral-7B-Instruct-v0.3', {
    device: 'webgpu',
  });
}
