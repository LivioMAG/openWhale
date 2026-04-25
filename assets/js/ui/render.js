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
  const dashboardRoot = document.getElementById("dashboard-container");
  dashboardRoot.classList.add("hidden");
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

function renderOrdersList() {
  if (state.loading.orders) {
    return `<p class="context-note">Aufträge werden geladen …</p>`;
  }
  if (!state.orders.length) {
    return `<p class="empty-state">Noch keine Aufträge vorhanden.</p>`;
  }

  return `<ul class="order-list">${state.orders
    .map(
      (order) => `<li>
        <button class="order-item" data-order-open="${order.id}" type="button">
          <strong>${order.order_number}</strong>
          ${order.order_name ? `<span>${order.order_name}</span>` : '<span class="text-muted">Ohne Auftragsname</span>'}
        </button>
      </li>`
    )
    .join("")}</ul>`;
}

function renderImageGeneration() {
  return `<section class="dashboard-panel">
    <div class="panel-headline">
      <div>
        <h2>Bilderstellung</h2>
        <p class="context-note">Verwalte deine Aufträge und öffne die Detailansicht per Klick.</p>
      </div>
      <button id="open-order-create" class="btn btn--primary" type="button">➕ Auftrag anlegen</button>
    </div>
    ${state.feedback ? feedbackBox(state.feedback) : ""}
    ${
      state.orderCreationOpen
        ? `<form id="order-create-form" class="inline-form">
            ${inputField({ id: "order-name", label: "Auftragsname (optional)", required: false })}
            <div class="actions">
              <button class="btn btn--primary" type="submit" ${state.loading.creatingOrder ? "disabled" : ""}>${
                state.loading.creatingOrder ? "Wird erstellt …" : "Erstellen"
              }</button>
              <button id="cancel-order-create" class="btn btn--ghost" type="button">Abbrechen</button>
            </div>
          </form>`
        : ""
    }
    ${renderOrdersList()}
  </section>`;
}

function renderAccountSettings(user) {
  const data = user?.user_metadata || {};
  return `<section class="dashboard-panel">
    <h2>Account Settings</h2>
    <p class="context-note">Profil- und Passwortverwaltung.</p>
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
    </div>
  </section>`;
}

function getFilteredTemplates() {
  const query = state.tagQuery.trim().toLowerCase();
  if (!query) return state.templates;
  return state.templates.filter((template) => (template.tag || "").toLowerCase().includes(query));
}

function renderOrderDetail() {
  const order = state.orders.find((entry) => entry.id === state.activeOrderId);
  const filteredTemplates = getFilteredTemplates();
  const allTags = [...new Set(state.templates.map((template) => template.tag).filter(Boolean))].sort((a, b) => a.localeCompare(b));

  return `<section class="order-detail-view">
    <button id="order-detail-back" class="btn btn--ghost order-detail-back" type="button">← Zurück zur Bilderstellung</button>
    <header>
      <h2>${order?.order_number || "Auftrag"}</h2>
      ${order?.order_name ? `<p class="context-note">${order.order_name}</p>` : '<p class="context-note">Kein Auftragsname vergeben.</p>'}
    </header>
    ${feedbackBox(state.feedback)}
    <div class="order-detail-layout">
      <div class="upload-panel" id="upload-dropzone">
        <h3>Foto hochladen</h3>
        <input id="photo-upload" type="file" accept="image/*" />
        ${
          order?.input_image
            ? `<p class="context-note">Input gespeichert: ${order.input_image}</p>`
            : '<p class="empty-state">Noch kein Foto hochgeladen.</p>'
        }
        ${
          order?.output_image
            ? `<p class="context-note">Output vorhanden: ${order.output_image}</p>`
            : '<p class="context-note">Output-Bild ist noch nicht erstellt.</p>'
        }
        <p class="context-note">Ziehe anschließend ein Template rechts auf diese Fläche.</p>
      </div>
      <aside class="template-panel">
        <h3>Templates</h3>
        <label for="tag-filter">Tag-Suche</label>
        <input id="tag-filter" name="tag-filter" list="template-tag-options" value="${state.tagQuery}" placeholder="z. B. Kinderzimmer" autocomplete="off" />
        <datalist id="template-tag-options">
          ${allTags.map((tag) => `<option value="${tag}"></option>`).join("")}
        </datalist>
        ${
          state.loading.templates
            ? '<p class="context-note">Templates werden geladen …</p>'
            : !state.templates.length
              ? '<p class="empty-state">Keine Templates vorhanden.</p>'
              : !filteredTemplates.length
                ? '<p class="empty-state">Keine Templates für den gesuchten Tag gefunden.</p>'
                : `<ul class="template-list">${filteredTemplates
                    .map(
                      (template) => `<li>
                          <button class="template-item" draggable="true" data-template-id="${template.id}" type="button" style="border-left: 6px solid ${template.color || "#E8F8F0"};">
                            <strong>${template.note || "Ohne Notiz"}</strong>
                            <span>Tag: ${template.tag || "Kein Tag"}</span>
                            <span>Nutzung: ${template.usage_count ?? 0}</span>
                          </button>
                        </li>`
                    )
                    .join("")}</ul>`
        }
      </aside>
    </div>
  </section>`;
}

export function renderDashboard(user) {
  const root = document.getElementById("dashboard-container");
  const authRoot = document.getElementById("auth-container");
  authRoot.classList.add("hidden");
  root.classList.remove("hidden");

  if (state.activeOrderId) {
    root.innerHTML = renderOrderDetail();
    return;
  }

  root.innerHTML = `<section class="dashboard-layout dashboard-layout--expanded">
      <nav class="side-nav" aria-label="Dashboard Navigation">
        <button type="button" class="side-nav__item ${state.dashboardSection === "image-generation" ? "is-active" : ""}" data-nav-section="image-generation">Bilderstellung</button>
        <button type="button" class="side-nav__item side-nav__item--bottom ${state.dashboardSection === "account" ? "is-active" : ""}" data-nav-section="account">Account Settings</button>
      </nav>
      ${state.dashboardSection === "account" ? renderAccountSettings(user) : renderImageGeneration()}
    </section>`;
}
