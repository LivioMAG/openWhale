import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const loginScreen = document.querySelector("#login-screen");
const workspace = document.querySelector("#workspace");
const loginForm = document.querySelector("#login-form");
const authMessage = document.querySelector("#auth-message");
const userEmail = document.querySelector("#user-email");
const logoutBtn = document.querySelector("#logout-btn");

const tabs = document.querySelectorAll(".tab");
const tabPanels = document.querySelectorAll(".tab-panel");
const uploadPoolFilesBtn = document.querySelector("#upload-pool-files");
const poolFileInput = document.querySelector("#pool-file-input");
const poolList = document.querySelector("#pool-list");
const poolMessage = document.querySelector("#pool-message");
const createCompositionBtn = document.querySelector("#create-composition");
const compositionArea = document.querySelector("#composition-area");
const compositionMessage = document.querySelector("#composition-message");

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
const openTemplateModalBtn = document.querySelector("#open-template-modal");
const contentTemplatesBody = document.querySelector("#content-templates-body");
const contentTemplatesMessage = document.querySelector("#content-templates-message");
const templateModal = document.querySelector("#template-modal");
const templateForm = document.querySelector("#template-form");
const templateNameInput = document.querySelector("#template-name");
const templateTypeInput = document.querySelector("#template-type");
const singleTemplateWrapper = document.querySelector("#single-template-wrapper");
const singleTemplateSelect = document.querySelector("#single-template-select");
const carouselTemplateWrapper = document.querySelector("#carousel-template-wrapper");
const carouselTemplateSelect = document.querySelector("#carousel-template-select");
const addCarouselTemplateBtn = document.querySelector("#add-carousel-template");
const carouselSelectedList = document.querySelector("#carousel-selected-list");
const captionRequirementsInput = document.querySelector("#caption-requirements");
const hashtagRequirementsInput = document.querySelector("#hashtag-requirements");
const hasSpecialRequirementsInput = document.querySelector("#has-special-requirements");
const specialRequirementsWrapper = document.querySelector("#special-requirements-wrapper");
const specialRequirementsInput = document.querySelector("#special-requirements");
const cancelTemplateModalBtn = document.querySelector("#cancel-template-modal");
const templateFormMessage = document.querySelector("#template-form-message");

let supabase;
let appConfig;
let imageEditingTemplates = [];
let imageEditingTemplateOptions = [];
let carouselSelection = [];
let contentTemplateOptions = [];
let poolItems = [];
let activeComposer = null;

const resolveBucketName = (primaryKey, fallbackKey) => {
  const primary = appConfig?.storage?.[primaryKey];
  const fallback = fallbackKey ? appConfig?.storage?.[fallbackKey] : undefined;
  return primary || fallback || "";
};

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

const buildPoolItemCard = (item) => `
  <article class="pool-item" draggable="true" data-pool-id="${item.id}" title="In Slot ziehen">
    <img src="${item.url}" alt="${item.name}" loading="lazy" />
    <div class="pool-meta">ID: ${item.id}</div>
    <div class="pool-meta">Group: ${item.groupId ?? "empty"}</div>
  </article>
`;

const renderPoolItems = () => {
  if (!poolItems.length) {
    poolList.innerHTML = "<p>Noch keine Bilder im Pool.</p>";
    return;
  }

  const grouped = poolItems.reduce(
    (acc, item) => {
      if (item.groupId) {
        (acc.groups[item.groupId] ||= []).push(item);
      } else {
        acc.singles.push(item);
      }
      return acc;
    },
    { groups: {}, singles: [] }
  );

  const groupBlocks = Object.entries(grouped.groups)
    .map(
      ([groupId, items]) => `
      <section class="pool-group">
        <h4>Gruppe ${groupId} (${items.length})</h4>
        <div class="pool-items">${items.map(buildPoolItemCard).join("")}</div>
      </section>
    `
    )
    .join("");

  const singleBlock = grouped.singles.length
    ? `
      <section class="pool-group">
        <h4>Einzelbilder (${grouped.singles.length})</h4>
        <div class="pool-items">${grouped.singles.map(buildPoolItemCard).join("")}</div>
      </section>
    `
    : "";

  poolList.innerHTML = `${groupBlocks}${singleBlock}`;
};

