import { setState, state } from "./core/state.js";
import { getSession } from "./services/authService.js";
import { bindAccountEvents, bindAuthEvents, bindGlobalEvents } from "./ui/events.js";
import { renderAccountSettings, renderAppbar, renderAuthView } from "./ui/render.js";

let currentUser = null;

function getUser() {
  return currentUser;
}

async function refreshSession() {
  try {
    const session = await getSession();
    currentUser = session?.user || null;
    setState({ session, feedback: null, currentView: session ? "account" : "login" });
  } catch (error) {
    currentUser = null;
    setState({ session: null, currentView: "login", feedback: { type: "error", message: error.message } });
  }

  renderAppbar();
  if (state.session && state.currentView === "account") {
    renderAccountSettings(getUser());
  } else {
    renderAuthView();
  }
}

bindGlobalEvents(getUser, refreshSession);
bindAuthEvents(refreshSession);
bindAccountEvents(getUser, refreshSession);
await refreshSession();

window.addEventListener("hashchange", () => {
  if (window.location.hash === "#account" && state.session) {
    setState({ currentView: "account" });
    renderAccountSettings(getUser());
  }
});
