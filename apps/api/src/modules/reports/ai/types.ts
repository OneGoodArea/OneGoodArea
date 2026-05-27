export interface AiProvider {
  generateNarrative(prompt: string): Promise<string>;
}
