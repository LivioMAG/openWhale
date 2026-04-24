export function feedbackBox(feedback) {
  if (!feedback) return "";
  return `<p class="feedback feedback--${feedback.type}">${feedback.message}</p>`;
}

export function inputField({ id, label, type = "text", value = "", required = true, autocomplete = "off" }) {
  return `<div class="form-group">
    <label for="${id}">${label}</label>
    <input id="${id}" name="${id}" type="${type}" value="${value}" ${required ? "required" : ""} autocomplete="${autocomplete}" />
  </div>`;
}
