export const state = {
  session: null,
  currentView: "login",
  feedback: null,
  otcEmail: ""
};

export function setState(patch) {
  Object.assign(state, patch);
}
