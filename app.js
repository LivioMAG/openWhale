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
const poolFilterGroup = document.querySelector("#pool-filter-group");
const poolNewGroupNameInput = document.querySelector("#pool-new-group-name");
const poolCreateGroupBtn = document.querySelector("#pool-create-group");
const poolList = document.querySelector("#pool-list");
const poolMessage = document.querySelector("#pool-message");
const poolPreviewModal = document.querySelector("#pool-preview-modal");
const poolPreviewTitle = document.querySelector("#pool-preview-title");
const poolPreviewImage = document.querySelector("#pool-preview-image");
const poolPreviewVideo = document.querySelector("#pool-preview-video");
const closePoolPreviewBtn = document.querySelector("#close-pool-preview");
const openComposerTemplateModalBtn = document.querySelector("#open-composer-template-modal");
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
const editNameWrapper = document.querySelector("#edit-entry-name").closest("label");
const editTemplateInfoInput = document.querySelector("#edit-template-info");
const editTemplateInfoWrapper = document.querySelector("#edit-template-info").closest("label");
const editTemplateImgInput = document.querySelector("#edit-template-img");
const editTemplateImgWrapper = document.querySelector("#edit-template-img-wrapper");
const editTemplatePreview = document.querySelector("#edit-template-preview");
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
let poolGroupNames = {};
let activeComposer = null;
let activePoolFilterGroup = "__all__";

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

const getPoolGroupLabel = (groupId) => {
  if (!groupId) {
    return "Keine Gruppe";
  }
  return poolGroupNames[groupId] || `Gruppe ${groupId}`;
};

const getMediaTypeLabel = (type) => (type === "video" ? "Video" : "Foto");

const buildPoolItemPreview = (item) => {
  if (item.mediaType === "video") {
    return `<video class="pool-thumb" src="${item.url}" muted preload="metadata"></video>`;
  }
  return `<span class="pool-drag-photo" draggable="true" data-drag-pool-id="${item.id}" title="Foto in Slot ziehen"><img class="pool-thumb" src="${item.url}" alt="${item.name}" loading="lazy" /></span>`;
};

const renderPoolGroupOptions = () => {
  const options = Object.entries(poolGroupNames)
    .map(([groupId, label]) => `<option value="${groupId}">${label}</option>`)
    .join("");
  poolFilterGroup.innerHTML = `<option value="__all__">Alle Gruppen</option><option value="__none__">Ohne Gruppe</option>${options}`;
  poolFilterGroup.value = activePoolFilterGroup;
};

