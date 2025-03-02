import { Message } from '../types';

export async function sendMessage(model: string, messages: Message[], signal?: AbortSignal, apiKey?: string) {
  // Use the provided API key, or fall back to the environment variable
  // If no API key is provided and no environment variable is set, throw an error
  const OPENROUTER_API_KEY = apiKey || import.meta.env.VITE_OPENROUTER_API_KEY;
  
  if (!OPENROUTER_API_KEY) {
    throw new Error('No API key provided. Please add your OpenRouter API key in your profile settings.');
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.href,
      'X-Title': 'ChatGPT Clone'
    },
    body: JSON.stringify({
      model,
      messages
    }),
    signal
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Failed to send message');
  }

  const data = await response.json();
  return data.choices[0].message;
}

export async function analyzePdf(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        // This is a simplified implementation
        // In a real app, you might want to use a PDF parsing library or send to a backend
        const text = `PDF Analysis: ${file.name} (${Math.round(file.size / 1024)} KB)`;
        resolve(text);
      } catch (error) {
        reject(new Error('Failed to analyze PDF'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read PDF file'));
    };
    
    reader.readAsArrayBuffer(file);
  });
}

export async function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/auth/key', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    return response.ok;
  } catch (error) {
    console.error('Error validating API key:', error);
    return false;
  }
}