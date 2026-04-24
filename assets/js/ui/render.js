import { state } from "../core/state.js";
import { feedbackBox, inputField } from "./components.js";

export function renderAppbar() {
  document.getElementById("appbar").classList.toggle("hidden", !state.session);
}

function authHeader(title, subtitle) {
  return `<h1>${title}</h1>
    <p>${subtitle}</p>
    <p class="context-note">OpenWale für professionelle Bildbearbeitung von Immobilien.</p>
    ${feedbackBox(state.feedback)}`;
}

export function renderAuthView() {
  const root = document.getElementById("auth-container");
  const accountRoot = document.getElementById("account-container");
  accountRoot.classList.add("hidden");
  root.classList.remove("hidden");

  if (state.currentView === "login") {
    root.innerHTML = `${authHeader("Login", "Melde dich mit E-Mail und Passwort an.")}
      <form id="login-form">
        ${inputField({ id: "login-email", label: "E-Mail", type: "email", autocomplete: "email" })}
        ${inputField({ id: "login-password", label: "Passwort", type: "password", autocomplete: "current-password" })}
        <div class="actions"><button class="btn btn--primary" type="submit">Login</button></div>
      </form>
      <div class="helper-links">
        <button id="goto-register" class="text-btn" type="button">Registrieren</button>
        <button id="goto-forgot" class="text-btn" type="button">Passwort vergessen</button>
      </div>`;
  }

  if (state.currentView === "register") {
    root.innerHTML = `${authHeader("Registrierung", "Erstelle ein neues Konto.")}
      <form id="register-form">
        ${inputField({ id: "first-name", label: "Vorname", autocomplete: "given-name" })}
        ${inputField({ id: "last-name", label: "Nachname", autocomplete: "family-name" })}
        ${inputField({ id: "company-name", label: "Firmenname", autocomplete: "organization" })}
        ${inputField({ id: "register-email", label: "E-Mail", type: "email", autocomplete: "email" })}
        ${inputField({ id: "register-password", label: "Passwort", type: "password", autocomplete: "new-password" })}
        ${inputField({ id: "register-password-repeat", label: "Passwort wiederholen", type: "password", autocomplete: "new-password" })}
        ${inputField({ id: "phone", label: "Telefon (optional)", required: false, autocomplete: "tel" })}
        <div class="actions">
          <button class="btn btn--primary" type="submit">Registrierung abschließen</button>
          <button id="back-to-login" class="btn btn--ghost" type="button">Zurück zum Login</button>
        </div>
      </form>`;
  }

  if (state.currentView === "forgot") {
    root.innerHTML = `${authHeader("One-Time-Code anfordern", "Wir senden einen OTC/OTP Code per E-Mail.")}
      <form id="forgot-form">
        ${inputField({ id: "forgot-email", label: "E-Mail", type: "email", value: state.otcEmail, autocomplete: "email" })}
        <div class="actions">
          <button class="btn btn--primary" type="submit">Code senden</button>
          <button id="forgot-back-login" class="btn btn--ghost" type="button">Zurück zum Login</button>
        </div>
      </form>`;
  }

  if (state.currentView === "otc") {
    root.innerHTML = `${authHeader("One-Time-Code eingeben", `Code für ${state.otcEmail} eingeben.`)}
      <form id="otc-form">
        ${inputField({ id: "otc-token", label: "One-Time-Code", autocomplete: "one-time-code" })}
        <div class="actions">
          <button class="btn btn--primary" type="submit">Code prüfen</button>
          <button id="resend-code" class="btn btn--secondary" type="button">Code erneut senden</button>
        </div>
      </form>`;
  }
}

export function renderAccountSettings(user) {
  const root = document.getElementById("account-container");
  const authRoot = document.getElementById("auth-container");
  authRoot.classList.add("hidden");
  root.classList.remove("hidden");

  const data = user?.user_metadata || {};
  root.innerHTML = `<h2>Account Settings</h2>
    <p class="context-note">OpenWale für professionelle Bildbearbeitung von Immobilien.</p>
    ${feedbackBox(state.feedback)}
    <form id="profile-form">
      ${inputField({ id: "acc-first-name", label: "Vorname", value: data.first_name || "" })}
      ${inputField({ id: "acc-last-name", label: "Nachname", value: data.last_name || "" })}
      ${inputField({ id: "acc-company-name", label: "Firmenname", value: data.company_name || "" })}
      ${inputField({ id: "acc-phone", label: "Telefon (optional)", value: data.phone || "", required: false })}
      <div class="actions"><button class="btn btn--primary" type="submit">Profil speichern</button></div>
    </form>
    <hr />
    <form id="password-form">
      ${inputField({ id: "new-password", label: "Neues Passwort", type: "password", autocomplete: "new-password" })}
      ${inputField({ id: "new-password-repeat", label: "Neues Passwort wiederholen", type: "password", autocomplete: "new-password" })}
      <div class="actions"><button class="btn btn--secondary" type="submit">Passwort zurücksetzen</button></div>
    </form>
    <hr />
    <div class="actions">
      <button id="delete-account" type="button" class="btn btn--danger">Account löschen</button>
    </div>`;
}