const renderPoolItems = () => {
  if (!poolItems.length) {
    poolList.innerHTML = "<p>Noch keine Medien vorhanden.</p>";
    renderPoolGroupOptions();
    return;
  }
  const groupActionRows = Object.entries(poolGroupNames)
    .map(
      ([groupId, label]) => `
      <tr>
        <td colspan="3"><strong>${label}</strong></td>
        <td>${groupId}</td>
        <td>
          <button type="button" class="icon-btn ghost" data-action="rename-group" data-group-id="${groupId}" title="Gruppe umbenennen">✎</button>
          <button type="button" class="icon-btn danger" data-action="delete-group" data-group-id="${groupId}" title="Gruppe löschen">🗑</button>
        </td>
      </tr>
    `
    )
    .join("");

  const visibleItems =
    activePoolFilterGroup === "__all__"
      ? poolItems
      : activePoolFilterGroup === "__none__"
        ? poolItems.filter((item) => !item.groupId)
        : poolItems.filter((item) => item.groupId === activePoolFilterGroup);

  const groupOptions = Object.entries(poolGroupNames)
    .map(([groupId, label]) => `<option value="${groupId}">${label}</option>`)
    .join("");

  const mediaRows = visibleItems
    .map(
      (item) => `
      <tr class="pool-item" data-pool-id="${item.id}">
        <td>
          <button type="button" class="pool-preview-btn" data-action="preview-item" data-pool-id="${item.id}">
            ${buildPoolItemPreview(item)}
          </button>
        </td>
        <td>${item.name}</td>
        <td>${getMediaTypeLabel(item.mediaType)}</td>
        <td>
          <select data-action="assign-group" data-pool-id="${item.id}">
            <option value="__none__" ${item.groupId ? "" : "selected"}>Ohne Gruppe</option>
            ${groupOptions.replace(`value="${item.groupId}"`, `value="${item.groupId}" selected`)}
          </select>
        </td>
        <td>
          <button type="button" class="icon-btn ghost" data-action="rename-item" data-pool-id="${item.id}" title="Datei umbenennen">✎</button>
          <button type="button" class="icon-btn ghost" data-action="clear-group" data-pool-id="${item.id}" title="Aus Gruppe lösen">⊘</button>
          <button type="button" class="icon-btn danger" data-action="delete-item" data-pool-id="${item.id}" title="Datei löschen">🗑</button>
        </td>
      </tr>
    `
    )
    .join("");

  poolList.innerHTML = `
    <div class="table-wrap">
      <table class="pool-assets-table">
        <thead>
          <tr><th>Vorschau</th><th>Name</th><th>Typ</th><th>Gruppe</th><th>Aktion</th></tr>
        </thead>
        <tbody>${mediaRows || '<tr><td colspan="5">Keine Medien für den aktuellen Filter.</td></tr>'}</tbody>
      </table>
    </div>
    ${groupActionRows ? `<div class="table-wrap"><table><thead><tr><th colspan="5">Gruppen</th></tr></thead><tbody>${groupActionRows}</tbody></table></div>` : ""}
  `;
  renderPoolGroupOptions();
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
      <div id="composer-slots" class="composer-slots-wrap"><p>Wähle zuerst eine Vorlage.</p></div>
      <button id="composer-next" type="button">Weiter</button>
    </div>
  `;
};

const buildComposerSlotsMarkup = (slots, assignments = {}) =>
  slots
    .map((slot, index) => {
      const templateLabel = getTemplateLabelById(slot.templateRef);
      const assigned = assignments[slot.slotKey];
      const assignedItem = assigned ? poolItems.find((item) => item.id === assigned.poolId) : null;
      const hasAssignedItem = Boolean(assignedItem);
      return `
      <div class="drop-slot" data-slot-key="${slot.slotKey}" draggable="true" data-slot-index="${index}">
        <div class="slot-head">
          <div class="slot-meta ${hasAssignedItem ? "hidden" : ""}" data-slot-meta="${slot.slotKey}">
            <strong>${slot.label}</strong>
            <span class="slot-template-label">${templateLabel}</span>
          </div>
          <button type="button" class="icon-btn ghost slot-info-btn" data-template-ref="${slot.templateRef}" title="Bildbearbeitung anzeigen">ⓘ</button>
        </div>
        <div class="slot-preview" data-slot-preview="${slot.slotKey}">
          ${
            hasAssignedItem
              ? assignedItem.mediaType === "video"
                ? `<video src="${assignedItem.url}" controls muted preload="metadata"></video>`
                : `<img src="${assignedItem.url}" alt="${assignedItem.name}" loading="lazy" />`
              : "Kein Bild zugewiesen."
          }
        </div>
      </div>
    `;
    })
    .join("");

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
    templateName: selectedTemplate.name,
    type: selectedTemplate.template_type,
    slots,
    assignments: {},
    postInfo: "",
    captionRequirements: selectedTemplate.caption_requirements ?? "",
    hashtagRequirements: selectedTemplate.hashtag_requirements ?? "",
    specialRequirements: selectedTemplate.special_requirements ?? "",
  };

  const slotMarkup = buildComposerSlotsMarkup(slots, activeComposer.assignments);

  slotsWrap.innerHTML = `
    <div class="composer-workspace">
      <label class="composer-post-info">
        Infos zum Post
        <textarea id="composer-post-info" rows="3" placeholder="Kurzinfo zum Post"></textarea>
      </label>
      <div class="composer-slots-track">${slotMarkup}</div>
    </div>
  `;
};

const reorderComposerSlots = (fromIndex, toIndex) => {
  if (!activeComposer || fromIndex === toIndex || fromIndex < 0 || toIndex < 0) {
    return;
  }
  if (fromIndex >= activeComposer.slots.length || toIndex >= activeComposer.slots.length) {
    return;
  }
  const [moved] = activeComposer.slots.splice(fromIndex, 1);
  activeComposer.slots.splice(toIndex, 0, moved);

  const slotsWrap = compositionArea.querySelector("#composer-slots");
  if (!slotsWrap) {
    return;
  }
  const slotMarkup = buildComposerSlotsMarkup(activeComposer.slots, activeComposer.assignments);
  slotsWrap.innerHTML = `
    <div class="composer-workspace">
      <label class="composer-post-info">
        Infos zum Post
        <textarea id="composer-post-info" rows="3" placeholder="Kurzinfo zum Post">${activeComposer.postInfo ?? ""}</textarea>
      </label>
      <div class="composer-slots-track">${slotMarkup}</div>
    </div>
  `;
};

const handleAssignment = (slotKey, poolId) => {
  if (!activeComposer) {
    return;
  }
  const poolItem = poolItems.find((item) => item.id === poolId);
  if (!poolItem) {
    return;
  }

  activeComposer.assignments[slotKey] = { poolId };

  const preview = compositionArea.querySelector(`[data-slot-preview="${slotKey}"]`);
  if (!preview) {
    return;
  }
  const slotMeta = compositionArea.querySelector(`[data-slot-meta="${slotKey}"]`);
  slotMeta?.classList.add("hidden");

  preview.innerHTML =
    poolItem.mediaType === "video"
      ? `<video src="${poolItem.url}" controls muted preload="metadata"></video>`
      : `<img src="${poolItem.url}" alt="${poolItem.name}" loading="lazy" />`;
};

const openPoolPreview = (item) => {
  if (!item) {
    return;
  }
  poolPreviewTitle.textContent = item.name;
  const isVideo = item.mediaType === "video";
  poolPreviewImage.classList.toggle("hidden", isVideo);
  poolPreviewVideo.classList.toggle("hidden", !isVideo);
  if (isVideo) {
    poolPreviewVideo.src = item.url;
    poolPreviewVideo.load();
  } else {
    poolPreviewImage.src = item.url;
    poolPreviewImage.alt = item.name;
  }
  poolPreviewModal.showModal();
};

const removePoolItem = (poolId) => {
  const next = poolItems.filter((item) => item.id !== poolId);
  if (next.length === poolItems.length) {
    return false;
  }

  poolItems = next;
  if (activeComposer) {
    for (const [slotKey, assignment] of Object.entries(activeComposer.assignments)) {
      if (assignment?.poolId === poolId) {
        delete activeComposer.assignments[slotKey];
        const preview = compositionArea.querySelector(`[data-slot-preview="${slotKey}"]`);
        const slotMeta = compositionArea.querySelector(`[data-slot-meta="${slotKey}"]`);
        slotMeta?.classList.remove("hidden");
        if (preview) {
          preview.textContent = "Kein Bild zugewiesen.";
        }
      }
    }
  }

  return true;
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

  if (!(activeComposer.postInfo ?? "").trim()) {
    message(compositionMessage, "Bitte einmalige Infos zum Post eintragen.", true);
    return;
  }

  const selectedTemplate = contentTemplateOptions.find((item) => item.id === activeComposer.templateId);
  const usedSlots = activeComposer.slots
    .map((slot, index) => ({ slot, index, assignment: activeComposer.assignments[slot.slotKey] }))
    .filter((entry) => Boolean(entry.assignment?.poolId))
    .map(({ slot, index, assignment }) => {
      const media = poolItems.find((item) => item.id === assignment.poolId);
      const templateOption = getTemplateOptionById(slot.templateRef);
      return {
        position: index + 1,
        slot: slot.slotKey,
        type: media?.mediaType ?? "image",
        file_name: media?.name ?? "",
        file_url: media?.url ?? "",
        image_editing_id: slot.templateRef,
        image_editing_name: templateOption?.name ?? getTemplateLabelById(slot.templateRef),
        image_editing_instructions: templateOption?.editing_instructions ?? null,
      };
    });

  const summaryPayload = {
    content_type: activeComposer.type,
    is_carousel: activeComposer.type === "carousel",
    template: {
      id: selectedTemplate?.id ?? activeComposer.templateId,
      name: selectedTemplate?.name ?? activeComposer.templateName,
    },
    post_info: activeComposer.postInfo.trim(),
    caption_requirements: activeComposer.captionRequirements,
    hashtag_requirements: activeComposer.hashtagRequirements,
    special_requirements: activeComposer.specialRequirements || null,
    media_items: usedSlots,
  };

  const prettySummary = [
    `Vorlage: ${summaryPayload.template.name} (#${summaryPayload.template.id})`,
    `Typ: ${summaryPayload.is_carousel ? "Karussell" : "Post"}`,
    `Kurzinfo: ${summaryPayload.post_info}`,
    `Caption: ${summaryPayload.caption_requirements || "-"}`,
    `Hashtags: ${summaryPayload.hashtag_requirements || "-"}`,
    `Spezielle Hinweise: ${summaryPayload.special_requirements || "-"}`,
    "",
    "JSONB-Vorschau:",
    JSON.stringify(summaryPayload, null, 2),
  ].join("\n");

  openTextModal("Zusammenfassung für Weiter", prettySummary);
  message(compositionMessage, "Prüfung erfolgreich. Zusammenfassung wurde geöffnet.");
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
          )}" data-active="${isActive}" data-template="${Boolean(row.template)}" data-variable-template-text="${Boolean(
            row.variable_template_text
          )}" title="Bearbeiten" ${isActive ? "disabled" : ""}>
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

