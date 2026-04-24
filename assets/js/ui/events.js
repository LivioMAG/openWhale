import { setState, state } from "../core/state.js";
import { isValidEmail, normalizeError, required } from "../core/helpers.js";
import {
  signInWithPassword,
  signUp,
  requestOneTimeCode,
  verifyOneTimeCode,
  updateUserMetadata,
  updatePassword,
  sendPasswordReset,
  signOut,
  deleteAccount
} from "../services/authService.js";
import { renderAccountSettings, renderAppbar, renderAuthView } from "./render.js";

function setFeedback(type, message) {
  setState({ feedback: { type, message } });
}

export function bindGlobalEvents(getUser, refreshSession) {
  document.getElementById("account-settings-btn").addEventListener("click", async () => {
    setState({ currentView: "account", feedback: null });
    renderAccountSettings(getUser());
  });

  document.getElementById("logout-btn").addEventListener("click", async () => {
    await signOut();
    await refreshSession();
  });
}

export function bindAuthEvents(refreshSession) {
  const root = document.getElementById("auth-container");

  root.onclick = async (event) => {
    const id = event.target.id;
    if (id === "goto-register") setState({ currentView: "register", feedback: null });
    if (id === "goto-forgot") setState({ currentView: "forgot", feedback: null });
    if (id === "back-to-login" || id === "forgot-back-login") setState({ currentView: "login", feedback: null });
    if (id === "resend-code") {
      try {
        await requestOneTimeCode(state.otcEmail);
        setFeedback("success", "Code erneut versendet.");
      } catch (error) {
        setFeedback("error", normalizeError(error));
      }
    }
    renderAuthView();
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

export function bindAccountEvents(getUser, refreshSession) {
  const root = document.getElementById("account-container");

  root.onsubmit = async (event) => {
    event.preventDefault();
    const form = new FormData(event.target);

    try {
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
    }

    renderAccountSettings(getUser());
  };

  root.onclick = async (event) => {
    if (event.target.id !== "delete-account") return;
    try {
      await deleteAccount();
      await signOut();
      await refreshSession();
    } catch (error) {
      setFeedback("warning", `${normalizeError(error)} Wenn nicht vorhanden, Edge Function backend/functions/delete-account/index.ts bereitstellen.`);
      renderAccountSettings(getUser());
    }
  };
}
