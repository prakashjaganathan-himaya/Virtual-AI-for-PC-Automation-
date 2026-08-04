import type { Page } from "playwright-core";
import { z } from "zod";
import { ActionContext, ActionOutput, AgentActionDefinition } from "@/types";

const KNOWN_SITES: Record<string, string> = {
  youtube: "https://www.youtube.com",
  twitter: "https://x.com",
  x: "https://x.com",
  github: "https://github.com",
  reddit: "https://www.reddit.com",
  gmail: "https://mail.google.com",
  amazon: "https://www.amazon.com",
  netflix: "https://www.netflix.com",
  spotify: "https://open.spotify.com",
  linkedin: "https://www.linkedin.com",
  whatsapp: "https://web.whatsapp.com",
  instagram: "https://www.instagram.com",
  discord: "https://discord.com/app",
  wikipedia: "https://www.wikipedia.org",
};

function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

function closestKnownSite(name: string): string | null {
  let best: string | null = null;
  let bestDist = Infinity;
  for (const key of Object.keys(KNOWN_SITES)) {
    const dist = levenshtein(name, key);
    if (dist < bestDist) { bestDist = dist; best = key; }
  }
  const tolerance = name.length <= 4 ? 1 : 2;
  return bestDist <= tolerance ? best : null;
}

export function resolveWebsiteTarget(target: string): { url: string; matched: boolean } {
  const clean = target.trim().toLowerCase().replace(/\.(com|org|net|io|in)$/, "");

  if (KNOWN_SITES[clean]) return { url: KNOWN_SITES[clean], matched: true };

  const fuzzy = closestKnownSite(clean);
  if (fuzzy) return { url: KNOWN_SITES[fuzzy], matched: true };

  if (/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(target.trim())) {
    return { url: `https://${target.trim()}`, matched: true };
  }

  return { url: `https://www.${clean}.com`, matched: false };
}

export async function openWebsite(page: Page, target: string) {
  try {
    const { url, matched } = resolveWebsiteTarget(target);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15_000 });
    return {
      success: true,
      message: matched ? `Opened ${target}.` : `Opened ${url} as a best guess for "${target}".`,
    };
  } catch (err) {
    return { success: false, message: `Couldn't open "${target}": ${(err as Error).message}` };
  }
}

export const OpenWebsiteActionParams = z.object({
  target: z.string().describe("The name or URL of the website to open, e.g. 'twitter' or 'github.com'."),
});
export type OpenWebsiteActionParamsType = typeof OpenWebsiteActionParams;

export const OpenWebsiteAction = (): AgentActionDefinition<OpenWebsiteActionParamsType> => ({
  type: "OpenWebsiteActionParams",
  toolName: "open_website",
  toolDescription: "Open a website by name or URL - no multi-step task needed.",
  actionParams: OpenWebsiteActionParams,
  run: async (ctx: ActionContext, params): Promise<ActionOutput> => openWebsite(ctx.page, params.target),
});