const getTemplateOptionById = (templateId) => imageEditingTemplateOptions.find((option) => option.id === templateId);

const getTemplateLabelById = (templateId) => {
  const match = getTemplateOptionById(templateId);
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
    .select("id, name, editing_instructions")
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

const loadPoolAssets = async () => {
  const { data, error } = await supabase.from("media_assets").select("*").order("created_at", { ascending: false });
  if (error) {
    throw new Error(error.message);
  }

  poolItems = (data ?? []).map((row) => ({
    id: row.id,
    groupId: row.group_id,
    name: row.name,
    url: row.file_url,
    mediaType: row.media_type,
    rating: row.rating,
  }));

  poolGroupNames = {};
  for (const row of data ?? []) {
    if (row.group_id && row.group_name) {
      poolGroupNames[row.group_id] = row.group_name;
    }
  }
  renderPoolItems();
};

const createMediaAsset = async (payload) => {
  const { error } = await supabase.from("media_assets").insert(payload);
  if (error) {
    throw new Error(error.message);
  }
};

const updateMediaAsset = async (assetId, payload) => {
  const { error } = await supabase.from("media_assets").update(payload).eq("id", assetId);
  if (error) {
    throw new Error(error.message);
  }
};

const renameMediaGroup = async (groupId, groupName) => {
  const { error } = await supabase.from("media_assets").update({ group_name: groupName }).eq("group_id", groupId);
  if (error) {
    throw new Error(error.message);
  }
};

const deleteMediaAsset = async (assetId) => {
  const { error } = await supabase.from("media_assets").delete().eq("id", assetId);
  if (error) {
    throw new Error(error.message);
  }
};

const deleteMediaGroup = async (groupId) => {
  const { error } = await supabase.from("media_assets").delete().eq("group_id", groupId);
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
  try {
    await loadPoolAssets();
  } catch (error) {
    message(poolMessage, `Medien konnten nicht geladen werden: ${error.message}`, true);
  }
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

    message(poolMessage, "Upload läuft …");

    try {
      for (const file of files) {
        const fileUrl = await uploadImage(file, resolveBucketName("mediaBucket", "imageBucket"));
        const mediaType = file.type.startsWith("video/") ? "video" : "image";
        await createMediaAsset({
          name: file.name,
          media_type: mediaType,
          file_url: fileUrl,
          group_id: null,
          group_name: null,
          rating: null,
        });
      }

      await loadPoolAssets();
      message(
        poolMessage,
        files.length > 1 ? `${files.length} Medien wurden hochgeladen.` : "Medium wurde hochgeladen."
      );
      poolFileInput.value = "";
    } catch (error) {
      message(poolMessage, `Upload fehlgeschlagen: ${error.message}`, true);
    }
  });

  poolList.addEventListener("click", async (event) => {
    const actionBtn = event.target.closest("[data-action]");
    if (!actionBtn) {
      return;
    }

    const action = actionBtn.dataset.action;
    if (action === "preview-item") {
      const poolId = actionBtn.dataset.poolId;
      const item = poolItems.find((entry) => entry.id === poolId);
      openPoolPreview(item);
      return;
    }

    if (action === "rename-item") {
      const poolId = actionBtn.dataset.poolId;
      const item = poolItems.find((entry) => entry.id === poolId);
      if (!item) {
        return;
      }
      const newName = window.prompt("Neuer Bildname", item.name);
      if (!newName) {
        return;
      }
      item.name = newName.trim() || item.name;
      try {
        await updateMediaAsset(poolId, { name: item.name });
        await loadPoolAssets();
        message(poolMessage, "Dateiname wurde aktualisiert.");
      } catch (error) {
        message(poolMessage, `Umbenennen fehlgeschlagen: ${error.message}`, true);
      }
      return;
    }

    if (action === "delete-item") {
      const poolId = actionBtn.dataset.poolId;
      const item = poolItems.find((entry) => entry.id === poolId);
      if (!item) {
        return;
      }

      const confirmed = window.confirm(`Bild "${item.name}" wirklich löschen?`);
      if (!confirmed) {
        return;
      }

      try {
        await deleteMediaAsset(poolId);
        removePoolItem(poolId);
        await loadPoolAssets();
        message(poolMessage, "Medium wurde gelöscht.");
      } catch (error) {
        message(poolMessage, `Löschen fehlgeschlagen: ${error.message}`, true);
      }
      return;
    }

    if (action === "clear-group") {
      const poolId = actionBtn.dataset.poolId;
      try {
        await updateMediaAsset(poolId, {
          group_id: null,
          group_name: null,
        });
        await loadPoolAssets();
        message(poolMessage, "Medium wurde aus der Gruppe gelöst.");
      } catch (error) {
        message(poolMessage, `Gruppenwechsel fehlgeschlagen: ${error.message}`, true);
      }
      return;
    }

    if (action === "rename-group") {
      const groupId = actionBtn.dataset.groupId;
      if (!groupId) {
        return;
      }
      const currentName = getPoolGroupLabel(groupId);
      const newName = window.prompt("Neuer Gruppenname", currentName);
      if (!newName) {
        return;
      }
      try {
        const nextName = newName.trim() || currentName;
        await renameMediaGroup(groupId, nextName);
        await loadPoolAssets();
        message(poolMessage, "Gruppenname wurde aktualisiert.");
      } catch (error) {
        message(poolMessage, `Gruppe konnte nicht umbenannt werden: ${error.message}`, true);
      }
      return;
    }

    if (action === "delete-group") {
      const groupId = actionBtn.dataset.groupId;
      if (!groupId) {
        return;
      }
      const groupName = getPoolGroupLabel(groupId);
      const confirmed = window.confirm(`Gruppe "${groupName}" mit allen Bildern löschen?`);
      if (!confirmed) {
        return;
      }

      try {
        await deleteMediaGroup(groupId);
        await loadPoolAssets();
        message(poolMessage, `Gruppe "${groupName}" wurde gelöscht.`);
      } catch (error) {
        message(poolMessage, `Gruppe konnte nicht gelöscht werden: ${error.message}`, true);
      }
    }
  });

  poolList.addEventListener("change", async (event) => {
    const select = event.target.closest('[data-action="assign-group"]');
    if (!select) {
      return;
    }
    const poolId = select.dataset.poolId;
    const nextGroupId = select.value === "__none__" ? null : select.value;
    try {
      await updateMediaAsset(poolId, {
        group_id: nextGroupId,
        group_name: nextGroupId ? getPoolGroupLabel(nextGroupId) : null,
      });
      await loadPoolAssets();
      message(poolMessage, "Gruppe wurde aktualisiert.");
    } catch (error) {
      message(poolMessage, `Gruppenwechsel fehlgeschlagen: ${error.message}`, true);
    }
  });

  poolFilterGroup.addEventListener("change", () => {
    activePoolFilterGroup = poolFilterGroup.value || "__all__";
    renderPoolItems();
  });

  poolCreateGroupBtn.addEventListener("click", () => {
    const groupName = poolNewGroupNameInput.value.trim();
    if (!groupName) {
      message(poolMessage, "Bitte zuerst einen Gruppennamen eingeben.", true);
      return;
    }
    const groupId = crypto.randomUUID().slice(0, 8);
    poolGroupNames[groupId] = groupName;
    poolNewGroupNameInput.value = "";
    renderPoolItems();
    message(poolMessage, `Gruppe "${groupName}" erstellt. Du kannst Medien im Table zuweisen.`);
  });

  openComposerTemplateModalBtn.addEventListener("click", () => {
    const isOpen = !compositionArea.classList.contains("hidden");
    if (isOpen) {
      compositionArea.classList.add("hidden");
      message(compositionMessage, "");
      return;
    }

    compositionArea.classList.remove("hidden");
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

    const postInfoInput = event.target.closest("#composer-post-info");
    if (!postInfoInput || !activeComposer) {
      return;
    }
    activeComposer.postInfo = postInfoInput.value;
  });

  compositionArea.addEventListener("click", (event) => {
    const slotInfoBtn = event.target.closest(".slot-info-btn");
    if (slotInfoBtn) {
      const templateRef = Number(slotInfoBtn.dataset.templateRef);
      const templateOption = getTemplateOptionById(templateRef);
      openTextModal(
        `Bildbearbeitung: ${templateOption?.name ?? `Vorlage #${templateRef}`}`,
        templateOption?.editing_instructions || "Keine Bildbearbeitung hinterlegt."
      );
      return;
    }

    const nextBtn = event.target.closest("#composer-next");
    if (nextBtn) {
      validateComposer();
    }
  });

  compositionArea.addEventListener("dragstart", (event) => {
    const slot = event.target.closest(".drop-slot");
    if (!slot) {
      return;
    }
    const slotIndex = Number(slot.dataset.slotIndex);
    if (!Number.isFinite(slotIndex)) {
      return;
    }
    event.dataTransfer?.setData("text/slot-index", String(slotIndex));
    event.dataTransfer.effectAllowed = "move";
  });

  document.addEventListener("dragstart", (event) => {
    const dragMedia = event.target.closest("[data-drag-pool-id]");
    if (!dragMedia) {
      return;
    }
    event.dataTransfer?.setData("text/plain", dragMedia.dataset.dragPoolId ?? "");
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
    const draggedSlot = Number(event.dataTransfer?.getData("text/slot-index"));
    const dropSlotIndex = Number(slot.dataset.slotIndex);
    if (Number.isFinite(draggedSlot) && Number.isFinite(dropSlotIndex) && activeComposer?.type === "carousel") {
      reorderComposerSlots(draggedSlot, dropSlotIndex);
      message(compositionMessage, "Slots wurden neu sortiert.");
      return;
    }

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

  closePoolPreviewBtn.addEventListener("click", () => {
    poolPreviewVideo.pause();
    poolPreviewModal.close();
  });

  templateImgInput.addEventListener("change", () => setPreview(templateImgInput, templatePreview));
  isTemplateInput.addEventListener("change", syncTemplateVisibility);
  templateHasVariableTextInput.addEventListener("change", syncTemplateInfoVisibility);

  refreshImageEditingBtn.addEventListener("click", async () => {
    message(imageEditingMessage, "Status wird aktualisiert …");
    await loadImageEditings();
    await loadImageEditingTemplateOptions();
    await loadContentTemplates();
    await loadPoolAssets();
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

      const hasTemplate = editBtn.dataset.template === "true";
      const hasVariableTemplateText = editBtn.dataset.variableTemplateText === "true";
      editEntryIdInput.value = editBtn.dataset.id;
      editEntryNameInput.value = decodeURIComponent(editBtn.dataset.name ?? "");
      editTemplateInfoInput.value = decodeURIComponent(editBtn.dataset.templateInfo ?? "");
      editEditingInstructionsInput.value = decodeURIComponent(editBtn.dataset.editingInstructions ?? "");
      editNameWrapper.classList.toggle("hidden", !hasTemplate);
      editTemplateInfoWrapper.classList.toggle("hidden", !hasTemplate || !hasVariableTemplateText);
      editTemplateImgWrapper.classList.toggle("hidden", !hasTemplate);
      editTemplateImgInput.value = "";
      editTemplatePreview.classList.add("hidden");
      editTemplatePreview.removeAttribute("src");
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

  editTemplateImgInput.addEventListener("change", () => {
    const [file] = editTemplateImgInput.files || [];
    if (!file) {
      editTemplatePreview.classList.add("hidden");
      editTemplatePreview.removeAttribute("src");
      return;
    }

    editTemplatePreview.src = URL.createObjectURL(file);
    editTemplatePreview.classList.remove("hidden");
  });

  editForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const id = Number(editEntryIdInput.value);
    const name = editEntryNameInput.value.trim();
    const templateInfo = editTemplateInfoInput.value.trim();
    const editingInstructions = editEditingInstructionsInput.value.trim();
    const allowTemplateFields = !editNameWrapper.classList.contains("hidden");
    const allowTemplateInfo = !editTemplateInfoWrapper.classList.contains("hidden");

    if (!Number.isFinite(id)) {
      message(editMessage, "Ungültige ID.", true);
      return;
    }
    if (!editingInstructions) {
      message(editMessage, "Bildbearbeitung ist ein Pflichtfeld.", true);
      return;
    }
    if (allowTemplateFields && !name) {
      message(editMessage, "Bitte gib einen Namen ein.", true);
      return;
    }

    try {
      message(editMessage, "Speichern läuft …");
      const payload = {
        editing_instructions: editingInstructions,
      };
      if (allowTemplateFields) {
        payload.name = name;
        const [templateImgFile] = editTemplateImgInput.files || [];
        if (templateImgFile) {
          payload.template_img_url = await uploadImage(templateImgFile, appConfig.storage.templateBucket);
        }
      }
      if (allowTemplateInfo) {
        payload.template_info = templateInfo || null;
      }
      await updateImageEditingEntry(id, payload);
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
