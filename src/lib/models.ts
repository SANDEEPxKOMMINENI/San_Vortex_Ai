import { AIModel } from '../types';

export const models: AIModel[] = [
  {
    id: 'google/gemini-2.0-flash-lite-preview-02-05:free',
    name: 'Gemini Flash Lite',
    description: 'Fast and efficient model for general tasks and image analysis',
    supportsImages: true
  },
  {
    id: 'microsoft/phi-3-mini-128k-instruct:free',
    name: 'Phi-3 Mini',
    description: 'Microsoft\'s compact 7B parameter model with 128k context window',
    supportsImages: false
  },
  {
    id: 'microsoft/phi-3-medium-128k-instruct:free',
    name: 'Phi-3 Medium',
    description: 'Microsoft\'s 14B parameter model with 128k context window',
    supportsImages: false
  },
  {
    id: 'cognitivecomputations/dolphin3.0-r1-mistral-24b:free',
    name: 'Dolphin Mistral R1',
    description: 'Advanced language model for complex reasoning',
    supportsImages: false
  },
  {
    id: 'cognitivecomputations/dolphin3.0-mistral-24b:free',
    name: 'Dolphin Mistral',
    description: 'Optimized for natural conversations and analysis',
    supportsImages: false
  },
  {
    id: 'qwen/qwen-vl-plus:free',
    name: 'Qwen VL Plus',
    description: 'Visual language model for image understanding',
    supportsImages: true
  },
  {
    id: 'qwen/qwen2.5-vl-72b-instruct:free',
    name: 'Qwen 2.5 VL',
    description: 'Advanced visual-language model with 72B parameters',
    supportsImages: true
  },
  {
    id: 'google/gemini-2.0-flash-thinking-exp:free',
    name: 'Gemini Flash Thinking',
    description: 'Experimental model focused on analytical thinking',
    supportsImages: true
  },
  {
    id: 'mistralai/mistral-small-24b-instruct-2501:free',
    name: 'Mistral Small',
    description: 'Efficient instruction-following model',
    supportsImages: false
  },
  {
    id: 'deepseek/deepseek-r1-distill-llama-70b:free',
    name: 'DeepSeek R1 Distill',
    description: 'Distilled version of LLaMA for efficient processing',
    supportsImages: false
  },
  {
    id: 'deepseek/deepseek-r1:free',
    name: 'DeepSeek R1',
    description: 'Full version of DeepSeek for complex tasks',
    supportsImages: false
  },
  {
    id: 'sophosympatheia/rogue-rose-103b-v0.2:free',
    name: 'Rogue Rose',
    description: 'Large model optimized for creative tasks',
    supportsImages: false
  },
  {
    id: 'google/gemini-2.0-flash-thinking-exp-1219:free',
    name: 'Gemini Flash Thinking 1219',
    description: 'Latest experimental version of Gemini Flash',
    supportsImages: true
  },
  {
    id: 'google/gemini-2.0-flash-exp:free',
    name: 'Gemini Flash Exp',
    description: 'Experimental version with enhanced capabilities',
    supportsImages: true
  },
  {
    id: 'deepseek/deepseek-chat:free',
    name: 'DeepSeek Chat',
    description: 'Specialized in conversational interactions',
    supportsImages: false
  },
  {
    id: 'google/gemini-exp-1206:free',
    name: 'Gemini Exp 1206',
    description: 'Experimental Gemini model with broad capabilities',
    supportsImages: true
  },
  {
    id: 'meta-llama/llama-3.3-70b-instruct:free',
    name: 'Llama 3.3',
    description: 'Latest Llama model for instruction following',
    supportsImages: false
  },
  {
    id: 'google/learnlm-1.5-pro-experimental:free',
    name: 'LearnLM Pro',
    description: 'Experimental learning-focused model',
    supportsImages: true
  },
  {
    id: 'nvidia/llama-3.1-nemotron-70b-instruct:free',
    name: 'Nemotron',
    description: 'NVIDIA-optimized Llama model',
    supportsImages: false
  }
];