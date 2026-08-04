import { z } from "zod";
import { ActionContext, ActionOutput, AgentActionDefinition } from "@/types";
import { Page } from "playwright-core";

export async function sendWhatsAppMessage(page: Page, contact: string, message: string) {
  try {
    // 1. Make sure we are on WhatsApp Web
    if (!page.url().includes("web.whatsapp.com")) {
      await page.goto("https://web.whatsapp.com/", { waitUntil: "domcontentloaded" });
    }

    // 2. Wait for WhatsApp search box to load
    // Using a broad selector that works on most WhatsApp Web versions
    const searchBox = page.locator('div[role="textbox"][contenteditable="true"]').first();
    await searchBox.waitFor({ state: "visible", timeout: 30000 });

    // 3. Search for the contact
    await searchBox.click();
    await page.keyboard.type(contact, { delay: 50 });
    await page.waitForTimeout(1500); // Wait for search results to filter

    // 4. Press Enter to open the first chat
    await page.keyboard.press("Enter");
    
    // 5. Wait for the chat input box to appear
    const chatBox = page.locator('div[role="textbox"][contenteditable="true"][data-tab="10"]').first();
    if (!await chatBox.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Fallback to the last textbox if the specific tab index fails
      const allBoxes = page.locator('div[role="textbox"][contenteditable="true"]');
      const count = await allBoxes.count();
      const fallbackBox = await allBoxes.nth(count - 1).isVisible().catch(() => false);
      if (fallbackBox) {
        await allBoxes.nth(count - 1).click();
      } else {
        throw new Error("Chat box not found.");
      }
    } else {
      await chatBox.click();
    }

    // 6. Type the message and press Enter to send
    await page.keyboard.type(message, { delay: 20 });
    await page.keyboard.press("Enter"); // THIS SENDS THE MESSAGE

    return { success: true, message: `Sent WhatsApp message to ${contact}: "${message}"` };
  } catch (err) {
    return { success: false, message: `Couldn't send WhatsApp message: ${(err as Error).message}` };
  }
}

export const WhatsAppActionParams = z.object({
  contact: z.string().describe("The name of the contact to message."),
  message: z.string().describe("The message to send."),
});
export type WhatsAppActionParamsType = typeof WhatsAppActionParams;

export const WhatsAppAction = (): AgentActionDefinition<WhatsAppActionParamsType> => ({
  type: "WhatsAppActionParams",
  toolName: "send_whatsapp_message",
  toolDescription: "Opens WhatsApp Web, finds a contact, and types a message into the chat box.",
  actionParams: WhatsAppActionParams,
  run: async (ctx: ActionContext, params): Promise<ActionOutput> => {
    const result = await sendWhatsAppMessage(ctx.page, params.contact, params.message);
    ctx.invalidateDomCache();
    return result;
  },
});