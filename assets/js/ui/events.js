import { setState, state } from "../core/state.js";
import { isValidEmail, normalizeError, required } from "../core/helpers.js";
import {
  signInWithPassword,
  signUp,
  requestOneTimeCode,
  verifyOneTimeCode,
  updateUserMetadata,
  updatePassword,
  signOut,
  deleteAccount
} from "../services/authService.js";
import {
  applyTemplateToOrder,
  createOrder,
  createTemplate,
  deleteOrderInputImage,
  deleteTemplate,
  listOrders,
  listTemplates,
  updateTemplate,
  uploadOrderInputImage
} from "../services/dashboardService.js";
import { renderAuthView, renderDashboard } from "./render.js";

function setFeedback(type, message) {
  setState({ feedback: { type, message } });
}

function openTemplateModal(mode, template = null) {
  setState({
    templateModalOpen: true,
    templateModalMode: mode,
    templateEditingId: template?.id || null,
    templateDraft: {
      note: template?.note || "",
      tag: template?.tag || "",
      color: template?.color || "#E8F8F0"
    }
  });
}

function closeTemplateModal() {
  setState({
    templateModalOpen: false,
    templateModalMode: "create",
    templateEditingId: null,
    templateDraft: {
      note: "",
      tag: "",
      color: "#E8F8F0"
    }
  });
}

function openRebuildDialog(order, getUser) {
  const dialog = document.createElement("dialog");
  dialog.id = "rebuild-confirm-dialog";
  dialog.className = "confirm-dialog";
  dialog.innerHTML = `<form method="dialog">
    <h3>Rebuild starten?</h3>
    <p class="context-note">Auftrag: ${order?.order_number || "-"}</p>
    <menu>
      <button id="confirm-rebuild" class="btn btn--primary" value="confirm">Rebuild</button>
      <button class="btn btn--ghost" value="cancel">Abbrechen</button>
    </menu>
  </form>`;

  document.body.appendChild(dialog);

  const confirmButton = dialog.querySelector("#confirm-rebuild");
  confirmButton?.addEventListener("click", () => {
    setState({
      feedback: {
        type: "success",
        message: "Rebuild wurde gestartet. Die bestehende Modal-Interaktion bleibt aktiv; Generierungs-Workflow kann hier angedockt werden."
      }
    });
    renderDashboard(getUser());
  });

  dialog.addEventListener("close", () => dialog.remove());
  dialog.showModal();
}

async function refreshDashboardData(getUser) {
  const userId = getUser()?.id;
  if (!userId) return;

  setState({ loading: { ...state.loading, orders: true, templates: true } });
  renderDashboard(getUser());

  try {
    const [orders, templates] = await Promise.all([listOrders(userId), listTemplates(userId)]);
    setState({ orders, templates, feedback: null });
  } catch (error) {
    setFeedback("error", `Supabase-Fehler: ${normalizeError(error)}`);
  } finally {
    setState({ loading: { ...state.loading, orders: false, templates: false } });
    renderDashboard(getUser());
  }
}

export function bindGlobalEvents(getUser, refreshSession) {
  document.getElementById("appbar").addEventListener("click", async (event) => {
    if (event.target.id === "logout-btn") {
      await signOut();
      await refreshSession();
      return;
    }

    if (event.target.id === "appbar-back-order") {
      setState({ activeOrderId: null, selectedTemplateId: null, feedback: null });
      renderDashboard(getUser());
    }
  });

  window.__refreshDashboardData = () => refreshDashboardData(getUser);
}

