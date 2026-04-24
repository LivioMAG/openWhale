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
import { createOrder, listOrders, listTemplates } from "../services/dashboardService.js";
import { renderAppbar, renderAuthView, renderDashboard } from "./render.js";

function setFeedback(type, message) {
  setState({ feedback: { type, message } });
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
  document.getElementById("logout-btn").addEventListener("click", async () => {
    await signOut();
    await refreshSession();
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
      setState({ activeOrderId: orderToOpen, tagQuery: "", uploadedImageName: "", feedback: null });
      renderDashboard(getUser());
      return;
    }

    if (event.target.id === "order-detail-back") {
      setState({ activeOrderId: null, selectedTemplateId: null, feedback: null });
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
  };

  root.oninput = (event) => {
    if (event.target.id === "tag-filter") {
      setState({ tagQuery: event.target.value });
      renderDashboard(getUser());
    }
  };

  root.onchange = (event) => {
    if (event.target.id === "photo-upload") {
      const file = event.target.files?.[0];
      setState({ uploadedImageName: file?.name || "" });
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
    } catch (error) {
      setFeedback("error", normalizeError(error));
      setState({ loading: { ...state.loading, creatingOrder: false } });
    }

    renderDashboard(getUser());
  };

  root.ondragstart = (event) => {
    const templateId = event.target.dataset?.templateId;
    if (!templateId) return;
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData("text/template-id", templateId);
  };

  root.ondragover = (event) => {
    if (event.target.closest("#upload-dropzone")) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    }
  };

  root.ondrop = (event) => {
    const dropzone = event.target.closest("#upload-dropzone");
    if (!dropzone) return;
    event.preventDefault();

    if (!state.uploadedImageName) {
      setFeedback("warning", "Upload fehlt: Bitte zuerst ein Foto hochladen.");
      renderDashboard(getUser());
      return;
    }

    const templateId = event.dataTransfer.getData("text/template-id");
    if (!templateId) return;

    setState({ selectedTemplateId: templateId });

    const dialog = document.createElement("dialog");
    dialog.id = "template-confirm-dialog";
    dialog.className = "confirm-dialog";
    dialog.innerHTML = `<form method="dialog">
      <h3>Template anwenden?</h3>
      <p class="context-note">Template-ID: ${templateId.slice(0, 8)}</p>
      <menu>
        <button id="confirm-template-apply" class="btn btn--primary" value="confirm">Ja</button>
        <button class="btn btn--ghost" value="cancel">Abbrechen</button>
      </menu>
    </form>`;

    document.body.appendChild(dialog);

    const confirmButton = dialog.querySelector("#confirm-template-apply");
    confirmButton?.addEventListener("click", () => {
      setState({
        feedback: {
          type: "success",
          message: "Template-Bestätigung gespeichert. TODO: tatsächliche Anwendung implementieren."
        }
      });
      renderDashboard(getUser());
    });

    dialog.addEventListener("close", () => dialog.remove());
    dialog.showModal();
  };
}

export async function hydrateDashboard(getUser) {
  setState({
    currentView: "dashboard",
    dashboardSection: "image-generation",
    activeOrderId: null,
    tagQuery: "",
    feedback: null
  });
  await refreshDashboardData(getUser);
}
