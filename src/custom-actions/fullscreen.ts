import type { Page } from "playwright-core";
import { z } from "zod";
import { ActionContext, ActionOutput, AgentActionDefinition } from "@/types";
import { getCDPClientForPage, setWindowState } from "../cdp";

export async function fullscreenWindow(page: Page) {
  try {
    const client = await getCDPClientForPage(page);
    const actual = await setWindowState(client, "fullscreen");
    if (actual !== "fullscreen") {
      return { success: false, message: `Asked Chrome to go fullscreen, but the window is actually "${actual}" - it didn't apply. Usually means Chrome wasn't the focused window when the request went out.` };
    }
    return { success: true, message: "Window is now fullscreen." };
  } catch (err) {
    return { success: false, message: `Couldn't fullscreen the window: ${(err as Error).message}` };
  }
}

export async function unfullscreenWindow(page: Page) {
  try {
    const client = await getCDPClientForPage(page);
    const actual = await setWindowState(client, "normal");
    if (actual !== "normal") {
      return { success: false, message: `Asked to exit fullscreen, but the window is actually "${actual}".` };
    }
    return { success: true, message: "Exited fullscreen." };
  } catch (err) {
    return { success: false, message: `Couldn't exit fullscreen: ${(err as Error).message}` };
  }
}

export const FullscreenActionParams = z.object({
  exit: z.boolean().nullable().describe("Set true to exit fullscreen instead of entering it. Set null to enter fullscreen."),
});
export type FullscreenActionParamsType = typeof FullscreenActionParams;

export const FullscreenAction = (): AgentActionDefinition<FullscreenActionParamsType> => ({
  type: "FullscreenActionParams",
  toolName: "fullscreen_window",
  toolDescription: "Make the browser window fullscreen, or exit fullscreen if exit is true.",
  actionParams: FullscreenActionParams,
  run: async (ctx: ActionContext, params): Promise<ActionOutput> =>
    params.exit ? unfullscreenWindow(ctx.page) : fullscreenWindow(ctx.page),
});