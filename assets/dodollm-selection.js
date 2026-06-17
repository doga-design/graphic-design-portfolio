(function initDodollmSelection() {
  "use strict";

  const PANEL_SELECTOR = "[data-dodollm-panel]";
  const FORM_SELECTOR = "[data-dodollm-form]";
  const INPUT_SELECTOR = "[data-dodollm-input]";
  const API_ENDPOINT = "/api/chat";
  const GAP_ABOVE = 10;
  const VIEWPORT_MARGIN = 8;
  const QUOTE_PLACEHOLDER = "Ask about this...";
  const DEFAULT_PLACEHOLDER = "Ask dodo...";

  let selectedText = "";
  let attachedQuote = "";
  let pendingQuestion = "";
  let selectionButton = null;
  let quoteBlock = null;
  let originalFetch = null;
  let selectionButtonPressText = "";
  let lastSelectionButtonActivation = 0;

  function getPanel() {
    return document.querySelector(PANEL_SELECTOR);
  }

  function getForm() {
    return document.querySelector(FORM_SELECTOR);
  }

  function getInput() {
    return document.querySelector(INPUT_SELECTOR);
  }

  function normalizeText(text) {
    return text.replace(/\s+/g, " ").trim();
  }

  function isInsidePanel(node) {
    const panel = getPanel();
    return Boolean(panel && node && panel.contains(node));
  }

  function isPanelOpen() {
    return getPanel()?.classList.contains("is-open") ?? false;
  }

  function getSelectionRect(selection) {
    if (!selection || selection.rangeCount === 0) return null;

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    if (rect.width > 0 || rect.height > 0) return rect;

    return [...range.getClientRects()].find((clientRect) => {
      return clientRect.width > 0 || clientRect.height > 0;
    }) ?? null;
  }

  function getSelectionContainer(selection) {
    if (!selection || selection.rangeCount === 0) return null;
    return selection.getRangeAt(0).commonAncestorContainer;
  }

  function ensureSelectionButton() {
    if (selectionButton) return selectionButton;

    selectionButton = document.createElement("button");
    selectionButton.type = "button";
    selectionButton.className = "dodollm-selection-trigger";
    selectionButton.setAttribute("aria-label", "Ask DodoGPT about selected text");
    selectionButton.innerHTML = `
      <svg class="dodollm-selection-trigger__icon" viewBox="0 0 66 81" aria-hidden="true">
        <use href="assets/icons.svg#icon-dodollm-sparkle" />
      </svg>
      <span class="dodollm-selection-trigger__label">Ask DodoGPT</span>
    `;

    selectionButton.addEventListener("mousedown", (event) => {
      event.preventDefault();
      selectionButtonPressText = selectedText || selectionButton.dataset.selectedText || "";
    });
    selectionButton.addEventListener("touchstart", (event) => {
      selectionButtonPressText = selectedText || selectionButton.dataset.selectedText || "";
      event.stopPropagation();
    }, { passive: true });
    selectionButton.addEventListener("touchend", handleSelectionButtonClick);
    selectionButton.addEventListener("pointerup", (event) => {
      if (event.pointerType === "mouse") return;
      handleSelectionButtonClick(event);
    });
    selectionButton.addEventListener("click", handleSelectionButtonClick);

    document.body.append(selectionButton);
    return selectionButton;
  }

  function hideSelectionButton() {
    if (!selectionButton) {
      selectedText = "";
      return;
    }

    selectedText = "";
    delete selectionButton.dataset.selectedText;
    selectionButton.classList.remove("is-visible", "is-repositioning");
  }

  function setSelectionButtonPosition(rect) {
    const button = ensureSelectionButton();
    const bounds = button.getBoundingClientRect();
    const halfWidth = bounds.width || button.offsetWidth / 2 || 0;
    let centerX = rect.left + rect.width / 2;

    centerX = Math.min(
      window.innerWidth - VIEWPORT_MARGIN - halfWidth,
      Math.max(VIEWPORT_MARGIN + halfWidth, centerX)
    );

    button.style.left = `${centerX}px`;
    button.style.top = `${rect.top}px`;
    button.style.setProperty("--dodollm-selection-gap", `${GAP_ABOVE}px`);
  }

  function positionSelectionButton(rect) {
    const button = ensureSelectionButton();
    const wasVisible = button.classList.contains("is-visible");

    setSelectionButtonPosition(rect);

    if (wasVisible) {
      button.classList.add("is-repositioning");
      return;
    }

    button.classList.remove("is-visible");
    void button.offsetWidth;
    requestAnimationFrame(() => {
      setSelectionButtonPosition(rect);
      button.classList.add("is-visible");
    });
  }

  function showSelectionButton(rect, text) {
    selectedText = text;
    ensureSelectionButton().dataset.selectedText = text;
    positionSelectionButton(rect);
  }

  function repositionVisibleButton() {
    if (!selectionButton?.classList.contains("is-visible")) return;

    const selection = window.getSelection();
    const text = normalizeText(selection?.toString() ?? "");
    if (!text) {
      hideSelectionButton();
      return;
    }

    const container = getSelectionContainer(selection);
    if (isInsidePanel(container?.nodeType === Node.ELEMENT_NODE ? container : container?.parentElement)) {
      hideSelectionButton();
      return;
    }

    const rect = getSelectionRect(selection);
    if (!rect) {
      hideSelectionButton();
      return;
    }

    selectedText = text;
    positionSelectionButton(rect);
  }

  function updateSelectionButton() {
    window.setTimeout(() => {
      if (isPanelOpen()) {
        hideSelectionButton();
        return;
      }

      const selection = window.getSelection();
      const text = normalizeText(selection?.toString() ?? "");
      if (!text) {
        hideSelectionButton();
        return;
      }

      const container = getSelectionContainer(selection);
      if (isInsidePanel(container?.nodeType === Node.ELEMENT_NODE ? container : container?.parentElement)) {
        hideSelectionButton();
        return;
      }

      const rect = getSelectionRect(selection);
      if (!rect) {
        hideSelectionButton();
        return;
      }

      showSelectionButton(rect, text);
    }, 0);
  }

  function clearInputState() {
    const input = getInput();
    if (!input) return;

    input.value = "";
    input.placeholder = input.dataset.dodollmDefaultPlaceholder || DEFAULT_PLACEHOLDER;
  }

  function clearQuote() {
    attachedQuote = "";
    pendingQuestion = "";
    quoteBlock?.remove();
    quoteBlock = null;
    getForm()?.classList.remove("has-dodollm-selection-quote");
    clearInputState();
  }

  function createQuoteIcon() {
    const icon = document.createElement("span");
    icon.className = "dodollm-selection-quote__icon";
    icon.setAttribute("aria-hidden", "true");
    icon.innerHTML = `
      <svg viewBox="0 0 88 72" aria-hidden="true">
        <use href="assets/icons.svg#icon-quote" />
      </svg>
    `;
    return icon;
  }

  function createQuoteElement(text, { removable = false } = {}) {
    const quote = document.createElement("div");
    quote.className = "dodollm-selection-quote";
    quote.dataset.dodollmSelectionQuote = "1";

    const body = document.createElement("div");
    body.className = "dodollm-selection-quote__body";

    const quoteText = document.createElement("div");
    quoteText.className = "dodollm-selection-quote__text";
    quoteText.textContent = text;

    body.append(createQuoteIcon(), quoteText);
    quote.append(body);

    if (removable) {
      quote.classList.add("dodollm-selection-quote--input");

      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.className = "dodollm-selection-quote__remove";
      removeButton.setAttribute("aria-label", "Remove selected text quote");
      removeButton.textContent = "×";
      removeButton.addEventListener("click", clearQuote);

      quote.append(removeButton);
      return quote;
    }

    quote.classList.add("dodollm-selection-quote--chat");
    return quote;
  }

  function injectChatQuote(quoteText, userQuestion) {
    const messages = document.querySelector("[data-dodollm-messages]");
    if (!messages || !quoteText || !userQuestion) return;

    const userMessages = messages.querySelectorAll(".dodollm-message-user");
    const lastUser = userMessages[userMessages.length - 1];
    if (!lastUser) return;

    if (normalizeText(lastUser.textContent) !== userQuestion) return;
    if (lastUser.previousElementSibling?.matches("[data-dodollm-selection-chat-quote]")) return;

    const wrap = document.createElement("div");
    wrap.className = "dodollm-selection-chat-quote";
    wrap.dataset.dodollmSelectionChatQuote = "1";
    wrap.append(createQuoteElement(quoteText));

    messages.insertBefore(wrap, lastUser);
  }

  function renderQuote(text) {
    const form = getForm();
    const input = getInput();
    if (!form || !input) return;

    input.dataset.dodollmDefaultPlaceholder =
      input.dataset.dodollmDefaultPlaceholder ||
      input.getAttribute("placeholder") ||
      DEFAULT_PLACEHOLDER;

    quoteBlock?.remove();
    quoteBlock = createQuoteElement(text, { removable: true });
    form.classList.add("has-dodollm-selection-quote");
    form.prepend(quoteBlock);

    input.value = "";
    input.placeholder = QUOTE_PLACEHOLDER;
    input.focus();
  }

  function handleSelectionButtonClick(event) {
    event.preventDefault();
    event.stopPropagation();

    const now = Date.now();
    if (now - lastSelectionButtonActivation < 450) return;
    lastSelectionButtonActivation = now;

    const quote = selectedText || selectionButtonPressText || selectionButton?.dataset.selectedText || "";
    if (!quote) return;

    selectionButtonPressText = "";
    hideSelectionButton();
    window.openDodollmPanel?.();
    attachedQuote = quote;

    requestAnimationFrame(() => {
      renderQuote(quote);
    });
  }

  function isChatRequest(resource) {
    if (typeof resource === "string") return resource === API_ENDPOINT;
    if (resource instanceof URL) return resource.pathname === API_ENDPOINT;
    if (resource instanceof Request) return new URL(resource.url, window.location.href).pathname === API_ENDPOINT;
    return false;
  }

  function getRequestBody(init) {
    if (!init || typeof init.body !== "string") return null;

    try {
      return JSON.parse(init.body);
    } catch {
      return null;
    }
  }

  function withQuoteContext(body) {
    if (!attachedQuote || !pendingQuestion || !Array.isArray(body?.messages)) return body;

    const messages = [...body.messages];
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index];
      if (message?.role !== "user" || typeof message.content !== "string") continue;

      messages[index] = {
        ...message,
        content: `Referring to this from the page: "${attachedQuote}" — ${pendingQuestion}`,
      };
      return { ...body, messages };
    }

    return body;
  }

  function installFetchPatch() {
    if (originalFetch || typeof window.fetch !== "function") return;

    originalFetch = window.fetch.bind(window);
    window.fetch = function dodollmSelectionFetch(resource, init) {
      if (!isChatRequest(resource)) {
        return originalFetch(resource, init);
      }

      const body = getRequestBody(init);
      if (!body) {
        return originalFetch(resource, init);
      }

      const nextBody = withQuoteContext(body);
      return originalFetch(resource, {
        ...init,
        body: JSON.stringify(nextBody),
      });
    };
  }

  function handleFormCapture() {
    const input = getInput();
    pendingQuestion = attachedQuote && input && !input.disabled ? normalizeText(input.value) : "";
  }

  function handleFormSubmit() {
    if (!attachedQuote || !pendingQuestion) return;

    const quoteForChat = attachedQuote;
    const questionForChat = pendingQuestion;

    window.setTimeout(() => {
      injectChatQuote(quoteForChat, questionForChat);
      clearQuote();
    }, 0);
  }

  function handleDocumentPointer(event) {
    if (selectionButton?.contains(event.target) || quoteBlock?.contains(event.target)) return;
    if (isInsidePanel(event.target)) return;

    if (selectionButton?.classList.contains("is-visible")) {
      hideSelectionButton();
      return;
    }

    const selection = window.getSelection();
    if (!normalizeText(selection?.toString() ?? "")) {
      hideSelectionButton();
    }
  }

  function initFormListeners() {
    const form = getForm();
    if (!form || form.dataset.dodollmSelectionReady) return;

    form.dataset.dodollmSelectionReady = "1";
    form.addEventListener("submit", handleFormCapture, true);
    form.addEventListener("submit", handleFormSubmit);
  }

  function observePanelOpen() {
    const panel = getPanel();
    if (!panel) return;

    const observer = new MutationObserver(() => {
      if (isPanelOpen()) hideSelectionButton();
    });
    observer.observe(panel, { attributes: true, attributeFilter: ["class"] });
  }

  document.addEventListener("mouseup", updateSelectionButton);
  document.addEventListener("touchend", updateSelectionButton);
  document.addEventListener("scroll", repositionVisibleButton, true);
  window.addEventListener("resize", repositionVisibleButton);
  document.addEventListener("selectionchange", () => {
    if (selectionButtonPressText) return;
    if (!normalizeText(window.getSelection()?.toString() ?? "")) {
      hideSelectionButton();
    }
  });
  document.addEventListener("click", handleDocumentPointer);
  document.addEventListener("keyup", (event) => {
    if (event.key === "Escape") hideSelectionButton();
  });

  installFetchPatch();
  initFormListeners();
  observePanelOpen();
})();
