/** Default: Claude Sonnet 4.5 (pinned snapshot). Override with ANTHROPIC_MODEL in .env.local */
export const ANTHROPIC_MODEL =
  process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-5-20250929";
