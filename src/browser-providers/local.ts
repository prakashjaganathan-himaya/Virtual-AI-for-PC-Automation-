import { chromium, Browser, BrowserContext, LaunchOptions } from "playwright-core";
import BrowserProvider from "@/types/browser-providers/types";
import * as path from "path";
import * as os from "os";

export class LocalBrowserProvider extends BrowserProvider<Browser> {
  options: Omit<Omit<LaunchOptions, "headless">, "channel"> | undefined;
  session: Browser | undefined;
  private browserContext: BrowserContext | undefined;

  constructor(options?: Omit<Omit<LaunchOptions, "headless">, "channel">) {
    super();
    this.options = options;
  }

  async start(): Promise<Browser> {
    const launchArgs = this.options?.args ?? [];

    // Dedicated automation profile (a COPY) - never your live, in-use Chrome
    const userDataDir = path.join(os.homedir(), 'AppData', 'Local', 'HyperAgent', 'ChromeProfile');

    this.browserContext = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      channel: "chrome",
      executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      args: [
        "--disable-blink-features=AutomationControlled",
        "--profile-directory=Default",
        ...launchArgs
      ],
    });

    this.session = this.browserContext.browser() as Browser;
    return this.session;
  }
  async close(): Promise<void> {
    return await this.session?.close();
  }
  public getSession() {
    if (!this.session) {
      return null;
    }
    return this.session;
  }
}