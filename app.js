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

const imageFileInput = document.querySelector("#image-file");
const imagePreview = document.querySelector("#image-preview");
const isTemplateInput = document.querySelector("#is-template");
const templateFields = document.querySelector("#template-fields");
const templateImgInput = document.querySelector("#template-img");
const templatePreview = document.querySelector("#template-preview");
const templateHasVariableTextInput = document.querySelector("#template-has-variable-text");
const templateInfoInput = document.querySelector("#template-info");
const templateInfoWrapper = document.querySelector("#template-info-wrapper");

let supabase;
let appConfig;

const message = (element, text, isError = false) => {
  element.textContent = text || "";
  element.classList.toggle("error", Boolean(isError));
};

const formatBool = (value) => (value ? "Ja" : "Nein");
const hasPromptResult = (row) => Boolean((row.nano2_prompt ?? row.banana2_prompt ?? "").trim());

const setPreview = (input, imgEl) => {
  const file = input.files?.[0];
  if (!file) {
    imgEl.src = "";
    imgEl.classList.add("hidden");
    return;
  }

  imgEl.src = URL.createObjectURL(file);
  imgEl.classList.remove("hidden");
};

const syncTemplateVisibility = () => {
  const isTemplate = isTemplateInput.checked;
  templateFields.classList.toggle("hidden", !isTemplate);

  if (!isTemplate) {
    templateImgInput.value = "";
    templatePreview.src = "";
    templatePreview.classList.add("hidden");
    templateHasVariableTextInput.checked = false;
    templateInfoInput.value = "";
  }

  syncTemplateInfoVisibility();
};

const syncTemplateInfoVisibility = () => {
  const showTemplateInfo = isTemplateInput.checked && templateHasVariableTextInput.checked;
  templateInfoWrapper.classList.toggle("hidden", !showTemplateInfo);

  if (!showTemplateInfo) {
    templateInfoInput.value = "";
  }
};

const renderImageEditings = (rows) => {
  if (!rows.length) {
    imageEditingBody.innerHTML = `<tr><td colspan="8">Keine Einträge vorhanden.</td></tr>`;
    return;
  }

  imageEditingBody.innerHTML = rows
    .map((row) => {
      const showLoading = row.active && !hasPromptResult(row);
      return `
      <tr>
        <td>${row.id}</td>
        <td>${formatBool(row.template)}</td>
        <td>${
          row.template_img_url
            ? `<a href="${row.template_img_url}" target="_blank" rel="noopener">Template öffnen</a>`
            : "-"
        }</td>
        <td>${formatBool(row.variable_template_text)}</td>
        <td>${row.template_info ?? "-"}</td>
        <td>${row.image_url ? `<a href="${row.image_url}" target="_blank" rel="noopener">Bild öffnen</a>` : "-"}</td>
        <td>${showLoading ? "⏳ In Bearbeitung" : "Fertig"}</td>
        <td>
          <button class="start-editing-btn" data-id="${row.id}" ${showLoading ? "disabled" : ""}>
            ${showLoading ? "Läuft …" : "Bildbearbeitung starten"}
          </button>
        </td>
      </tr>
    `;
    })
    .join("");
};

const reconcileActiveStates = async (rows) => {
  const updates = rows
    .map((row) => {
      const shouldBeActive = !hasPromptResult(row);
      if (row.active === shouldBeActive) {
        return null;
      }

      return supabase.from("image_editings").update({ active: shouldBeActive }).eq("id", row.id);
    })
    .filter(Boolean);

  if (!updates.length) {
    return;
  }

  await Promise.all(updates);
};

const loadImageEditings = async () => {
  const { data, error } = await supabase
    .from("image_editings")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    message(imageEditingMessage, `Fehler beim Laden: ${error.message}`, true);
    return;
  }

  const rows = data ?? [];
  await reconcileActiveStates(rows);

  const hydratedRows = rows.map((row) => ({ ...row, active: !hasPromptResult(row) }));
  renderImageEditings(hydratedRows);
  message(imageEditingMessage, "");
};