const buildComposerMarkup = () => {
  const options = contentTemplateOptions
    .map((template) => `<option value="${template.id}">${template.name} (${template.template_type})</option>`)
    .join("");

  compositionArea.innerHTML = `
    <div class="composer">
      <label>
        Vorlage
        <select id="composer-template-select">
          <option value="">Bitte Vorlage wählen</option>
          ${options}
        </select>
      </label>
      <div id="composer-slots"><p>Wähle zuerst eine Vorlage.</p></div>
      <button id="composer-next" type="button">Weiter</button>
    </div>
  `;
};

const renderComposerSlots = (templateId) => {
  const selectedTemplate = contentTemplateOptions.find((item) => item.id === Number(templateId));
  const slotsWrap = compositionArea.querySelector("#composer-slots");
  if (!selectedTemplate || !slotsWrap) {
    return;
  }

  const slots =
    selectedTemplate.template_type === "post"
      ? [{ slotKey: "post-1", label: "Post-Bild", templateRef: selectedTemplate.image_editing_template_id }]
      : (Array.isArray(selectedTemplate.carousel_structure) ? selectedTemplate.carousel_structure : [])
          .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
          .map((entry, index) => ({
            slotKey: `carousel-${index + 1}`,
            label: `Karussell Slot ${index + 1}`,
            templateRef: entry.template_id,
          }));

  activeComposer = {
    templateId: selectedTemplate.id,
    type: selectedTemplate.template_type,
    slots,
    assignments: {},
  };

  slotsWrap.innerHTML = slots
    .map(
      (slot) => `
      <div class="drop-slot" data-slot-key="${slot.slotKey}">
        <strong>${slot.label}</strong> (Vorlage #${slot.templateRef})
        <p class="pool-meta">Bild aus dem Pool hier hineinziehen.</p>
        <div class="slot-preview" data-slot-preview="${slot.slotKey}">Kein Bild zugewiesen.</div>
        <label>
          Kurztext
          <textarea data-slot-text="${slot.slotKey}" rows="2" placeholder="Was zeigt dieses Bild?"></textarea>
        </label>
      </div>
    `
    )
    .join("");
};

const handleAssignment = (slotKey, poolId) => {
  if (!activeComposer) {
    return;
  }
  const poolItem = poolItems.find((item) => item.id === poolId);
  if (!poolItem) {
    return;
  }

  activeComposer.assignments[slotKey] = {
    poolId,
    text: activeComposer.assignments[slotKey]?.text ?? "",
  };

  const preview = compositionArea.querySelector(`[data-slot-preview="${slotKey}"]`);
  if (!preview) {
    return;
  }

  preview.innerHTML = `
    <img src="${poolItem.url}" alt="${poolItem.name}" loading="lazy" />
    <div class="pool-meta">Pool-ID: ${poolItem.id}</div>
    <div class="pool-meta">Group-ID: ${poolItem.groupId ?? "empty"}</div>
  `;
};