export function bindAuthEvents(refreshSession) {
  const root = document.getElementById("auth-container");

  root.onclick = async (event) => {
    const id = event.target.id;
    let shouldRerender = false;

    if (id === "goto-register") {
      setState({ currentView: "register", feedback: null });
      shouldRerender = true;
    }

    if (id === "goto-forgot") {
      setState({ currentView: "forgot", feedback: null });
      shouldRerender = true;
    }

    if (id === "back-to-login" || id === "forgot-back-login") {
      setState({ currentView: "login", feedback: null });
      shouldRerender = true;
    }

    if (id === "resend-code") {
      try {
        await requestOneTimeCode(state.otcEmail);
        setFeedback("success", "Code erneut versendet.");
        shouldRerender = true;
      } catch (error) {
        setFeedback("error", normalizeError(error));
        shouldRerender = true;
      }
    }

    if (shouldRerender) renderAuthView();
  };

  root.onsubmit = async (event) => {
    event.preventDefault();
    const form = new FormData(event.target);
    setState({ feedback: null });

    try {
      if (event.target.id === "login-form") {
        const email = form.get("login-email");
        const password = form.get("login-password");
        if (!required(email) || !required(password)) throw new Error("Bitte alle Felder ausfüllen.");
        await signInWithPassword(email, password);
        await refreshSession();
        return;
      }

      if (event.target.id === "register-form") {
        const payload = {
          firstName: form.get("first-name"),
          lastName: form.get("last-name"),
          companyName: form.get("company-name"),
          email: form.get("register-email"),
          password: form.get("register-password"),
          repeatPassword: form.get("register-password-repeat"),
          phone: form.get("phone")
        };

        if (!Object.values(payload).every((v, i) => (i === 6 ? true : required(v)))) {
          throw new Error("Bitte alle Pflichtfelder ausfüllen.");
        }
        if (!isValidEmail(payload.email)) throw new Error("Ungültige E-Mail-Adresse.");
        if (payload.password !== payload.repeatPassword) throw new Error("Passwörter stimmen nicht überein.");

        await signUp(payload);
        setState({ currentView: "login" });
        setFeedback("success", "Registrierung erfolgreich. Bitte prüfe deine E-Mails für die Bestätigung.");
      }

      if (event.target.id === "forgot-form") {
        const email = form.get("forgot-email");
        if (!required(email) || !isValidEmail(email)) throw new Error("Bitte valide E-Mail eingeben.");
        await requestOneTimeCode(email);
        setState({ currentView: "otc", otcEmail: email });
        setFeedback("success", "One-Time-Code wurde versendet.");
      }

      if (event.target.id === "otc-form") {
        const token = form.get("otc-token");
        if (!required(token)) throw new Error("Bitte Code eingeben.");
        await verifyOneTimeCode(state.otcEmail, token);
        await refreshSession();
        return;
      }
    } catch (error) {
      setFeedback("error", normalizeError(error));
    }

    renderAuthView();
  };
}

