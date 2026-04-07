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
const refreshImageEditingBtn = document.querySelector("#refresh-image-editing");
const openCreateModalBtn = document.querySelector("#open-create-modal");
const createModal = document.querySelector("#create-modal");
const cancelModalBtn = document.querySelector("#cancel-modal");
const createForm = document.querySelector("#create-image-editing-form");
const createMessage = document.querySelector("#create-message");
const openHelpModalBtn = document.querySelector("#open-help-modal");
const closeHelpModalBtn = document.querySelector("#close-help-modal");
const templateHelpModal = document.querySelector("#template-help-modal");
const templateHelpList = document.querySelector("#template-help-list");

const editingInstructionsInput = document.querySelector("#editing-instructions");
const entryNameInput = document.querySelector("#entry-name");
const isTemplateInput = document.querySelector("#is-template");
const templateFields = document.querySelector("#template-fields");
const templateImgInput = document.querySelector("#template-img");
const templatePreview = document.querySelector("#template-preview");
const templateHasVariableTextInput = document.querySelector("#template-has-variable-text");
const templateInfoInput = document.querySelector("#template-info");
const templateInfoWrapper = document.querySelector("#template-info-wrapper");
const editModal = document.querySelector("#edit-modal");
const editForm = document.querySelector("#edit-image-editing-form");
const editEntryIdInput = document.querySelector("#edit-entry-id");
const editEntryNameInput = document.querySelector("#edit-entry-name");
const editTemplateInfoInput = document.querySelector("#edit-template-info");
const editEditingInstructionsInput = document.querySelector("#edit-editing-instructions");
const cancelEditModalBtn = document.querySelector("#cancel-edit-modal");
const editMessage = document.querySelector("#edit-message");
const textViewModal = document.querySelector("#text-view-modal");
const textViewTitle = document.querySelector("#text-view-title");
const textViewContent = document.querySelector("#text-view-content");
const closeTextViewBtn = document.querySelector("#close-text-view");

let supabase;
let appConfig;
let imageEditingTemplates = [];

const message = (element, text, isError = false) => {
  element.textContent = text || "";
  element.classList.toggle("error", Boolean(isError));
};

const formatBool = (value) => (value ? "Ja" : "Nein");
const hasPromptResult = (row) => Boolean((row.nano2_prompt ?? row.banana2_prompt ?? "").trim());
const shortText = (value) => {
  if (!value) {
    return "-";
  }

  if (value.length <= 70) {
    return value;
  }

  return `${value.slice(0, 67)}…`;
};

const getStatusLabel = (row) => {
  if (!row.active) {
    return "Offline";
  }

  return hasPromptResult(row) ? "Scharf" : "Online (nicht scharf)";
};

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

const renderTemplateHelpList = () => {
  if (!imageEditingTemplates.length) {
    templateHelpList.innerHTML = "<p>Keine Vorlagen gefunden.</p>";
    return;
  }

  templateHelpList.innerHTML = imageEditingTemplates
    .map(
      (template) => `
      <article class="template-card">
        <h4>${template.title}</h4>
        <p>${template.description}</p>
        ${
          template.previewImage
            ? `<img src="${template.previewImage}" alt="Vorschau für ${template.title}" loading="lazy" />`
            : `<p class="hint">Noch kein Bild hinterlegt (assets möglich).</p>`
        }
        <button
          type="button"
          class="use-template-btn"
          data-template-key="${template.key}"
          data-template-prompt="${template.prompt}"
        >
          Vorlage übernehmen
        </button>
      </article>
    `
    )
    .join("");
};

const loadImageEditingTemplates = async () => {
  try {
    const response = await fetch("./assets/image-editing-templates.json");
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    imageEditingTemplates = Array.isArray(data.templates) ? data.templates : [];
    renderTemplateHelpList();
  } catch (error) {
    imageEditingTemplates = [];
    templateHelpList.innerHTML =
      '<p class="message error">Vorlagen konnten nicht geladen werden. Prüfe assets/image-editing-templates.json.</p>';
  }
};

