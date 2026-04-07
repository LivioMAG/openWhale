import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const loginScreen = document.querySelector("#login-screen");
const workspace = document.querySelector("#workspace");
const loginForm = document.querySelector("#login-form");
const authMessage = document.querySelector("#auth-message");
const userEmail = document.querySelector("#user-email");
const logoutBtn = document.querySelector("#logout-btn");

const tabs = document.querySelectorAll(".tab");
const tabPanels = document.querySelectorAll(".tab-panel");

const imageEditingBody = document.querySelector("#image-editing-body");
const imageEditingMessage = document.querySelector("#image-editing-message");
const openCreateModalBtn = document.querySelector("#open-create-modal");
const createModal = document.querySelector("#create-modal");
const cancelModalBtn = document.querySelector("#cancel-modal");
const createForm = document.querySelector("#create-image-editing-form");
const createMessage = document.querySelector("#create-message");

let supabase;
let appConfig;

const message = (element, text, isError = false) => {
  element.textContent = text || "";
  element.classList.toggle("error", Boolean(isError));
};

const formatBool = (value) => (value ? "true" : "false");

const renderImageEditings = (rows) => {
  if (!rows.length) {
    imageEditingBody.innerHTML = `<tr><td colspan="8">Keine Einträge vorhanden.</td></tr>`;
    return;
  }

  imageEditingBody.innerHTML = rows
    .map(
      (row) => `
      <tr>
        <td>${row.id}</td>
        <td>${formatBool(row.template)}</td>
        <td>${
          row.template_img_url
            ? `<a href="${row.template_img_url}" target="_blank" rel="noopener">Bild öffnen</a>`
            : "-"
        }</td>
        <td>${formatBool(row.variable_template_text)}</td>
        <td>${row.template_info ?? "-"}</td>
        <td>${row.image_editing ?? "-"}</td>
        <td>${row.banana2_prompt ?? "-"}</td>
        <td>${formatBool(row.image)}</td>
      </tr>
    `,
    )
    .join("");
};

const loadImageEditings = async () => {
  const { data, error } = await supabase
    .from("image_editings")
    .select("id, template, template_img_url, variable_template_text, template_info, image_editing, banana2_prompt, image")
    .order("created_at", { ascending: false });

  if (error) {
    message(imageEditingMessage, `Fehler beim Laden: ${error.message}`, true);
    return;
  }

  renderImageEditings(data ?? []);
  message(imageEditingMessage, "");
};

const uploadTemplateImage = async (file) => {
  const safeName = `${crypto.randomUUID()}-${file.name.replace(/\s+/g, "_")}`;
  const { error } = await supabase.storage
    .from(appConfig.storage.templateBucket)
    .upload(safeName, file, { upsert: false });

  if (error) {
    throw new Error(`Template-Upload fehlgeschlagen: ${error.message}`);
  }

  const { data } = supabase.storage.from(appConfig.storage.templateBucket).getPublicUrl(safeName);
  return data.publicUrl;
};

const openWorkspace = async (email) => {
  loginScreen.classList.add("hidden");
  workspace.classList.remove("hidden");
  userEmail.textContent = email;
  await loadImageEditings();
};

const checkSession = async () => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    await openWorkspace(session.user.email);
  }
};

const setTab = (tabId) => {
  tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === tabId));
  tabPanels.forEach((panel) => panel.classList.toggle("active", panel.id === tabId));
};

const setupEvents = () => {
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => setTab(tab.dataset.tab));
  });

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    message(authMessage, "Login läuft …");

    const email = document.querySelector("#email").value;
    const password = document.querySelector("#password").value;

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      message(authMessage, error.message, true);
      return;
    }

    message(authMessage, "Login erfolgreich.");
    await openWorkspace(email);
  });

  logoutBtn.addEventListener("click", async () => {
    await supabase.auth.signOut();
    workspace.classList.add("hidden");
    loginScreen.classList.remove("hidden");
    message(authMessage, "Abgemeldet.");
  });

  openCreateModalBtn.addEventListener("click", () => {
    createForm.reset();
    message(createMessage, "");
    createModal.showModal();
  });

  cancelModalBtn.addEventListener("click", () => createModal.close());

  createForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const template = document.querySelector("#template").checked;
    const templateImgFile = document.querySelector("#template-img").files[0];
    const variableTemplateText = document.querySelector("#variable-template-text").checked;
    const templateInfo = document.querySelector("#template-info").value.trim();
    const imageEditing = document.querySelector("#image-editing-description").value.trim();
    const banana2Prompt = document.querySelector("#banana2-prompt").value.trim();

    if (template && !templateImgFile) {
      message(createMessage, "Wenn Template=true, bitte ein Template-Bild auswählen.", true);
      return;
    }

    if (variableTemplateText && !templateInfo) {
      message(createMessage, "Bei variablem Template Text ist Template Info erforderlich.", true);
      return;
    }

    try {
      message(createMessage, "Speichern läuft …");
      let templateImgUrl = null;

      if (template && templateImgFile) {
        templateImgUrl = await uploadTemplateImage(templateImgFile);
      }

      const { error } = await supabase.from("image_editings").insert({
        template,
        template_img_url: templateImgUrl,
        variable_template_text: variableTemplateText,
        template_info: templateInfo || null,
        image_editing: imageEditing,
        banana2_prompt: banana2Prompt || null,
        image: true,
      });

      if (error) {
        throw new Error(error.message);
      }

      message(createMessage, "Eintrag gespeichert.");
      createModal.close();
      await loadImageEditings();
    } catch (err) {
      message(createMessage, err.message, true);
    }
  });

  if (appConfig.polling.imageEditingStatusMs > 0) {
    setInterval(() => {
      if (!workspace.classList.contains("hidden")) {
        loadImageEditings();
      }
    }, appConfig.polling.imageEditingStatusMs);
  }
};

const init = async () => {
  try {
    appConfig = await fetch("./config/app-config.json").then((response) => response.json());
  } catch {
    message(authMessage, "Config-Datei konnte nicht geladen werden.", true);
    return;
  }

  supabase = createClient(appConfig.supabase.url, appConfig.supabase.anonKey);
  setupEvents();
  await checkSession();
};

init();