const uploadImage = async (file, bucketName) => {
  const safeName = `${crypto.randomUUID()}-${file.name.replace(/\s+/g, "_")}`;
  const { error } = await supabase.storage
    .from(bucketName)
    .upload(safeName, file, { upsert: false });

  if (error) {
    throw new Error(`Upload fehlgeschlagen (${bucketName}): ${error.message}`);
  }

  const { data } = supabase.storage.from(bucketName).getPublicUrl(safeName);
  return data.publicUrl;
};

const triggerImageEditing = async (entryId) => {
  const { data: entry, error } = await supabase
    .from("image_editings")
    .select("*")
    .eq("id", entryId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const webhookPayload = {
    id: entry.id,
    imageUrl: entry.image_url,
    template: entry.template,
    templateImageUrl: entry.template_img_url,
    templateHasVariableText: entry.variable_template_text,
    templateInfo: entry.template_info,
  };

  const webhookResponse = await fetch(appConfig.webhooks.n8nImageGeneration, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(webhookPayload),
  });

  if (!webhookResponse.ok) {
    throw new Error(`Webhook-Fehler: ${webhookResponse.status} ${webhookResponse.statusText}`);
  }

  const { error: updateError } = await supabase.from("image_editings").update({ active: true }).eq("id", entryId);

  if (updateError) {
    throw new Error(updateError.message);
  }
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

  imageFileInput.addEventListener("change", () => setPreview(imageFileInput, imagePreview));
  templateImgInput.addEventListener("change", () => setPreview(templateImgInput, templatePreview));
  isTemplateInput.addEventListener("change", syncTemplateVisibility);
  templateHasVariableTextInput.addEventListener("change", syncTemplateInfoVisibility);

  openCreateModalBtn.addEventListener("click", () => {
    createForm.reset();
    imagePreview.src = "";
    imagePreview.classList.add("hidden");
    templatePreview.src = "";
    templatePreview.classList.add("hidden");
    syncTemplateVisibility();
    message(createMessage, "");
    createModal.showModal();
  });

  cancelModalBtn.addEventListener("click", () => createModal.close());

  createForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const imageFile = imageFileInput.files[0];
    const isTemplate = isTemplateInput.checked;
    const templateImgFile = templateImgInput.files[0];
    const templateHasVariableText = templateHasVariableTextInput.checked;
    const templateInfo = templateInfoInput.value.trim();

    if (!imageFile) {
      message(createMessage, "Bitte ein Bild hochladen.", true);
      return;
    }

    if (isTemplate && !templateImgFile) {
      message(createMessage, "Wenn isTemplate=true, bitte ein Template-Image auswählen.", true);
      return;
    }

    if (isTemplate && templateHasVariableText && !templateInfo) {
      message(createMessage, "Bei variablem Template-Text ist templateInfo erforderlich.", true);
      return;
    }

    try {
      message(createMessage, "Speichern läuft …");

      const imageUrl = await uploadImage(imageFile, appConfig.storage.imageBucket);
      let templateImgUrl = null;

      if (isTemplate && templateImgFile) {
        templateImgUrl = await uploadImage(templateImgFile, appConfig.storage.templateBucket);
      }

      const { error } = await supabase.from("image_editings").insert({
        template: isTemplate,
        template_img_url: templateImgUrl,
        variable_template_text: isTemplate ? templateHasVariableText : false,
        template_info: isTemplate && templateHasVariableText ? templateInfo : null,
        image_url: imageUrl,
        image: true,
        active: true,
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

  imageEditingBody.addEventListener("click", async (event) => {
    const targetButton = event.target.closest(".start-editing-btn");
    if (!targetButton) {
      return;
    }

    const id = Number(targetButton.dataset.id);
    if (!Number.isFinite(id)) {
      return;
    }

    targetButton.disabled = true;

    try {
      message(imageEditingMessage, "Bildbearbeitung wird gestartet …");
      await triggerImageEditing(id);
      await loadImageEditings();
      message(imageEditingMessage, "Webhook ausgelöst. Bearbeitung läuft.");
    } catch (err) {
      targetButton.disabled = false;
      message(imageEditingMessage, `Start fehlgeschlagen: ${err.message}`, true);
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
