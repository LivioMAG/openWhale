import { setState, state } from "./core/state.js";
import { getSession } from "./services/authService.js";
import { bindAuthEvents, bindDashboardEvents, bindGlobalEvents, hydrateDashboard } from "./ui/events.js";
import { renderAppbar, renderAuthView, renderDashboard } from "./ui/render.js";

let currentUser = null;

function getUser() {
  return currentUser;
}

async function refreshSession() {
  try {
    const session = await getSession();
    currentUser = session?.user || null;
    setState({ session, feedback: null, currentView: session ? "dashboard" : "login" });
  } catch (error) {
    currentUser = null;
    setState({ session: null, currentView: "login", feedback: { type: "error", message: error.message } });
  }

  renderAppbar();
  if (state.session && state.currentView === "dashboard") {
    await hydrateDashboard(getUser);
    renderDashboard(getUser());
  } else {
    renderAuthView();
  }
}

bindGlobalEvents(getUser, refreshSession);
bindAuthEvents(refreshSession);
bindDashboardEvents(getUser);
await refreshSession();
