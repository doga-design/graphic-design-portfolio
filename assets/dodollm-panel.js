(function initDodoLLMPanel() {
  "use strict";

  const PANEL_HTML = `
    <div class="dodollm-backdrop" data-dodollm-backdrop aria-hidden="true"></div>
    <aside
      class="dodollm-panel"
      data-dodollm-panel
      aria-label="dodoLLM chat"
      aria-hidden="true"
    >
      <header class="dodollm-panel__topbar">
        <div class="dodollm-panel__brand">
          <span class="dodollm-panel__label">DODOLLM</span>
          <button
            type="button"
            class="dodollm-panel__icon-btn"
            data-dodollm-info
            aria-label="About dodoLLM"
          >ⓘ</button>
        </div>
        <div class="dodollm-panel__actions" aria-label="dodoLLM controls">
          <span class="dodollm-panel__divider" aria-hidden="true"></span>
          <button
            type="button"
            class="dodollm-panel__icon-btn"
            data-dodollm-reset
            aria-label="Reset chat"
          >↺</button>
          <button
            type="button"
            class="dodollm-panel__icon-btn"
            data-dodollm-close
            aria-label="Close dodoLLM"
          >×</button>
        </div>
      </header>

      <div class="dodollm-panel__chat" data-dodollm-chat>
        <div class="dodollm-messages" data-dodollm-messages></div>
        <section class="dodollm-empty" data-dodollm-empty aria-label="Suggested prompts">
          <img
            class="dodollm-empty__mascot"
            src="assets/dodo-mascot-vectorized.webp"
            alt=""
            width="168"
            height="168"
            decoding="async"
          />
          <p class="dodollm-empty__greeting">Hey there, I'm dodoLLM.</p>
          <div class="dodollm-suggestions" data-dodollm-initial-suggestions></div>
        </section>
      </div>

      <form class="dodollm-panel__input-bar" data-dodollm-form>
        <input
          class="dodollm-panel__input"
          data-dodollm-input
          type="text"
          placeholder="Ask dodo..."
          autocomplete="off"
        />
        <button class="dodollm-panel__send" type="submit" aria-label="Send message">↑</button>
      </form>
    </aside>
  `;

  function injectDodollmShell() {
    if (document.querySelector("[data-dodollm-panel]")) return;

    const host = document.querySelector(".app-shell") || document.body;
    if (!document.querySelector(".app-shell")) {
      document.body.classList.add("dodollm-standalone");
    }

    const wrap = document.createElement("div");
    wrap.innerHTML = PANEL_HTML.trim();
    while (wrap.firstChild) {
      host.appendChild(wrap.firstChild);
    }
  }

  injectDodollmShell();

  const dockButton = document.querySelector('[data-dock-id="dodollm"]');
  const panel = document.querySelector("[data-dodollm-panel]");
  const backdrop = document.querySelector("[data-dodollm-backdrop]");
  const closeButton = document.querySelector("[data-dodollm-close]");
  const resetButton = document.querySelector("[data-dodollm-reset]");
  const infoButton = document.querySelector("[data-dodollm-info]");
  const chat = document.querySelector("[data-dodollm-chat]");
  const messages = document.querySelector("[data-dodollm-messages]");
  const emptyState = document.querySelector("[data-dodollm-empty]");
  const initialSuggestions = document.querySelector("[data-dodollm-initial-suggestions]");
  const form = document.querySelector("[data-dodollm-form]");
  const input = document.querySelector("[data-dodollm-input]");
  const sendButton = form?.querySelector(".dodollm-panel__send");

  if (
    !panel ||
    !backdrop ||
    !closeButton ||
    !resetButton ||
    !infoButton ||
    !chat ||
    !messages ||
    !emptyState ||
    !initialSuggestions ||
    !form ||
    !input
  ) {
    return;
  }

  const initialPrompts = [
    "What kind of work do you do?",
    "Tell me about Bountt",
    "What's your design process?",
  ];

  const followUpPrompts = [
    "What makes your process different?",
    "How do you approach a new project?",
    "What tools do you use?",
  ];

  const API_ENDPOINT = "/api/chat";
  const MAX_HISTORY_MESSAGES = 10;
  const DEFAULT_INPUT_PLACEHOLDER = input.getAttribute("placeholder") || "Ask dodo...";
  const THINKING_TEXT = "Thinking";
  const ERROR_RESPONSE =
    "I had trouble reaching dodoLLM just now. Try again in a moment.";

  let hasOpened = false;
  let typingTimer = null;
  let conversationMessages = [];
  let isWaitingForResponse = false;
  let activeRequestId = 0;
  let scrollLockListenersActive = false;
  let scrollLockCount = 0;

  const SCROLL_KEYS = new Set([
    " ",
    "PageUp",
    "PageDown",
    "ArrowUp",
    "ArrowDown",
    "Home",
    "End",
  ]);

  const isScrollAllowedTarget = (target) => {
    if (!(target instanceof Node)) return false;
    return panel.contains(target);
  };

  const preventBackgroundScroll = (event) => {
    if (!document.body.classList.contains("dodollm-lock-scroll")) return;
    if (isScrollAllowedTarget(event.target)) return;
    event.preventDefault();
  };

  const preventScrollKeys = (event) => {
    if (!document.body.classList.contains("dodollm-lock-scroll")) return;
    if (SCROLL_KEYS.has(event.key)) event.preventDefault();
  };

  const lockBackgroundScroll = () => {
    scrollLockCount += 1;
    if (scrollLockCount > 1) return;

    document.documentElement.classList.add("dodollm-lock-scroll");
    document.body.classList.add("dodollm-lock-scroll");

    if (!scrollLockListenersActive) {
      scrollLockListenersActive = true;
      window.addEventListener("wheel", preventBackgroundScroll, {
        passive: false,
      });
      window.addEventListener("touchmove", preventBackgroundScroll, {
        passive: false,
      });
      window.addEventListener("keydown", preventScrollKeys);
    }
  };

  const unlockBackgroundScroll = () => {
    if (scrollLockCount === 0) return;
    scrollLockCount -= 1;
    if (scrollLockCount > 0) return;

    document.documentElement.classList.remove("dodollm-lock-scroll");
    document.body.classList.remove("dodollm-lock-scroll");

    if (scrollLockListenersActive) {
      scrollLockListenersActive = false;
      window.removeEventListener("wheel", preventBackgroundScroll);
      window.removeEventListener("touchmove", preventBackgroundScroll);
      window.removeEventListener("keydown", preventScrollKeys);
    }
  };

  const isOverlayPanel = () =>
    window.matchMedia("(max-width: 1287px)").matches ||
    document.body.classList.contains("dodollm-standalone");
  const overlayMq = window.matchMedia("(max-width: 1287px)");

  function syncPanelLayout() {
    const isOpen = panel.classList.contains("is-open");
    const overlay = isOverlayPanel();
    document.body.classList.toggle("dodollm-panel-open", isOpen);
    panel.setAttribute("aria-hidden", isOpen ? "false" : "true");

    if (overlay) {
      backdrop.classList.toggle("is-open", isOpen);
      backdrop.setAttribute("aria-hidden", isOpen ? "false" : "true");
      if (isOpen) lockBackgroundScroll();
      else unlockBackgroundScroll();
    } else {
      backdrop.classList.remove("is-open");
      backdrop.setAttribute("aria-hidden", "true");
      unlockBackgroundScroll();
    }

    document.dispatchEvent(
      new CustomEvent("dodollm-panel-change", { detail: { isOpen } })
    );
  }

  function isPanelOpen() {
    return panel.classList.contains("is-open");
  }

  function openPanel() {
    if (isPanelOpen()) return;
    document.body.classList.add("dodollm-panel-animating");
    panel.classList.add("is-open");
    syncPanelLayout();

    if (!hasOpened) {
      dockButton?.querySelector(".dock__badge")?.remove();
      hasOpened = true;
    }
  }

  function closePanel() {
    if (!isPanelOpen()) return;
    document.body.classList.add("dodollm-panel-animating");
    panel.classList.remove("is-open");
    syncPanelLayout();
  }

  function togglePanel() {
    if (isPanelOpen()) closePanel();
    else openPanel();
  }

  function handleClickOutside(event) {
    if (!isPanelOpen()) return;
    const target = event.target;
    if (!(target instanceof Node)) return;
    if (panel.contains(target)) return;
    if (dockButton?.contains(target)) return;
    if (document.querySelector("[data-mobile-ai-fab]")?.contains(target)) return;
    closePanel();
  }

  panel.addEventListener("transitionend", (event) => {
    if (event.target !== panel) return;

    if (event.propertyName === "width") {
      document.body.classList.remove("dodollm-panel-animating");
      return;
    }

    if (event.propertyName === "transform") {
      document.body.classList.remove("dodollm-panel-animating");
    }
  });

  function makeSuggestion(prompt) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "dodollm-chip";
    button.textContent = prompt;
    button.addEventListener("click", () => submitPrompt(prompt));
    return button;
  }

  function renderInitialState() {
    if (typingTimer) {
      window.clearInterval(typingTimer);
      typingTimer = null;
    }

    activeRequestId += 1;
    conversationMessages = [];
    setWaitingState(false);
    messages.replaceChildren();
    initialSuggestions.replaceChildren(
      ...initialPrompts.map((prompt) => makeSuggestion(prompt))
    );
    emptyState.hidden = false;
    input.value = "";
  }

  function renderFollowUps() {
    const divider = document.createElement("hr");
    divider.className = "dodollm-divider";
    messages.append(divider);

    const suggestions = document.createElement("div");
    suggestions.className = "dodollm-suggestions";
    followUpPrompts.forEach((prompt) => suggestions.append(makeSuggestion(prompt)));
    messages.append(suggestions);
  }

  function scrollChatToBottom() {
    chat.scrollTop = chat.scrollHeight;
  }

  function setWaitingState(isWaiting) {
    isWaitingForResponse = isWaiting;
    input.disabled = isWaiting;
    input.setAttribute(
      "placeholder",
      isWaiting ? "dodo is thinking..." : DEFAULT_INPUT_PLACEHOLDER
    );

    if (sendButton) {
      sendButton.disabled = isWaiting;
    }
  }

  function renderUserMessage(text) {
    const user = document.createElement("div");
    user.className = "dodollm-message-user";
    user.textContent = text;
    messages.append(user);
  }

  function renderBotMessage(text) {
    const bot = document.createElement("div");
    bot.className = "dodollm-message-bot";
    bot.textContent = text;
    messages.append(bot);
    scrollChatToBottom();
    return bot;
  }

  function renderLoadingBubble() {
    const bot = document.createElement("div");
    bot.className = "dodollm-message-bot";
    bot.textContent = THINKING_TEXT;

    const cursor = document.createElement("span");
    cursor.className = "dodollm-cursor";
    cursor.textContent = "|";
    bot.append(cursor);

    messages.append(bot);
    scrollChatToBottom();
    return bot;
  }

  function streamBotResponse(text, onDone) {
    const bot = document.createElement("div");
    bot.className = "dodollm-message-bot";
    messages.append(bot);

    const cursor = document.createElement("span");
    cursor.className = "dodollm-cursor";
    cursor.textContent = "|";

    let index = 0;
    if (typingTimer) window.clearInterval(typingTimer);

    typingTimer = window.setInterval(() => {
      bot.textContent = text.slice(0, index);
      bot.append(cursor);
      index += 1;
      scrollChatToBottom();

      if (index > text.length) {
        window.clearInterval(typingTimer);
        typingTimer = null;
        cursor.remove();
        bot.textContent = text;
        onDone?.();
        scrollChatToBottom();
      }
    }, 18);
  }

  async function submitPrompt(rawPrompt) {
    const prompt = rawPrompt.trim();
    if (!prompt || isWaitingForResponse) return;

    if (typingTimer) {
      window.clearInterval(typingTimer);
      typingTimer = null;
    }

    emptyState.hidden = true;
    messages
      .querySelectorAll(".dodollm-divider, .dodollm-suggestions")
      .forEach((el) => el.remove());

    renderUserMessage(prompt);
    input.value = "";
    scrollChatToBottom();

    conversationMessages.push({ role: "user", content: prompt });

    const requestId = activeRequestId + 1;
    activeRequestId = requestId;
    const loadingBubble = renderLoadingBubble();
    setWaitingState(true);

    try {
      const response = await fetch(API_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: conversationMessages.slice(-MAX_HISTORY_MESSAGES),
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || typeof data.content !== "string" || !data.content.trim()) {
        throw new Error(data.error || "Unable to reach dodoLLM.");
      }

      if (requestId !== activeRequestId) return;

      const content = data.content.trim();
      conversationMessages.push({ role: "assistant", content });
      loadingBubble.remove();
      streamBotResponse(content, renderFollowUps);
    } catch {
      if (requestId !== activeRequestId) return;

      const lastMessage = conversationMessages[conversationMessages.length - 1];
      if (lastMessage?.role === "user" && lastMessage.content === prompt) {
        conversationMessages.pop();
      }

      loadingBubble.remove();
      renderBotMessage(ERROR_RESPONSE);
    } finally {
      if (requestId === activeRequestId) {
        setWaitingState(false);
        input.focus();
      }
    }
  }

  dockButton?.addEventListener("click", (event) => {
    event.stopPropagation();
    togglePanel();
  });

  document.addEventListener("click", handleClickOutside);
  backdrop.addEventListener("click", closePanel);
  closeButton.addEventListener("click", closePanel);
  resetButton.addEventListener("click", renderInitialState);
  infoButton.addEventListener("click", () => console.log("dodoLLM v0.1"));

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    submitPrompt(input.value);
  });

  function handleWindowResize() {
    syncPanelLayout();
  }

  overlayMq.addEventListener("change", syncPanelLayout);
  window.addEventListener("resize", handleWindowResize);
  renderInitialState();

  window.openDodollmPanel = openPanel;

  if (location.hash === "#dodollm") {
    requestAnimationFrame(() => openPanel());
  }

  window.addEventListener("hashchange", () => {
    if (location.hash === "#dodollm") openPanel();
  });
})();
