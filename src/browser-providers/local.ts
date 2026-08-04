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
  const {
    args: extraArgs,
    userDataDir,
    executablePath,
    ...restOptions
  } = (this.options ?? {}) as any;

  const profile =
    userDataDir ||
    path.join(
      os.homedir(),
      "AppData",
      "Local",
      "Google",
      "Chrome",
      "User Data"
    );
this.browserContext = await chromium.launchPersistentContext(userDataDir, {
  ...restOptions,

  headless: false,

  executablePath:
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",

  ignoreDefaultArgs: ["--enable-automation"],

  args: [
    "--start-maximized",
    "--disable-blink-features=AutomationControlled",
    "--disable-infobars",
    "--no-first-run",
    "--no-default-browser-check",
    "--profile-directory=Default",

    ...(extraArgs ?? []),
  ],
});
this.session = this.browserContext.browser() as Browser;

const page = this.browserContext.pages()[0];

await page.addInitScript(() => {
  Object.defineProperty(navigator, "webdriver", {
    get: () => undefined,
  });
});

return this.session;
}
}