import { UserInteractionAction } from "./user-interaction";
import { PlayYouTubeAction, playYouTube } from "./play-youtube";
import { OpenWebsiteAction, openWebsite, resolveWebsiteTarget } from "./open-website";
import { FullscreenAction, fullscreenWindow, unfullscreenWindow } from "./fullscreen";

export {
  UserInteractionAction, PlayYouTubeAction, playYouTube,
  OpenWebsiteAction, openWebsite, resolveWebsiteTarget,
  FullscreenAction, fullscreenWindow, unfullscreenWindow,
};
export { ScrollAction, NewTabAction, CloseTabAction, scrollPage, openNewTab, closeTab } from "./browser-control";
export { WhatsAppAction, sendWhatsAppMessage } from "./whatsapp-message";