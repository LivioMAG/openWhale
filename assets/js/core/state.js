export const state = {
  session: null,
  currentView: "login",
  feedback: null,
  otcEmail: "",
  dashboardSection: "image-generation",
  orders: [],
  templates: [],
  activeOrderId: null,
  orderCreationOpen: false,
  tagQuery: "",
  selectedTemplateId: null,
  uploadedImageName: "",
  loading: {
    orders: false,
    templates: false,
    creatingOrder: false
  }
};

export function setState(patch) {
  Object.assign(state, patch);
}
