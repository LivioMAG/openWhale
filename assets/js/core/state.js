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
  uploadedImagePath: "",
  templateModalOpen: false,
  templateModalMode: "create",
  templateEditingId: null,
  templateDraft: {
    note: "",
    tag: "",
    color: "#E8F8F0"
  },
  loading: {
    orders: false,
    templates: false,
    creatingOrder: false
  }
};

export function setState(patch) {
  Object.assign(state, patch);
}
