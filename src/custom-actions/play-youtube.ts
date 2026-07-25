import { z } from "zod";
import { ActionContext, ActionOutput, AgentActionDefinition } from "@/types";
import { Page } from "playwright-core";

async function skipYouTubeAds(page: Page, maxWaitMs = 90_000) {
  const deadline = Date.now() + maxWaitMs;
  const skipSelectors = [
    ".ytp-ad-skip-button-modern",
    ".ytp-ad-skip-button",
    ".ytp-skip-ad-button",
  ];

  while (Date.now() < deadline) {
    const adShowing = await page.locator(".ad-showing, .ytp-ad-player-overlay").count();
    if (adShowing === 0) return;

    let clicked = false;
    for (const sel of skipSelectors) {
      const btn = page.locator(sel).first();
      if (await btn.isVisible().catch(() => false)) {
        await btn.click({ timeout: 2000 }).catch(() => {});
        clicked = true;
        break;
      }
    }
    if (!clicked) {
      const textBtn = page.getByText(/skip ad/i).first();
      if (await textBtn.isVisible().catch(() => false)) {
        await textBtn.click({ timeout: 2000 }).catch(() => {});
      }
    }
    await page.waitForTimeout(1000);
  }
}

async function goFullscreen(page: Page, maxWaitMs = 8_000) {
  try {
    const player = page.locator(".html5-video-player").first();
    const fullscreenBtn = page.locator(".ytp-fullscreen-button").first();

    await player.hover({ timeout: 2000 }).catch(() => {});
    // waitFor actually polls until the button shows up - isVisible() doesn't,
    // it checks once and returns instantly no matter what timeout you give it
    await fullscreenBtn.waitFor({ state: "visible", timeout: maxWaitMs });
    await fullscreenBtn.click({ timeout: 2000 });
  } catch {
    // not critical - don't fail the whole action over fullscreen
  }
}

export async function playYouTube(page: Page, query: string) {
  try {
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    await page.goto(url, { waitUntil: "domcontentloaded" });

    const firstResult = page.locator("ytd-video-renderer a#video-title").first();
    await firstResult.waitFor({ state: "visible", timeout: 8000 });
    await firstResult.click();
    await page.waitForSelector("video", { timeout: 8000 });
    await skipYouTubeAds(page);
    await goFullscreen(page);

    return { success: true, message: `Playing "${query}" on YouTube.` };
  } catch (err) {
    return { success: false, message: `Couldn't play "${query}": ${(err as Error).message}` };
  }
}


export const PlayYouTubeActionParams = z.object({
  query: z.string().describe("What to search for and play on YouTube."),
});
export type PlayYouTubeActionParamsType = typeof PlayYouTubeActionParams;

export const PlayYouTubeAction = (): AgentActionDefinition<PlayYouTubeActionParamsType> => ({
  type: "PlayYouTubeActionParams",
  toolName: "play_youtube",
  toolDescription: "Search YouTube for a query and play the first result. Use whenever the user asks to play a song, video, or music on YouTube.",
  actionParams: PlayYouTubeActionParams,
  run: async (ctx: ActionContext, params): Promise<ActionOutput> => {
    const result = await playYouTube(ctx.page, params.query);
    ctx.invalidateDomCache();
    return result;
  },
});