const validateComposer = () => {
  if (!activeComposer) {
    message(compositionMessage, "Bitte zuerst auf Plus klicken und eine Vorlage wählen.", true);
    return;
  }

  const assignedSlots = Object.entries(activeComposer.assignments).filter(([, value]) => Boolean(value.poolId));
  if (activeComposer.type === "post" && assignedSlots.length !== 1) {
    message(compositionMessage, "Bei Post-Vorlagen muss genau ein Bild zugewiesen sein.", true);
    return;
  }

  if (activeComposer.type === "carousel" && assignedSlots.length < 2) {
    message(compositionMessage, "Bei Karussell-Vorlagen müssen mindestens zwei Bilder zugewiesen sein.", true);
    return;
  }

  const missingTextForAssigned = assignedSlots.some(([, value]) => !(value.text ?? "").trim());
  if (missingTextForAssigned) {
    message(compositionMessage, "Bitte für jedes zugewiesene Bild einen Kurztext eintragen.", true);
    return;
  }

  message(compositionMessage, "Prüfung erfolgreich. Du kannst im nächsten Schritt weiterverarbeiten.");
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

const getTemplateLabelById = (templateId) => {
  const match = imageEditingTemplateOptions.find((option) => option.id === templateId);
  if (!match) {
    return `Vorlage #${templateId}`;
  }
  return match.name ?? `Vorlage #${templateId}`;
};

const serializeCarouselStructure = () =>
  carouselSelection.map((templateId, index) => ({
    position: index + 1,
    template_id: templateId,
  }));

const syncSpecialRequirementsVisibility = () => {
  const visible = hasSpecialRequirementsInput.checked;
  specialRequirementsWrapper.classList.toggle("hidden", !visible);
  if (!visible) {
    specialRequirementsInput.value = "";
  }
};

const renderCarouselSelection = () => {
  if (!carouselSelection.length) {
    carouselSelectedList.innerHTML = "<li>Keine Bildbearbeitung gewählt.</li>";
    return;
  }

  carouselSelectedList.innerHTML = carouselSelection
    .map(
      (templateId, index) => `
      <li>
        <span>${index + 1}. ${getTemplateLabelById(templateId)}</span>
        <span class="carousel-controls">
          <button type="button" class="ghost carousel-up-btn" data-index="${index}" ${index === 0 ? "disabled" : ""}>↑</button>
          <button type="button" class="ghost carousel-down-btn" data-index="${index}" ${
            index === carouselSelection.length - 1 ? "disabled" : ""
          }>↓</button>
          <button type="button" class="danger carousel-remove-btn" data-index="${index}">Entfernen</button>
        </span>
      </li>
    `
    )
    .join("");
};

const syncTemplateTypeVisibility = () => {
  const isCarousel = templateTypeInput.value === "carousel";
  singleTemplateWrapper.classList.toggle("hidden", isCarousel);
  carouselTemplateWrapper.classList.toggle("hidden", !isCarousel);
};

const populateTemplateSelects = () => {
  if (!imageEditingTemplateOptions.length) {
    const fallbackOption = '<option value="">Keine Bildbearbeitungsvorlagen verfügbar</option>';
    singleTemplateSelect.innerHTML = fallbackOption;
    carouselTemplateSelect.innerHTML = fallbackOption;
    return;
  }

  const optionsHtml = imageEditingTemplateOptions
    .map((row) => `<option value="${row.id}">${row.name ?? `Vorlage #${row.id}`}</option>`)
    .join("");

  singleTemplateSelect.innerHTML = optionsHtml;
  carouselTemplateSelect.innerHTML = optionsHtml;
};

const renderContentTemplates = (rows) => {
  if (!rows.length) {
    contentTemplatesBody.innerHTML = `<tr><td colspan="6">Keine Vorlagen vorhanden.</td></tr>`;
    return;
  }

  contentTemplatesBody.innerHTML = rows
    .map((row) => {
      const imageEditingText =
        row.template_type === "post"
          ? getTemplateLabelById(row.image_editing_template_id)
          : (Array.isArray(row.carousel_structure) ? row.carousel_structure : [])
              .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
              .map((entry) => `${entry.position}. ${getTemplateLabelById(entry.template_id)}`)
              .join(" | ");
      return `
      <tr>
        <td>${row.name}</td>
        <td>${row.template_type === "post" ? "Post" : "Karussell"}</td>
        <td>${imageEditingText || "-"}</td>
        <td>${shortText(row.caption_requirements)}</td>
        <td>${shortText(row.hashtag_requirements)}</td>
        <td>${shortText(row.special_requirements ?? "-")}</td>
      </tr>
    `;
    })
    .join("");
};

const loadImageEditingTemplateOptions = async () => {
  const { data, error } = await supabase
    .from("image_editings")
    .select("id, name")
    .eq("template", true)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Bildbearbeitungsvorlagen konnten nicht geladen werden: ${error.message}`);
  }

  imageEditingTemplateOptions = data ?? [];
  populateTemplateSelects();
};

const loadContentTemplates = async () => {
  const { data, error } = await supabase.from("content_templates").select("*").order("created_at", { ascending: false });

  if (error) {
    message(contentTemplatesMessage, `Fehler beim Laden: ${error.message}`, true);
    return;
  }

  contentTemplateOptions = data ?? [];
  renderContentTemplates(data ?? []);
  message(contentTemplatesMessage, "");
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
  if (!bucketName) {
    throw new Error("Kein Storage-Bucket in der Konfiguration hinterlegt.");
  }

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

const createContentTemplate = async (payload) => {
  const { error } = await supabase.from("content_templates").insert(payload);
  if (error) {
    throw new Error(error.message);
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
  await loadImageEditingTemplateOptions();
  await loadContentTemplates();
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

  uploadPoolFilesBtn.addEventListener("click", () => poolFileInput.click());
  poolFileInput.addEventListener("change", async () => {
    const files = Array.from(poolFileInput.files ?? []);
    if (!files.length) {
      return;
    }

    const sharedGroupId = files.length > 1 ? crypto.randomUUID().slice(0, 8) : null;
    message(poolMessage, "Upload läuft …");

    try {
      for (const file of files) {
        const imageUrl = await uploadImage(file, resolveBucketName("imageEditingBucket", "imageBucket"));
        poolItems.unshift({
          id: crypto.randomUUID().slice(0, 8),
          groupId: sharedGroupId,
          name: file.name,
          url: imageUrl,
        });
      }

      renderPoolItems();
      message(
        poolMessage,
        files.length > 1
          ? `${files.length} Dateien als Gruppe ${sharedGroupId} hochgeladen.`
          : "Datei als Einzelbild in den Pool geladen."
      );
      poolFileInput.value = "";
    } catch (error) {
      message(poolMessage, `Upload fehlgeschlagen: ${error.message}`, true);
    }
  });

  createCompositionBtn.addEventListener("click", () => {
    if (!contentTemplateOptions.length) {
      message(compositionMessage, "Keine Vorlagen vorhanden. Bitte erst unter 'Vorlagen' anlegen.", true);
      return;
    }

    buildComposerMarkup();
    activeComposer = null;
    message(compositionMessage, "");
  });

  compositionArea.addEventListener("change", (event) => {
    const templateSelect = event.target.closest("#composer-template-select");
    if (templateSelect) {
      renderComposerSlots(templateSelect.value);
      message(compositionMessage, "");
      return;
    }

    const slotText = event.target.closest("[data-slot-text]");
    if (!slotText || !activeComposer) {
      return;
    }

    const slotKey = slotText.dataset.slotText;
    if (!slotKey || !activeComposer.assignments[slotKey]) {
      return;
    }

    activeComposer.assignments[slotKey].text = slotText.value;
  });

  compositionArea.addEventListener("click", (event) => {
    const nextBtn = event.target.closest("#composer-next");
    if (nextBtn) {
      validateComposer();
    }
  });

  document.addEventListener("dragstart", (event) => {
    const poolItem = event.target.closest(".pool-item");
    if (!poolItem) {
      return;
    }
    event.dataTransfer?.setData("text/plain", poolItem.dataset.poolId ?? "");
    event.dataTransfer.effectAllowed = "copy";
  });

  compositionArea.addEventListener("dragover", (event) => {
    const slot = event.target.closest(".drop-slot");
    if (!slot) {
      return;
    }

    event.preventDefault();
    slot.classList.add("drag-over");
  });

  compositionArea.addEventListener("dragleave", (event) => {
    const slot = event.target.closest(".drop-slot");
    if (!slot) {
      return;
    }

    slot.classList.remove("drag-over");
  });

  compositionArea.addEventListener("drop", (event) => {
    const slot = event.target.closest(".drop-slot");
    if (!slot) {
      return;
    }

    event.preventDefault();
    slot.classList.remove("drag-over");
    const poolId = event.dataTransfer?.getData("text/plain");
    const slotKey = slot.dataset.slotKey;
    if (!poolId || !slotKey) {
      return;
    }

    handleAssignment(slotKey, poolId);
    message(compositionMessage, "Bild zugewiesen.");
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
    await loadImageEditingTemplateOptions();
    await loadContentTemplates();
    message(imageEditingMessage, "Status aktualisiert.");
  });

  openTemplateModalBtn.addEventListener("click", async () => {
    templateForm.reset();
    carouselSelection = [];
    renderCarouselSelection();
    syncTemplateTypeVisibility();
    syncSpecialRequirementsVisibility();
    message(templateFormMessage, "");
    try {
      await loadImageEditingTemplateOptions();
      templateModal.showModal();
    } catch (err) {
      message(contentTemplatesMessage, err.message, true);
    }
  });

  cancelTemplateModalBtn.addEventListener("click", () => templateModal.close());
  templateTypeInput.addEventListener("change", syncTemplateTypeVisibility);
  hasSpecialRequirementsInput.addEventListener("change", syncSpecialRequirementsVisibility);

  addCarouselTemplateBtn.addEventListener("click", () => {
    if (carouselSelection.length >= 10) {
      message(templateFormMessage, "Maximal 10 Bildbearbeitungen für ein Karussell erlaubt.", true);
      return;
    }

    const templateId = Number(carouselTemplateSelect.value);
    if (!Number.isFinite(templateId)) {
      message(templateFormMessage, "Bitte zuerst eine gültige Bildbearbeitung wählen.", true);
      return;
    }

    carouselSelection.push(templateId);
    renderCarouselSelection();
    message(templateFormMessage, "");
  });

  carouselSelectedList.addEventListener("click", (event) => {
    const upBtn = event.target.closest(".carousel-up-btn");
    if (upBtn) {
      const index = Number(upBtn.dataset.index);
      if (index > 0) {
        [carouselSelection[index - 1], carouselSelection[index]] = [carouselSelection[index], carouselSelection[index - 1]];
        renderCarouselSelection();
      }
      return;
    }

    const downBtn = event.target.closest(".carousel-down-btn");
    if (downBtn) {
      const index = Number(downBtn.dataset.index);
      if (index < carouselSelection.length - 1) {
        [carouselSelection[index + 1], carouselSelection[index]] = [carouselSelection[index], carouselSelection[index + 1]];
        renderCarouselSelection();
      }
      return;
    }

    const removeBtn = event.target.closest(".carousel-remove-btn");
    if (removeBtn) {
      const index = Number(removeBtn.dataset.index);
      carouselSelection.splice(index, 1);
      renderCarouselSelection();
    }
  });

  templateForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const templateType = templateTypeInput.value;
    const name = templateNameInput.value.trim();
    const captionRequirements = captionRequirementsInput.value.trim();
    const hashtagRequirements = hashtagRequirementsInput.value.trim();
    const specialRequirements = hasSpecialRequirementsInput.checked ? specialRequirementsInput.value.trim() : "";

    if (!name || !captionRequirements || !hashtagRequirements) {
      message(templateFormMessage, "Name, Caption und Hashtags sind Pflichtfelder.", true);
      return;
    }

    if (hasSpecialRequirementsInput.checked && !specialRequirements) {
      message(templateFormMessage, "Bitte gib die speziellen Hinweise an.", true);
      return;
    }

    let imageEditingTemplateId = Number(singleTemplateSelect.value);
    let carouselStructure = null;

    if (templateType === "post") {
      if (!Number.isFinite(imageEditingTemplateId)) {
        message(templateFormMessage, "Für einen Post muss genau eine Bildbearbeitung gewählt werden.", true);
        return;
      }
    } else {
      if (!carouselSelection.length) {
        message(templateFormMessage, "Für ein Karussell musst du mindestens eine Bildbearbeitung hinzufügen.", true);
        return;
      }
      if (carouselSelection.length > 10) {
        message(templateFormMessage, "Für ein Karussell sind maximal 10 Bildbearbeitungen erlaubt.", true);
        return;
      }

      imageEditingTemplateId = carouselSelection[0];
      carouselStructure = serializeCarouselStructure();
    }

    try {
      message(templateFormMessage, "Vorlage wird gespeichert …");
      await createContentTemplate({
        template_type: templateType,
        name,
        caption_requirements: captionRequirements,
        hashtag_requirements: hashtagRequirements,
        special_requirements: specialRequirements || null,
        image_editing_template_id: imageEditingTemplateId,
        carousel_structure: carouselStructure,
      });
      templateModal.close();
      await loadContentTemplates();
      message(contentTemplatesMessage, "Vorlage gespeichert.");
    } catch (err) {
      message(templateFormMessage, `Speichern fehlgeschlagen: ${err.message}`, true);
    }
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
        loadContentTemplates();
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
  renderPoolItems();
  await checkSession();
};

init();
