import Anthropic from "@anthropic-ai/sdk";

// ─── Tier-pinned Claude model resolution ─────────────────────────────────────
//
// The app's AI features (quote review, walkthrough extraction) run on the
// Sonnet tier — a deliberate quality/cost balance. We do NOT want to ride the
// top Opus/Fable tier, and we do NOT want to silently jump to a newer model the
// day it ships. We want exactly one thing: when Anthropic retires the Sonnet
// snapshot we're on, keep working by moving to the *current equivalent-tier*
// model automatically, instead of hard-failing with a 404.
//
// How it works:
//   * Normal path uses MODEL below (overridable via env) — no extra API calls.
//   * Only when a call returns "model not found" (the snapshot was deprecated
//     and has now been retired) do we ask the Models API for the newest model
//     of the SAME tier, cache it for this server instance, and retry once.
//
// To pin or bump the model immediately without a code change, set
// ANTHROPIC_SONNET_MODEL in the environment (e.g. Vercel) and redeploy.

// Substring that identifies our tier in a model id (e.g. "claude-sonnet-4-6").
const TIER = "sonnet";

// Preferred snapshot. Env override wins so ops can pin/bump without a deploy.
const DEFAULT_MODEL = process.env.ANTHROPIC_SONNET_MODEL || "claude-sonnet-4-6";

// Resolved model is cached for the life of the (warm) serverless instance so a
// retirement triggers at most one Models API lookup, not one per request. A
// cold start resets it back to DEFAULT_MODEL.
let resolvedModel: string | null = null;

function isModelNotFound(err: unknown): boolean {
  // A retired/unknown model id comes back as a 404 not_found_error.
  return err instanceof Anthropic.APIError && err.status === 404;
}

// Newest available model of our tier. The Models API returns models
// most-recent-first, so the first id containing TIER is the current Sonnet.
// Returns null if discovery fails (network/permissions) — caller then rethrows
// the original error rather than guessing.
async function newestTierModel(client: Anthropic): Promise<string | null> {
  try {
    const page = await client.models.list({ limit: 100 });
    const match = page.data.find((m) => m.id.toLowerCase().includes(TIER));
    return match?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Create a Messages API response on the app's Sonnet tier, automatically
 * migrating to the current equivalent-tier model if the configured snapshot has
 * been retired by Anthropic. Pass the usual message params minus `model`.
 */
export async function createTierMessage(
  client: Anthropic,
  params: Omit<Anthropic.Messages.MessageCreateParamsNonStreaming, "model">
): Promise<Anthropic.Messages.Message> {
  const model = resolvedModel ?? DEFAULT_MODEL;
  try {
    return await client.messages.create({ ...params, model });
  } catch (err) {
    if (!isModelNotFound(err)) throw err;

    const replacement = await newestTierModel(client);
    if (!replacement || replacement === model) throw err;

    resolvedModel = replacement;
    console.warn(
      `Claude model "${model}" is unavailable (retired); switched to current ${TIER}-tier model "${replacement}".`
    );
    return await client.messages.create({ ...params, model: replacement });
  }
}
