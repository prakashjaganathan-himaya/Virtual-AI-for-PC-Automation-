import { z } from "zod";
import { ActionContext, ActionOutput, AgentActionDefinition } from "@/types";

export const PlayYouTubeActionParams = z.object({
  query: z
    .string()
    .describe(
      "What to search for and play on YouTube, e.g. 'lofi hip hop radio' or an artist/song name."
    ),
});

export type PlayYouTubeActionParamsType = typeof PlayYouTubeActionParams;

export const PlayYouTubeAction = (): AgentActionDefinition<PlayYouTubeActionParamsType> => {
  return {
    type: "PlayYouTubeActionParams",
    toolName: "play_youtube",
    toolDescription:
      "Search YouTube for a query and play the first result. Use whenever the user asks to play a song, video, or music on YouTube.",
    actionParams: PlayYouTubeActionParams,
    run: async (
      ctx: ActionContext,
      params: z.infer<PlayYouTubeActionParamsType>
    ): Promise<ActionOutput> => {
      const { query } = params;
      const { page } = ctx;

      try {
        const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
        await page.goto(url, { waitUntil: "domcontentloaded" });

        const firstResult = page.locator("ytd-video-renderer a#video-title").first();
        await firstResult.waitFor({ state: "visible", timeout: 8000 });
        await firstResult.click();
        await page.waitForSelector("video", { timeout: 8000 });

        return { success: true, message: `Playing "${query}" on YouTube.` };
      } catch (err) {
        return {
          success: false,
          message: `Couldn't play "${query}" on YouTube: ${(err as Error).message}`,
        };
      } finally {
        // navigated + clicked outside the normal step loop - invalidate
        // whatever DOM/a11y state was cached before this ran
        ctx.invalidateDomCache();
      }
    },
  };
};