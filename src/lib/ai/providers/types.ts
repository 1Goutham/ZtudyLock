import type { AiResponse } from "../contracts";

export interface CompletionOptions {
  system: string;
  prompt: string;
  /** Ask the provider for a JSON object; parsing is still tolerant. */
  json?: boolean;
  temperature?: number;
  maxOutputTokens?: number;
  /** Inline images (base64) for providers that support vision. */
  images?: { mime: string; data: string }[];
}

export interface ProviderStatus {
  id: ProviderId;
  label: string;
  signupUrl: string;
  configured: boolean;
  model: string | null;
  note?: string;
}

export type ProviderId = "gemini" | "groq" | "openrouter" | "custom";

export interface Provider {
  id: ProviderId;
  label: string;
  signupUrl: string;
  supportsImages: boolean;
  configured(): boolean;
  complete(opts: CompletionOptions): Promise<AiResponse<string> & { model?: string }>;
  status(): Promise<ProviderStatus>;
}