const renderImageEditings = (rows) => {
  if (!rows.length) {
    imageEditingBody.innerHTML = `<tr><td colspan="8">Keine Einträge vorhanden.</td></tr>`;
    return;
  }

  imageEditingBody.innerHTML = rows
    .map((row) => {
      const isActive = Boolean(row.active);
      return `
      <tr>
        <td>${row.name ?? `Eintrag #${row.id}`}</td>
        <td>${formatBool(row.template)}</td>
        <td>${
          row.template_img_url
            ? `<a href="${row.template_img_url}" target="_blank" rel="noopener">Template öffnen</a>`
            : "-"
        }</td>
        <td>${formatBool(row.variable_template_text)}</td>
        <td>
          <button class="text-view-btn ghost" data-kind="Template Textfelder" data-value="${encodeURIComponent(
            row.template_info ?? ""
          )}" title="Text komplett anzeigen">${shortText(row.template_info)}</button>
        </td>
        <td>
          <button class="text-view-btn ghost" data-kind="Bildbearbeitung" data-value="${encodeURIComponent(
            row.editing_instructions ?? ""
          )}" title="Text komplett anzeigen">${shortText(row.editing_instructions)}</button>
        </td>
        <td>${getStatusLabel(row)}</td>
        <td>
          <button class="icon-btn toggle-active-btn ${isActive ? "danger" : ""}" data-id="${
            row.id
          }" data-next-active="${isActive ? "false" : "true"}" title="${
            isActive ? "Offline stellen" : "Online stellen"
          }">
            ${isActive ? "⏻" : "▶"}
          </button>
          <button class="icon-btn edit-btn" data-id="${row.id}" data-name="${encodeURIComponent(
            row.name ?? ""
          )}" data-template-info="${encodeURIComponent(
            row.template_info ?? ""
          )}" data-editing-instructions="${encodeURIComponent(
            row.editing_instructions ?? ""
          )}" data-active="${isActive}" title="Bearbeiten" ${isActive ? "disabled" : ""}>
            ✎
          </button>
          <button class="icon-btn delete-btn danger" data-id="${row.id}" data-active="${isActive}" title="Löschen" ${
            isActive ? "disabled" : ""
          }>
            🗑
          </button>
          <button class="icon-btn prompt-btn ghost" data-id="${row.id}" data-prompt="${encodeURIComponent(
            row.nano2_prompt ?? row.banana2_prompt ?? ""
          )}" title="Prompt anzeigen">
            ⌘
          </button>
        </td>
      </tr>
    `;
    })
    .join("");
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

  renderImageEditings(data ?? []);
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

const createImageEditingEntry = async (payload) => {
  const { error } = await supabase.from("image_editings").insert(payload);
  if (!error) {
    return;
  }

  const missingLegacyColumn =
    error.code === "23502" && /null value in column "image_editing"/i.test(error.message ?? "");

  if (!missingLegacyColumn) {
    throw new Error(error.message);
  }

  const { error: legacyError } = await supabase.from("image_editings").insert({
    ...payload,
    image_editing: false,
  });

  if (legacyError) {
    throw new Error(legacyError.message);
  }
};

const setEntryActiveState = async (entryId, nextActive) => {
  const { error } = await supabase.from("image_editings").update({ active: nextActive }).eq("id", entryId);

  if (error) {
    throw new Error(error.message);
  }
};

const updateImageEditingEntry = async (entryId, payload) => {
  const { error } = await supabase.from("image_editings").update(payload).eq("id", entryId);
  if (error) {
    throw new Error(error.message);
  }
};

const deleteImageEditingEntry = async (entryId) => {
  const { error } = await supabase.from("image_editings").delete().eq("id", entryId);
  if (error) {
    throw new Error(error.message);
  }
};

const openTextModal = (title, content) => {
  textViewTitle.textContent = title;
  textViewContent.textContent = content || "Kein Inhalt vorhanden.";
  textViewModal.showModal();
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

  templateImgInput.addEventListener("change", () => setPreview(templateImgInput, templatePreview));
  isTemplateInput.addEventListener("change", syncTemplateVisibility);
  templateHasVariableTextInput.addEventListener("change", syncTemplateInfoVisibility);

  refreshImageEditingBtn.addEventListener("click", async () => {
    message(imageEditingMessage, "Status wird aktualisiert …");
    await loadImageEditings();
    message(imageEditingMessage, "Status aktualisiert.");
  });

  openCreateModalBtn.addEventListener("click", () => {
    createForm.reset();
    templatePreview.src = "";
    templatePreview.classList.add("hidden");
    syncTemplateVisibility();
    message(createMessage, "");
    createModal.showModal();
  });

  cancelModalBtn.addEventListener("click", () => createModal.close());
  openHelpModalBtn.addEventListener("click", () => templateHelpModal.showModal());
  closeHelpModalBtn.addEventListener("click", () => templateHelpModal.close());

  templateHelpList.addEventListener("click", (event) => {
    const useTemplateBtn = event.target.closest(".use-template-btn");
    if (!useTemplateBtn) {
      return;
    }

    editingInstructionsInput.value = useTemplateBtn.dataset.templatePrompt ?? "";
    templateHelpModal.close();
    editingInstructionsInput.focus();
  });

  createForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const editingInstructions = editingInstructionsInput.value.trim();
    const entryName = entryNameInput.value.trim();
    const isTemplate = isTemplateInput.checked;
    const templateImgFile = templateImgInput.files[0];
    const templateHasVariableText = templateHasVariableTextInput.checked;
    const templateInfo = templateInfoInput.value.trim();

    if (!editingInstructions) {
      message(createMessage, "Bitte beschreibe, wie das Bild bearbeitet werden soll.", true);
      return;
    }
    if (!entryName) {
      message(createMessage, "Bitte gib einen Namen ein.", true);
      return;
    }

    if (isTemplate && !templateImgFile) {
      message(createMessage, "Wenn es ein Template ist, musst du ein Template-Bild hochladen.", true);
      return;
    }

    if (isTemplate && templateHasVariableText && !templateInfo) {
      message(createMessage, "Bei variablem Text bitte angeben, was variabel und was fix ist.", true);
      return;
    }

    try {
      message(createMessage, "Speichern läuft …");
      let templateImgUrl = null;

      if (isTemplate && templateImgFile) {
        templateImgUrl = await uploadImage(templateImgFile, appConfig.storage.templateBucket);
      }

      await createImageEditingEntry({
        name: entryName,
        template: isTemplate,
        template_img_url: templateImgUrl,
        variable_template_text: isTemplate ? templateHasVariableText : false,
        template_info: isTemplate && templateHasVariableText ? templateInfo : null,
        editing_instructions: editingInstructions,
        image_url: null,
        image: false,
        active: false,
      });

      message(createMessage, "Eintrag hinzugefügt (Status: Offline).", false);
      createModal.close();
      await loadImageEditings();
    } catch (err) {
      message(createMessage, err.message, true);
    }
  });

  imageEditingBody.addEventListener("click", async (event) => {
    const textViewBtn = event.target.closest(".text-view-btn");
    if (textViewBtn) {
      openTextModal(
        decodeURIComponent(textViewBtn.dataset.kind ?? "Text"),
        decodeURIComponent(textViewBtn.dataset.value ?? "")
      );
      return;
    }

    const promptBtn = event.target.closest(".prompt-btn");
    if (promptBtn) {
      const entryId = promptBtn.dataset.id;
      const prompt = decodeURIComponent(promptBtn.dataset.prompt ?? "");
      openTextModal("Prompt", `ID: ${entryId}\nSupervisor-ID: ${entryId}\n\n${prompt || "Kein Prompt vorhanden."}`);
      return;
    }

    const editBtn = event.target.closest(".edit-btn");
    if (editBtn) {
      if (editBtn.dataset.active === "true") {
        message(imageEditingMessage, "Bearbeiten ist nur im Offline-Status erlaubt.", true);
        return;
      }

      editEntryIdInput.value = editBtn.dataset.id;
      editEntryNameInput.value = decodeURIComponent(editBtn.dataset.name ?? "");
      editTemplateInfoInput.value = decodeURIComponent(editBtn.dataset.templateInfo ?? "");
      editEditingInstructionsInput.value = decodeURIComponent(editBtn.dataset.editingInstructions ?? "");
      message(editMessage, "");
      editModal.showModal();
      return;
    }

    const deleteBtn = event.target.closest(".delete-btn");
    if (deleteBtn) {
      if (deleteBtn.dataset.active === "true") {
        message(imageEditingMessage, "Löschen ist nur im Offline-Status erlaubt.", true);
        return;
      }

      const id = Number(deleteBtn.dataset.id);
      if (!Number.isFinite(id)) {
        return;
      }

      const accepted = window.confirm("Eintrag wirklich löschen?");
      if (!accepted) {
        return;
      }

      try {
        await deleteImageEditingEntry(id);
        await loadImageEditings();
        message(imageEditingMessage, "Eintrag gelöscht.");
      } catch (err) {
        message(imageEditingMessage, `Löschen fehlgeschlagen: ${err.message}`, true);
      }
      return;
    }

    const toggleButton = event.target.closest(".toggle-active-btn");
    if (!toggleButton) {
      return;
    }

    const id = Number(toggleButton.dataset.id);
    const nextActive = toggleButton.dataset.nextActive === "true";

    if (!Number.isFinite(id)) {
      return;
    }

    toggleButton.disabled = true;

    try {
      await setEntryActiveState(id, nextActive);
      await loadImageEditings();
      message(
        imageEditingMessage,
        nextActive
          ? "Eintrag online gestellt. Scharf wird er erst mit NanoBanana2-Prompt."
          : "Eintrag deaktiviert (Offline)."
      );
    } catch (err) {
      toggleButton.disabled = false;
      message(imageEditingMessage, `Aktion fehlgeschlagen: ${err.message}`, true);
    }
  });

  cancelEditModalBtn.addEventListener("click", () => editModal.close());
  closeTextViewBtn.addEventListener("click", () => textViewModal.close());

  editForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const id = Number(editEntryIdInput.value);
    const name = editEntryNameInput.value.trim();
    const templateInfo = editTemplateInfoInput.value.trim();
    const editingInstructions = editEditingInstructionsInput.value.trim();

    if (!Number.isFinite(id)) {
      message(editMessage, "Ungültige ID.", true);
      return;
    }
    if (!name || !editingInstructions) {
      message(editMessage, "Name und Bildbearbeitung sind Pflicht.", true);
      return;
    }

    try {
      message(editMessage, "Speichern läuft …");
      await updateImageEditingEntry(id, {
        name,
        template_info: templateInfo || null,
        editing_instructions: editingInstructions,
      });
      editModal.close();
      await loadImageEditings();
      message(imageEditingMessage, "Eintrag wurde bearbeitet.");
    } catch (err) {
      message(editMessage, err.message, true);
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
  await loadImageEditingTemplates();
  setupEvents();
  await checkSession();
};

init();
