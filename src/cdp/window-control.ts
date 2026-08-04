import { CDPClient } from "./types";

export type WindowState = "normal" | "maximized" | "minimized" | "fullscreen";

export async function setWindowState(client: CDPClient, state: WindowState): Promise<WindowState> {
  const { windowId } = await client.rootSession.send<{ windowId: number }>(
    "Browser.getWindowForTarget",
    {}
  );
  await client.rootSession.send("Browser.setWindowBounds", {
    windowId,
    bounds: { windowState: state },
  });

  // Chrome can accept this with no error and still not actually change the
  // window - don't trust "no exception", check what state it's really in.
  const after = await client.rootSession.send<{ bounds: { windowState: WindowState } }>(
    "Browser.getWindowForTarget",
    {}
  );
  return after.bounds.windowState;
}