export function bindDashboardEvents(getUser) {
  const root = document.getElementById("dashboard-container");

  root.onclick = async (event) => {
    const navSection = event.target.dataset?.navSection;
    const orderToOpen = event.target.dataset?.orderOpen;
    const templateToApply = event.target.dataset?.templateApply;
    const templateToEdit = event.target.dataset?.templateEdit;
    const templateToDelete = event.target.dataset?.templateDelete;
    const colorPick = event.target.dataset?.templateColor;

    if (colorPick) {
      setState({ templateDraft: { ...state.templateDraft, color: colorPick } });
      renderDashboard(getUser());
      return;
    }

    if (navSection) {
      setState({ dashboardSection: navSection, feedback: null });
      renderDashboard(getUser());
      return;
    }

    if (event.target.id === "open-order-create") {
      setState({ orderCreationOpen: true, feedback: null });
      renderDashboard(getUser());
      return;
    }

    if (event.target.id === "cancel-order-create") {
      setState({ orderCreationOpen: false });
      renderDashboard(getUser());
      return;
    }

    if (orderToOpen) {
      setState({
        activeOrderId: orderToOpen,
        tagQuery: "",
        uploadedImageName: "",
        uploadedImagePath: "",
        feedback: null,
        templateModalOpen: false
      });
      renderDashboard(getUser());
      return;
    }

    if (event.target.id === "open-template-create-modal") {
      openTemplateModal("create");
      renderDashboard(getUser());
      return;
    }

    if (event.target.id === "template-modal-cancel") {
      closeTemplateModal();
      renderDashboard(getUser());
      return;
    }

    if (event.target.id === "delete-account") {
      try {
        await deleteAccount();
        await signOut();
        window.location.hash = "";
        window.location.reload();
      } catch (error) {
        setFeedback("warning", `${normalizeError(error)} Wenn nicht vorhanden, Edge Function backend/functions/delete-account/index.ts bereitstellen.`);
        renderDashboard(getUser());
      }
      return;
    }

    if (event.target.id === "open-rebuild-modal") {
      const order = state.orders.find((entry) => entry.id === state.activeOrderId);
      openRebuildDialog(order, getUser);
      return;
    }

    if (event.target.id === "remove-input-image") {
      const activeOrder = state.orders.find((entry) => entry.id === state.activeOrderId);
      if (!activeOrder?.input_image) return;

      try {
        const updatedOrder = await deleteOrderInputImage({
          userId: getUser().id,
          orderId: activeOrder.id,
          storagePath: activeOrder.input_image
        });

        setState({
          orders: state.orders.map((entry) => (entry.id === updatedOrder.id ? updatedOrder : entry)),
          feedback: { type: "success", message: "Input-Bild wurde gelöscht." }
        });
      } catch (error) {
        setFeedback("error", `Löschen fehlgeschlagen: ${normalizeError(error)}`);
      }

      renderDashboard(getUser());
      return;
    }

    if (templateToEdit) {
      const template = state.templates.find((entry) => entry.id === templateToEdit);
      if (!template) return;
      openTemplateModal("edit", template);
      renderDashboard(getUser());
      return;
    }

    if (templateToDelete) {
      try {
        await deleteTemplate(getUser().id, templateToDelete);
        setState({
          templates: state.templates.filter((entry) => entry.id !== templateToDelete),
          feedback: { type: "success", message: "Template wurde gelöscht." }
        });
      } catch (error) {
        setFeedback("error", `Template konnte nicht gelöscht werden: ${normalizeError(error)}`);
      }

      renderDashboard(getUser());
      return;
    }

    if (templateToApply) {
      const activeOrder = state.orders.find((entry) => entry.id === state.activeOrderId);
      if (!activeOrder?.input_image) {
        setFeedback("warning", "Upload fehlt: Bitte zuerst ein Input-Bild hochladen.");
        renderDashboard(getUser());
        return;
      }

      try {
        const result = await applyTemplateToOrder({
          userId: getUser().id,
          orderId: activeOrder.id,
          templateId: templateToApply
        });

        setState({
          templates: state.templates.map((entry) => (entry.id === result.template.id ? result.template : entry)),
          feedback: { type: "success", message: "Template wurde auf den Auftrag angewendet." }
        });
      } catch (error) {
        setFeedback("error", `Template konnte nicht angewendet werden: ${normalizeError(error)}`);
      }

      renderDashboard(getUser());
    }
  };

  root.oninput = (event) => {
    if (event.target.id === "tag-filter") {
      setState({ tagQuery: event.target.value });
      renderDashboard(getUser());
    }
  };

  root.onchange = async (event) => {
    if (event.target.id === "photo-upload") {
      const file = event.target.files?.[0];
      const activeOrder = state.orders.find((entry) => entry.id === state.activeOrderId);
      if (!file || !activeOrder) return;

      if (activeOrder.input_image) {
        setFeedback("warning", "Es ist bereits ein Foto für diesen Auftrag vorhanden.");
        event.target.value = "";
        renderDashboard(getUser());
        return;
      }

      try {
        setState({ uploadedImageName: file.name, feedback: null });
        const updatedOrder = await uploadOrderInputImage({
          userId: getUser().id,
          orderId: activeOrder.id,
          file
        });

        setState({
          uploadedImagePath: updatedOrder.input_image || "",
          orders: state.orders.map((entry) => (entry.id === updatedOrder.id ? updatedOrder : entry)),
          feedback: { type: "success", message: "Input-Bild wurde hochgeladen und dem Auftrag zugeordnet." }
        });
      } catch (error) {
        setFeedback("error", `Upload fehlgeschlagen: ${normalizeError(error)}`);
      }

      renderDashboard(getUser());
    }
  };

  root.onsubmit = async (event) => {
    event.preventDefault();
    const form = new FormData(event.target);

    try {
      if (event.target.id === "order-create-form") {
        setState({ loading: { ...state.loading, creatingOrder: true } });
        renderDashboard(getUser());
        const createdOrder = await createOrder(getUser().id, form.get("order-name"));
        setState({
          loading: { ...state.loading, creatingOrder: false },
          orders: [createdOrder, ...state.orders],
          orderCreationOpen: false,
          feedback: { type: "success", message: `Auftrag ${createdOrder.order_number} erstellt.` }
        });
      }

      if (event.target.id === "profile-form") {
        await updateUserMetadata({
          first_name: form.get("acc-first-name"),
          last_name: form.get("acc-last-name"),
          company_name: form.get("acc-company-name"),
          phone: form.get("acc-phone")
        });
        setFeedback("success", "Profil aktualisiert.");
      }

      if (event.target.id === "password-form") {
        const pw = form.get("new-password");
        const repeat = form.get("new-password-repeat");
        if (!required(pw) || !required(repeat)) throw new Error("Bitte beide Passwort-Felder ausfüllen.");
        if (pw !== repeat) throw new Error("Passwörter stimmen nicht überein.");
        await updatePassword(pw);
        setFeedback("success", "Passwort erfolgreich zurückgesetzt.");
      }

      if (event.target.id === "template-modal-form") {
        const payload = {
          note: form.get("template-modal-note"),
          tag: form.get("template-modal-tag"),
          color: form.get("template-modal-color")
        };

        if (!required(payload.note)) throw new Error("Bitte eine Notiz für das Template eingeben.");

        if (state.templateModalMode === "edit" && state.templateEditingId) {
          const updatedTemplate = await updateTemplate(getUser().id, state.templateEditingId, payload);
          setState({
            templates: state.templates.map((entry) => (entry.id === updatedTemplate.id ? updatedTemplate : entry)),
            feedback: { type: "success", message: "Template wurde aktualisiert." }
          });
        } else {
          const createdTemplate = await createTemplate(getUser().id, payload);
          setState({
            templates: [createdTemplate, ...state.templates],
            feedback: { type: "success", message: "Template wurde erfolgreich angelegt." }
          });
        }

        closeTemplateModal();
      }
    } catch (error) {
      setFeedback("error", normalizeError(error));
      setState({ loading: { ...state.loading, creatingOrder: false } });
    }

    renderDashboard(getUser());
  };
}

export async function hydrateDashboard(getUser) {
  setState({
    currentView: "dashboard",
    dashboardSection: "image-generation",
    activeOrderId: null,
    tagQuery: "",
    feedback: null,
    templateModalOpen: false
  });
  await refreshDashboardData(getUser);
}
