type TooltipOptions = {
  id: string;
  text: string;
  ariaLabel: string;
};

export function createTooltip(doc: Document, options: TooltipOptions): HTMLSpanElement {
  const wrapper = doc.createElement("span");
  wrapper.className = "carbonrank-tooltip";

  const trigger = doc.createElement("button");
  trigger.type = "button";
  trigger.className = "carbonrank-tooltip__trigger";
  trigger.setAttribute("aria-label", options.ariaLabel);
  trigger.setAttribute("aria-describedby", options.id);
  trigger.textContent = "?";

  const content = doc.createElement("span");
  content.className = "carbonrank-tooltip__content";
  content.id = options.id;
  content.setAttribute("role", "tooltip");
  content.textContent = options.text;

  wrapper.append(trigger, content);
  return wrapper;
}
