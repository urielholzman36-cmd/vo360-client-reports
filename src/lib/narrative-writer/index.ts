import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT, buildUserPrompt } from "./prompts";
import type { NarrativeInput, NarrativeOutput } from "./types";

const anthropic = new Anthropic();

export async function generateNarrative(
  input: NarrativeInput
): Promise<NarrativeOutput> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: buildUserPrompt(input),
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  const cleaned = text.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");

  const parsed: NarrativeOutput = JSON.parse(cleaned);
  return parsed;
}

export type { NarrativeInput, NarrativeOutput, NarrativeSection } from "./types";
