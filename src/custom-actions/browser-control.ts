import { z } from "zod";
import { ActionContext, ActionOutput, AgentActionDefinition } from "@/types";
import { Page } from "playwright-core";

export async function scrollPage(page: Page, direction: "up" | "down" = "down") {
  try {
    const { width, height } = await page.evaluate(() => ({
      width: window.innerWidth,
      height: window.innerHeight,
    }));
    await page.mouse.move(width / 2, height / 2);
    const deltaY = direction === "down" ? 600 : -600;
    await page.mouse.wheel(0, deltaY);
    return { success: true, message: `Scrolled ${direction}.` };
  } catch (err) {
    return { success: false, message: `Couldn't scroll: ${(err as Error).message}` };
  }
}

export async function openNewTab(page: Page, url?: string | null) {
  try {
    const context = page.context();
    const newPage = await context.newPage();
    if (url) {
      const target = url.startsWith("http") ? url : `https://${url}`;
      await newPage.goto(target, { waitUntil: "domcontentloaded" });
    }
    return { success: true, message: url ? `Opened a new tab at ${url}.` : "Opened a new tab." };
  } catch (err) {
    return { success: false, message: `Couldn't open a new tab: ${(err as Error).message}` };
  }
}

export async function closeTab(page: Page) {
  try {
    const context = page.context();
    const remainingBeforeClose = context.pages().length;
    await page.close();
    if (remainingBeforeClose <= 1) {
      await context.newPage();
    }
    return { success: true, message: "Closed the tab." };
  } catch (err) {
    return { success: false, message: `Couldn't close the tab: ${(err as Error).message}` };
  }
}

export const ScrollActionParams = z.object({
  direction: z.enum(["up", "down"]).describe("Which way to scroll."),
});
export type ScrollActionParamsType = typeof ScrollActionParams;
export const ScrollAction = (): AgentActionDefinition<ScrollActionParamsType> => ({
  type: "ScrollActionParams",
  toolName: "scroll_page",
  toolDescription: "Scroll the current page up or down.",
  actionParams: ScrollActionParams,
  run: async (ctx: ActionContext, params): Promise<ActionOutput> => scrollPage(ctx.page, params.direction),
});

export const NewTabActionParams = z.object({
  url: z.string().nullable().describe("Site to open in the new tab, e.g. 'google.com'. Set null to just open a blank tab."),
});
export type NewTabActionParamsType = typeof NewTabActionParams;
export const NewTabAction = (): AgentActionDefinition<NewTabActionParamsType> => ({
  type: "NewTabActionParams",
  toolName: "open_new_tab",
  toolDescription: "Open a new browser tab, optionally navigating to a site.",
  actionParams: NewTabActionParams,
  run: async (ctx: ActionContext, params): Promise<ActionOutput> => openNewTab(ctx.page, params.url),
});

export const CloseTabActionParams = z.object({});
export type CloseTabActionParamsType = typeof CloseTabActionParams;
export const CloseTabAction = (): AgentActionDefinition<CloseTabActionParamsType> => ({
  type: "CloseTabActionParams",
  toolName: "close_tab",
  toolDescription: "Close the current browser tab.",
  actionParams: CloseTabActionParams,
  run: async (ctx: ActionContext): Promise<ActionOutput> => closeTab(ctx.page),
});