(function initDodoLLMPanel() {
  "use strict";

  const PANEL_HTML = `
    <div class="dodollm-backdrop" data-dodollm-backdrop aria-hidden="true"></div>
    <aside
      class="dodollm-panel"
      data-dodollm-panel
      aria-label="dodoGPT chat"
      aria-hidden="true"
    >
      <header class="dodollm-panel__topbar">
        <div class="dodollm-panel__brand">
          <span class="dodollm-panel__label">DODOGPT</span>
          <div class="dodollm-info-wrap">
            <button
              type="button"
              class="dodollm-panel__icon-btn"
              data-dodollm-info
              aria-label="About dodoGPT"
              aria-expanded="false"
              aria-describedby="dodollm-info-disclaimer"
            >ⓘ</button>
            <div
              class="dodollm-info-disclaimer"
              id="dodollm-info-disclaimer"
              data-dodollm-info-disclaimer
              role="tooltip"
              aria-hidden="true"
            >
              dodoGPT is an AI chatbot powered by OpenAI's GPT-4o. May contain hallucinations.
            </div>
          </div>
        </div>
        <div class="dodollm-panel__actions" aria-label="dodoGPT controls">
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
            aria-label="Close dodoGPT"
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
          <p class="dodollm-empty__greeting">Hey, I'm DodoGPT.</p>
          <div class="dodollm-suggestions" data-dodollm-initial-suggestions></div>
        </section>
      </div>

      <div class="dodollm-thinking-row" data-dodollm-thinking hidden></div>

      <form class="dodollm-panel__input-bar" data-dodollm-form>
        <input
          class="dodollm-panel__input"
          data-dodollm-input
          type="text"
          placeholder="Ask dodo..."
          autocomplete="off"
          maxlength="1200"
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

  const OPENAI_ICON_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z" fill="currentColor"/></svg>';

  function buildInfoDisclaimerMarkup() {
    return `dodoGPT is an AI chatbot powered by <span class="dodollm-info-disclaimer__openai">${OPENAI_ICON_SVG}OpenAI</span>'s GPT-4o. May contain hallucinations.`;
  }

  function ensureInfoDisclaimerMarkup() {
    const button = document.querySelector("[data-dodollm-info]");
    if (!button) return null;

    let wrap = button.closest(".dodollm-info-wrap");
    if (!wrap) {
      const brand = button.closest(".dodollm-panel__brand");
      if (!brand) return null;

      wrap = document.createElement("div");
      wrap.className = "dodollm-info-wrap";
      brand.insertBefore(wrap, button);
      wrap.append(button);
    }

    let disclaimer = wrap.querySelector("[data-dodollm-info-disclaimer]");
    if (!disclaimer) {
      disclaimer = document.createElement("div");
      disclaimer.className = "dodollm-info-disclaimer";
      disclaimer.id = "dodollm-info-disclaimer";
      disclaimer.dataset.dodollmInfoDisclaimer = "1";
      disclaimer.setAttribute("role", "tooltip");
      disclaimer.setAttribute("aria-hidden", "true");
      wrap.append(disclaimer);
    }

    disclaimer.innerHTML = buildInfoDisclaimerMarkup();

    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-describedby", "dodollm-info-disclaimer");

    return { button, wrap, disclaimer };
  }

  function ensureThinkingRowMarkup() {
    const formEl = document.querySelector("[data-dodollm-form]");
    if (!formEl) return null;

    let row = document.querySelector("[data-dodollm-thinking]");
    if (!row) {
      row = document.createElement("div");
      row.className = "dodollm-thinking-row";
      row.dataset.dodollmThinking = "1";
      row.hidden = true;
      formEl.parentElement?.insertBefore(row, formEl);
    }

    return row;
  }

  const infoMarkup = ensureInfoDisclaimerMarkup();

  const dockButton = document.querySelector('[data-dock-id="dodollm"]');
  const panel = document.querySelector("[data-dodollm-panel]");
  const backdrop = document.querySelector("[data-dodollm-backdrop]");
  const closeButton = document.querySelector("[data-dodollm-close]");
  const resetButton = document.querySelector("[data-dodollm-reset]");
  const infoButton = infoMarkup?.button ?? null;
  const infoDisclaimer = infoMarkup?.disclaimer ?? null;
  const infoWrap = infoMarkup?.wrap ?? null;
  const chat = document.querySelector("[data-dodollm-chat]");
  const messages = document.querySelector("[data-dodollm-messages]");
  const emptyState = document.querySelector("[data-dodollm-empty]");
  const initialSuggestions = document.querySelector("[data-dodollm-initial-suggestions]");
  const form = document.querySelector("[data-dodollm-form]");
  const input = document.querySelector("[data-dodollm-input]");
  const thinkingRow = ensureThinkingRowMarkup();
  const sendButton = form?.querySelector(".dodollm-panel__send");
  const MAX_INPUT_CHARS = 1200;

  if (
    !panel ||
    !backdrop ||
    !closeButton ||
    !resetButton ||
    !infoButton ||
    !infoDisclaimer ||
    !infoWrap ||
    !chat ||
    !messages ||
    !emptyState ||
    !initialSuggestions ||
    !form ||
    !input ||
    !thinkingRow
  ) {
    return;
  }

  input.maxLength = MAX_INPUT_CHARS;

  const DEFAULT_INITIAL_PROMPTS = [
    "What kind of work do you do?",
    "Tell me about Bountt",
    "Tell me about your internal design tool project.",
  ];

  const DEFAULT_FOLLOW_UP_PROMPTS = [
    "What makes your process different?",
    "How do you approach a new project?",
    "What tools do you use?",
  ];

  const CASE_STUDY_PROMPTS = {
    bountt: {
      initial: [
        "What problem was Bountt solving?",
        "What did the research reveal?",
        "How did you approach the solution?",
      ],
      followUp: [
        "How does Bountt reduce financial tension in groups?",
        "What did you ship and what were the results?",
        "What tools did you use on this project?",
      ],
    },
    visugenie: {
      initial: [
        "What was wrong with the VisuGenie landing page?",
        "How does intent-based onboarding work?",
        "What did you ship on the website?",
      ],
      followUp: [
        "How did you cut download friction by 60%?",
        "What was your design process on this project?",
        "What would you improve next?",
      ],
    },
    "distro-disco": {
      initial: [
        "What problem was Distro Disco solving?",
        "What did user research uncover?",
        "How does the interaction system work?",
      ],
      followUp: [
        "How does the mutual aid workflow function?",
        "What did the live prototype demonstrate?",
        "What tools did you use on this project?",
      ],
    },
    ctrlbreak: {
      initial: [
        "What was the CTRLBREAK exhibition about?",
        "How did you develop the visual language?",
        "What role did the pitchbook play?",
      ],
      followUp: [
        "How does the identity system hold together?",
        "What was special about the physical print piece?",
        "What did you learn from this project?",
      ],
    },
    since67: {
      initial: [
        "What is the Since '67 campaign concept?",
        "How does the poster tool work?",
        "What was the motion teaser meant to do?",
      ],
      followUp: [
        "How does the campaign engage Leafs fans?",
        "What makes the interactive poster tool unique?",
        "What tools did you use on this project?",
      ],
    },
    "design-system": {
      initial: [
        "What problem does this design system solve?",
        "What did the research phase uncover?",
        "How do the safeguards work?",
      ],
      followUp: [
        "What rules govern the system?",
        "How can someone try the demo?",
        "What did you learn building this?",
      ],
    },
  };

  const SUGGESTION_WORK_OVERRIDES = {
    "Tell me about your internal design tool project.": ["since67"],
  };

  const SUGGESTION_FALLBACK_ANSWER =
    "I can answer that directly if you type it in, but this shortcut is still being wired up.";

  const SUGGESTION_ANSWERS = {
    "What kind of work do you do?":
      "I work across product design, UX, branding, motion, and frontend development — building digital experiences end-to-end.",
    "Tell me about Bountt":
      "Bountt is a live React-based expense app I designed and built to reduce the awkwardness around shared costs. I focused on making group expenses feel clearer, calmer, and less transactional.",
    "Tell me about your internal design tool project.":
      "I built an internal poster-design tool around the Since '67 Leafs campaign concept. It turns a visual system into something interactive, so designers can generate campaign posters while the brand rules stay consistent, without needing any tools.",
    "What makes your process different?":
      "I move between design and code instead of treating them as separate handoffs, and I bring years of real business experience from a family operation — logistics, sales, and client work — so I think about outcomes and constraints, not just screens.",
    "How do you approach a new project?":
      "I start by clarifying the problem, the audience, and what needs to change for the user. Then I move through research, structure, visual direction, prototyping, and iteration until the work feels useful and coherent.",
    "What tools do you use?":
      "I work across design, build, and AI-native workflows.\n\n- **Figma:** Primary tool for UI, systems, and prototyping.\n- **Cursor:** My main environment for coded prototypes and AI-assisted dev.\n- **Adobe suite:** Illustrator, Photoshop, After Effects, and friends for brand and motion.\n- **HTML / CSS / JS:** For shipped and interactive work in the browser.",

    "What problem was Bountt solving?":
      "Bountt was solving the tension that shows up when people share costs but do not have a simple, transparent way to settle them. The product makes shared expenses easier to track, understand, and resolve without creating social friction.",
    "What did the research reveal?":
      "The research showed that the hard part was not only calculating money, it was the emotional awkwardness around asking, reminding, and settling. That pushed me toward flows that feel clear, lightweight, and low-pressure.",
    "How did you approach the solution?":
      "I approached Bountt as both a product and interaction problem. I designed the core expense flow around clarity, built it in React, and kept reducing steps until the experience felt fast without becoming vague.",
    "How does Bountt reduce financial tension in groups?":
      "It reduces tension by making the status of shared costs visible and easy to act on. Instead of relying on memory or uncomfortable reminders, the app gives the group a calmer shared source of truth.",
    "What did you ship and what were the results?":
      "I shipped a live React-based expense app with the core flows needed to add, track, and settle shared costs. The result is a working product rather than just a static concept, which let me validate the experience more realistically.",
    "What tools did you use on this project?":
      "For this project I used Figma for product design and prototyping, then React, HTML, CSS, and JavaScript for the build. Cursor helped me move faster between design decisions and implementation details.",

    "What was wrong with the VisuGenie landing page?":
      "The landing page was not doing enough to explain the product quickly or guide visitors toward downloading. I reworked the structure and messaging so the value was clearer earlier in the page.",
    "How does intent-based onboarding work?":
      "The idea was to shape the experience around what visitors were trying to do, instead of pushing everyone through the same generic path. That made the flow feel more relevant and helped reduce friction before download.",
    "What did you ship on the website?":
      "I shipped a rebuilt landing page system for VisuGenie with clearer positioning, stronger flow, and a cleaner path to download. The work helped reduce churn and cut download friction by 60%.",
    "How did you cut download friction by 60%?":
      "I focused on removing uncertainty before the download moment. That meant clarifying the value proposition, improving page flow, and making the next action easier to understand and trust.",
    "What was your design process on this project?":
      "I started by identifying where the existing page was losing people, then rebuilt the experience around clearer intent and stronger conversion flow. From there I iterated on copy, hierarchy, and interaction until the page felt more direct.",
    "What would you improve next?":
      "I would keep testing the onboarding path after download and connect more of the landing-page promise to the first product moments. That is where small UX improvements can have a big effect on retention.",

    "What problem was Distro Disco solving?":
      "Distro Disco needed a better way to support a mobile free store and make mutual aid logistics easier to manage. I designed a platform that helps people donate, browse, and understand the flow without making the system feel transactional.",
    "What did user research uncover?":
      "The research showed that trust, clarity, and accessibility mattered as much as the interface itself. People needed to understand what was available, how donations worked, and where they fit into the mutual aid process.",
    "How does the interaction system work?":
      "The interaction system uses guided flows, clear visual states, and prototype demos to make donation and browsing actions feel understandable. The goal was to keep the experience friendly while still handling real logistical complexity.",
    "How does the mutual aid workflow function?":
      "The workflow supports both donation and discovery. A person can understand what the mobile free store needs, contribute items, and browse available resources through a structure that keeps the community context visible.",
    "What did the live prototype demonstrate?":
      "The live prototype demonstrated the key product moments, including donation flow, collection browsing, and interaction feedback. It made the concept tangible enough to evaluate beyond static screens.",
    "What tools did you use on this project?":
      "I used Figma for UX and visual design, then built coded prototype moments with HTML, CSS, and JavaScript. The combination helped me test motion, scrolling, and interaction details directly in the browser.",

    "What was the CTRLBREAK exhibition about?":
      "CTRLBREAK was an exhibition identity for a Neville Brody retrospective. The project explored expressive typography, disruption, and editorial energy through a system that could extend across digital and print touchpoints.",
    "How did you develop the visual language?":
      "I developed the visual language around tension, contrast, and typographic interruption. The goal was to reference Brody's influence without simply imitating it, so the system had its own rhythm and point of view.",
    "What role did the pitchbook play?":
      "The pitchbook acted as a physical anchor for the exhibition concept. It brought the identity, rationale, and visual system into a tactile format that could sell the direction clearly.",
    "How does the identity system hold together?":
      "It holds together through consistent typographic behavior, contrast, pacing, and a clear attitude across applications. Even when layouts feel expressive, the underlying rules keep the system recognizable.",
    "What was special about the physical print piece?":
      "The print piece gave the identity a material presence. It let the typography, pacing, and exhibition story be experienced as an object, not only as a screen-based presentation.",
    "What did you learn from this project?":
      "I learned how much expressive design still needs structure underneath it. The work pushed me to balance experimentation with rules that make a system usable across formats.",

    "What is the Since '67 campaign concept?":
      "Since '67 is a campaign system for Leafs fans that owns the long wait since the last championship instead of hiding from it. The concept turns frustration, loyalty, and ritual into a visual identity fans can participate in.",
    "How does the poster tool work?":
      "The poster tool lets people generate campaign posters inside a controlled visual system. It gives users room to participate while keeping typography, layout, and brand behavior consistent.",
    "What was the motion teaser meant to do?":
      "The motion teaser was meant to set the tone of the campaign quickly. It brings the identity to life through pacing, tension, and fan energy before someone even reaches the static poster system.",
    "How does the campaign engage Leafs fans?":
      "It engages fans by treating the wait as shared culture. Instead of only celebrating victory, the campaign gives people a way to express loyalty, humor, and frustration through the identity.",
    "What makes the interactive poster tool unique?":
      "The tool turns a brand system into an experience. People are not just looking at campaign assets, they can make something inside the system and feel how the rules shape the output.",
    "What tools did you use on this project?":
      "I used Figma for the identity and system design, After Effects for motion thinking, and browser-based code for the interactive poster tool. The project sits right between branding, motion, and product interaction.",

    "What problem does this design system solve?":
      "This design system solves the problem of keeping AI-generated or fast-moving interface work consistent. It creates reusable rules and safeguards so speed does not break usability or brand coherence.",
    "What did the research phase uncover?":
      "The research phase uncovered where inconsistency usually enters the process: unclear rules, one-off components, and decisions made too late. That shaped the system around guidance, constraints, and reusable patterns.",
    "How do the safeguards work?":
      "The safeguards work by making the preferred design choices easier to follow than ignore. They guide layout, component use, and interaction behavior so the system can scale without relying on memory.",
    "What rules govern the system?":
      "The system is governed by rules for structure, spacing, hierarchy, component behavior, and content clarity. Those rules give designers and builders enough constraint to move quickly without flattening the brand.",
    "How can someone try the demo?":
      "Someone can try the demo from the design system case study. It is meant to show how the rules behave in practice, not just describe them as documentation.",
    "What did you learn building this?":
      "I learned that a useful design system is less about making a library and more about shaping decisions. The best systems reduce ambiguity while still leaving enough room for the product to evolve.",
  };

  const works = [
    {
      key: "visugenie",
      aliases: ["visugenie", "visu genie", "amsterdam ai", "download friction", "churn"],
      title:
        "Reduced churn, cut download friction by 60%, and rebuilt landing page for an Amsterdam AI startup.",
      image: "assets/visugenie-assets/visugenie-thumb.webp",
      alt: "VisuGenie landing page thumbnail",
      href: "case-study-visugenie.html",
    },
    {
      key: "bountt",
      aliases: ["bountt", "expense", "expense app", "shared expenses"],
      title: "Built React-Based Expense App That Removes Financial Tension",
      image: "assets/bount-thumb-2.webp",
      alt: "Bountt app thumbnail with dark blue gradient background",
      href: "case-study-bountt.html",
    },
    {
      key: "distro-disco",
      aliases: ["distro disco", "mutual aid", "mobile free store", "free store"],
      title: "Designed a mutual aid platform for Distro Disco's mobile free store.",
      image: "assets/dd-assets/ddthumb.webp",
      alt: "Distro Disco mobile app prototype thumbnail",
      href: "case-study-distro-disco.html",
    },
    {
      key: "ctrlbreak",
      aliases: ["ctrlbreak", "ctrl break", "neville brody", "exhibition", "pitchbook"],
      title: "Exhibition identity for a Neville Brody retrospective & physical pitchbook print",
      image: "assets/ctrlbreak-assets/ctrl-break-thumb.webp",
      alt: "CTRLBREAK exhibition identity thumbnail",
      href: "case-study-ctrlbreak.html",
    },
    {
      key: "since67",
      aliases: [
        "since 67",
        "since '67",
        "since67",
        "leafs",
        "poster tool",
        "internal design tool",
        "internal tool",
      ],
      title: "Campaign system for Leafs fans that owns the wait since 1967.",
      image: "assets/since67-thumb.webp",
      alt: "Since '67 campaign thumbnail",
      href: "case-study-since67.html",
    },
    {
      key: "macos-app",
      aliases: ["macos", "native app", "vibe coders", "coming soon", "under the hood"],
      title:
        "A macOS native app that helps vibe coders and designers understand what's actually happening under the hood, in real time.",
      image: "assets/work3-thumb.webp",
      alt: "Coming soon macOS native app thumbnail",
    },
  ];

  const API_ENDPOINT = "/api/chat";
  const MAX_HISTORY_MESSAGES = 10;
  const MAX_PAGE_CONTEXT_CHARS = 14000;
  const CASE_STUDY_SLUGS = new Set([
    "bountt",
    "visugenie",
    "distro-disco",
    "ctrlbreak",
    "since67",
    "design-system",
  ]);
  const DEFAULT_INPUT_PLACEHOLDER = input.getAttribute("placeholder") || "Ask dodo...";
  const THINKING_TEXT = "Thinking";
  const ERROR_RESPONSE =
    "I had trouble reaching dodoGPT just now. Try again in a moment.";
  const MAX_ERROR_MESSAGE_CHARS = 180;
  const SIGNATURE_TOOLTIP = "I'm Doga's AI assistant, what's up?";
  const SIGNATURE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="66" height="81" viewBox="0 0 66 81" fill="none" aria-hidden="true"><path d="M64.3824 38.9155H52.6746C52.6746 38.9155 52.628 38.9261 52.61 38.9261L51.8855 38.8101C43.0975 37.3686 36.2034 30.6184 34.7397 22.0047L34.6214 21.2945C34.6214 21.2945 34.6321 21.2488 34.6321 21.2313L34.6285 1.5926C34.6285 0.720699 33.904 0 33.0037 0C32.1034 0 31.3788 0.710177 31.3788 1.5926V21.2213C31.3788 21.2213 31.3896 21.2671 31.3896 21.2846L31.2712 21.9948C29.8005 30.6084 22.9136 37.3655 14.1255 38.8002L13.4009 38.9162C13.4009 38.9162 13.3543 38.9056 13.3363 38.9056L1.62486 38.9092C0.735296 38.9092 0 39.6193 0 40.5018C0 41.3842 0.724561 42.0944 1.62486 42.0944H13.3327C13.3327 42.0944 13.3793 42.0838 13.3972 42.0838L14.1218 42.1998C22.9098 43.6413 29.8038 50.3915 31.2675 59.0052L31.3859 59.7154C31.3859 59.7154 31.3751 59.7611 31.3751 59.7786V79.4074C31.3751 80.2793 32.0997 81 33 81C33.9003 81 34.6249 80.2898 34.6249 79.4074V59.7786C34.6249 59.7786 34.6141 59.7329 34.6141 59.7154L34.7325 59.0052C36.2032 50.3916 43.0901 43.6345 51.8782 42.1998L52.6028 42.0838C52.6028 42.0838 52.6494 42.0944 52.6673 42.0944H64.3751C65.2647 42.0944 66 41.3842 66 40.5018C66 39.6193 65.2754 38.9092 64.3751 38.9092L64.3824 38.9155Z" fill="currentColor"/></svg>`;

  let hasOpened = false;
  let typingTimer = null;
  let conversationMessages = [];
  let isWaitingForResponse = false;
  let activeRequestId = 0;
  let currentRequestController = null;
  let infoDisclaimerOpen = false;
  let infoDisclaimerCloseTimer = null;
  let signatureTipOpen = false;
  let scrollLockListenersActive = false;

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
    if (isScrollAllowedTarget(event.target)) return;
    if (SCROLL_KEYS.has(event.key)) event.preventDefault();
  };

  const syncBackgroundScrollLock = (shouldLock) => {
    if (shouldLock) {
      if (scrollLockListenersActive) return;

      document.documentElement.classList.add("dodollm-lock-scroll");
      document.body.classList.add("dodollm-lock-scroll");
      scrollLockListenersActive = true;
      window.addEventListener("wheel", preventBackgroundScroll, {
        passive: false,
      });
      window.addEventListener("touchmove", preventBackgroundScroll, {
        passive: false,
      });
      window.addEventListener("keydown", preventScrollKeys);
      return;
    }

    if (!scrollLockListenersActive) return;

    document.documentElement.classList.remove("dodollm-lock-scroll");
    document.body.classList.remove("dodollm-lock-scroll");
    scrollLockListenersActive = false;
    window.removeEventListener("wheel", preventBackgroundScroll);
    window.removeEventListener("touchmove", preventBackgroundScroll);
    window.removeEventListener("keydown", preventScrollKeys);
  };

  const isOverlayPanel = () =>
    window.matchMedia("(max-width: 1287px)").matches ||
    document.body.classList.contains("dodollm-standalone");
  const overlayMq = window.matchMedia("(max-width: 1287px)");
  const shouldLockBackgroundScroll = () => overlayMq.matches;

  const hoverFineMq = window.matchMedia("(hover: hover) and (pointer: fine)");

  function getCurrentCaseStudySlug() {
    const filename = window.location.pathname.split("/").pop() || "";
    const match = filename.match(/^case-study-(.+)\.html$/);
    if (!match || !CASE_STUDY_SLUGS.has(match[1])) return null;
    return match[1];
  }

  function normalizeContextText(value) {
    return value.replace(/\s+/g, " ").trim();
  }

  function getCurrentPageContext() {
    const slug = getCurrentCaseStudySlug();
    if (!slug) return null;

    const title =
      normalizeContextText(document.querySelector(".sidebar__title")?.textContent || "") ||
      normalizeContextText(document.title.replace(/\s*[—|-]\s*Case Study\s*$/i, ""));
    const nodes = [
      document.querySelector(".sidebar__title"),
      document.querySelector(".hero"),
      ...document.querySelectorAll(".section"),
    ].filter(Boolean);
    const text = normalizeContextText(nodes.map((node) => node.textContent || "").join("\n\n")).slice(
      0,
      MAX_PAGE_CONTEXT_CHARS
    );

    if (!title || !text) return null;

    return {
      type: "case-study",
      slug,
      title,
      path: window.location.pathname.split("/").pop() || "",
      text,
    };
  }

  function getInitialPrompts() {
    const slug = getCurrentCaseStudySlug();
    return CASE_STUDY_PROMPTS[slug]?.initial ?? DEFAULT_INITIAL_PROMPTS;
  }

  function getFollowUpPrompts() {
    const slug = getCurrentCaseStudySlug();
    return CASE_STUDY_PROMPTS[slug]?.followUp ?? DEFAULT_FOLLOW_UP_PROMPTS;
  }

  function positionInfoDisclaimer() {
    const rect = infoButton.getBoundingClientRect();
    const width = Math.min(248, window.innerWidth - 48);
    let left = rect.left + rect.width / 2;
    const top = rect.bottom + 10;
    const half = width / 2;

    left = Math.max(half + 12, Math.min(left, window.innerWidth - half - 12));

    infoDisclaimer.style.width = `${width}px`;
    infoDisclaimer.style.left = `${left}px`;
    infoDisclaimer.style.top = `${top}px`;
  }

  function mountInfoDisclaimer() {
    if (infoDisclaimer.parentElement !== document.body) {
      document.body.append(infoDisclaimer);
    }
    positionInfoDisclaimer();
  }

  function unmountInfoDisclaimer() {
    if (infoDisclaimer.parentElement !== infoWrap) {
      infoWrap.append(infoDisclaimer);
    }

    infoDisclaimer.style.removeProperty("width");
    infoDisclaimer.style.removeProperty("left");
    infoDisclaimer.style.removeProperty("top");
  }

  function setInfoDisclaimerOpen(isOpen) {
    infoDisclaimerOpen = isOpen;

    if (isOpen) {
      mountInfoDisclaimer();
    } else {
      unmountInfoDisclaimer();
    }

    infoDisclaimer.classList.toggle("is-open", isOpen);
    infoDisclaimer.setAttribute("aria-hidden", isOpen ? "false" : "true");
    infoButton.setAttribute("aria-expanded", isOpen ? "true" : "false");
  }

  function closeInfoDisclaimer() {
    if (infoDisclaimerCloseTimer) {
      window.clearTimeout(infoDisclaimerCloseTimer);
      infoDisclaimerCloseTimer = null;
    }
    setInfoDisclaimerOpen(false);
  }

  function scheduleInfoDisclaimerClose() {
    if (infoDisclaimerCloseTimer) window.clearTimeout(infoDisclaimerCloseTimer);
    infoDisclaimerCloseTimer = window.setTimeout(() => {
      infoDisclaimerCloseTimer = null;
      closeInfoDisclaimer();
    }, 120);
  }

  function cancelInfoDisclaimerClose() {
    if (infoDisclaimerCloseTimer) {
      window.clearTimeout(infoDisclaimerCloseTimer);
      infoDisclaimerCloseTimer = null;
    }
  }

  function openInfoDisclaimer() {
    cancelInfoDisclaimerClose();
    if (infoDisclaimerOpen) {
      positionInfoDisclaimer();
      return;
    }
    setInfoDisclaimerOpen(true);
  }

  function initInfoDisclaimer() {
    if (hoverFineMq.matches) {
      infoWrap.addEventListener("mouseenter", openInfoDisclaimer);
      infoWrap.addEventListener("mouseleave", scheduleInfoDisclaimerClose);
      infoDisclaimer.addEventListener("mouseenter", openInfoDisclaimer);
      infoDisclaimer.addEventListener("mouseleave", scheduleInfoDisclaimerClose);
      infoWrap.addEventListener("focusin", openInfoDisclaimer);
      infoWrap.addEventListener("focusout", (event) => {
        if (!infoWrap.contains(event.relatedTarget) && event.relatedTarget !== infoDisclaimer) {
          closeInfoDisclaimer();
        }
      });
    } else {
      infoButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        setInfoDisclaimerOpen(!infoDisclaimerOpen);
      });
    }

    window.addEventListener("resize", () => {
      if (infoDisclaimerOpen) positionInfoDisclaimer();
    });
    chat.addEventListener(
      "scroll",
      () => {
        if (infoDisclaimerOpen) positionInfoDisclaimer();
      },
      { passive: true }
    );
  }

  function syncPanelLayout() {
    const isOpen = panel.classList.contains("is-open");
    const overlay = isOverlayPanel();
    document.body.classList.toggle("dodollm-panel-open", isOpen);
    panel.setAttribute("aria-hidden", isOpen ? "false" : "true");

    if (!isOpen) closeInfoDisclaimer();

    if (overlay) {
      backdrop.classList.toggle("is-open", isOpen);
      backdrop.setAttribute("aria-hidden", isOpen ? "false" : "true");
      syncBackgroundScrollLock(isOpen && shouldLockBackgroundScroll());
    } else {
      backdrop.classList.remove("is-open");
      backdrop.setAttribute("aria-hidden", "true");
      syncBackgroundScrollLock(false);
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
    input.blur();
    document.body.classList.add("dodollm-panel-animating");
    panel.classList.remove("is-open");
    syncPanelLayout();
  }

  function togglePanel() {
    if (isPanelOpen()) closePanel();
    else openPanel();
  }

  function handleClickOutside(event) {
    if (signatureTipOpen && !hoverFineMq.matches) {
      const target = event.target;
      if (!(target instanceof Node) || !target.closest(".dodollm-signature-wrap")) {
        closeBotSignatureTip();
      }
    }

    if (infoDisclaimerOpen && !hoverFineMq.matches) {
      const target = event.target;
      if (
        !(target instanceof Node) ||
        (!infoWrap.contains(target) && !infoDisclaimer.contains(target))
      ) {
        closeInfoDisclaimer();
      }
    }

    if (!isPanelOpen()) return;
    if (!isOverlayPanel()) return;
    const target = event.target;
    const path = event.composedPath?.();
    if (path?.includes(panel)) return;
    if (dockButton && path?.includes(dockButton)) return;
    const mobileAiFab = document.querySelector("[data-mobile-ai-fab]");
    if (mobileAiFab && path?.includes(mobileAiFab)) return;
    if (!(target instanceof Node)) return;
    if (panel.contains(target)) return;
    if (dockButton?.contains(target)) return;
    if (mobileAiFab?.contains(target)) return;
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
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      submitSuggestionPrompt(prompt);
    });
    return button;
  }

  function renderInitialState() {
    if (typingTimer) {
      window.clearInterval(typingTimer);
      typingTimer = null;
    }

    if (currentRequestController) {
      currentRequestController.abort();
      currentRequestController = null;
    }

    activeRequestId += 1;
    conversationMessages = [];
    setWaitingState(false);
    messages.replaceChildren();
    initialSuggestions.replaceChildren(
      ...getInitialPrompts().map((prompt) => makeSuggestion(prompt))
    );
    emptyState.hidden = false;
    input.value = "";
    clearThinkingRow();
    removeBotSignatures();
  }

  function renderFollowUps() {
    const divider = document.createElement("hr");
    divider.className = "dodollm-divider";
    messages.append(divider);

    const suggestions = document.createElement("div");
    suggestions.className = "dodollm-suggestions";
    getFollowUpPrompts().forEach((prompt) => suggestions.append(makeSuggestion(prompt)));
    messages.append(suggestions);
  }

  function scrollChatToBottom() {
    chat.scrollTop = chat.scrollHeight;
  }

  function normalizePrompt(text) {
    return text.toLowerCase().replace(/[’]/g, "'").replace(/\s+/g, " ").trim();
  }

  function getMentionedWorks(prompt) {
    if (SUGGESTION_WORK_OVERRIDES[prompt]) {
      return SUGGESTION_WORK_OVERRIDES[prompt]
        .map((key) => works.find((work) => work.key === key))
        .filter(Boolean);
    }

    const normalized = normalizePrompt(prompt);
    const matches = works.filter((work) =>
      work.aliases.some((alias) => normalized.includes(alias))
    );

    if (matches.length) return matches.slice(0, 3);

    const asksForWork =
      /\b(work|works|project|projects|portfolio|case stud(?:y|ies))\b/.test(normalized);
    if (!asksForWork) return [];

    return works.slice(0, 3);
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

  function getErrorMessage(error) {
    const message = error instanceof Error ? error.message.trim() : "";
    if (!message) return ERROR_RESPONSE;

    return message.slice(0, MAX_ERROR_MESSAGE_CHARS);
  }

  function escapeHtml(text) {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function applyInlineBold(text) {
    return text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  }

  function isBulletLine(line) {
    return /^[-•]\s+/.test(line);
  }

  function stripBulletPrefix(line) {
    return line.replace(/^[-•]\s+/, "");
  }

  function formatBotMessageHtml(text) {
    const normalized = text.replace(/\r\n/g, "\n").trim();
    if (!normalized) return "";

    const escaped = escapeHtml(normalized);
    const blocks = escaped.split(/\n{2,}/);
    const parts = [];

    blocks.forEach((block) => {
      const lines = block
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      if (!lines.length) return;

      if (lines.every(isBulletLine)) {
        const items = lines
          .map((line) => `<li>${applyInlineBold(stripBulletPrefix(line))}</li>`)
          .join("");
        parts.push(`<ul class="dodollm-message-bot__list">${items}</ul>`);
        return;
      }

      const paragraph = lines.map(applyInlineBold).join("<br>");
      parts.push(`<p class="dodollm-message-bot__p">${paragraph}</p>`);
    });

    return parts.join("");
  }

  function hasBotMessageFormatting(text) {
    const normalized = text.replace(/\r\n/g, "\n");
    if (/\*\*.+?\*\*/s.test(normalized)) return true;

    const blocks = normalized.trim().split(/\n{2,}/);
    return blocks.some((block) => {
      const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
      return lines.length > 0 && lines.every(isBulletLine);
    });
  }

  function setBotMessageContent(el, text) {
    if (hasBotMessageFormatting(text)) {
      el.classList.remove("dodollm-message-bot--plain");
      el.innerHTML = formatBotMessageHtml(text);
      return;
    }

    el.classList.add("dodollm-message-bot--plain");
    el.textContent = text;
  }

  function renderUserMessage(text) {
    const user = document.createElement("div");
    user.className = "dodollm-message-user";
    user.textContent = text;
    messages.append(user);
  }

  function renderBotMessage(text) {
    const bot = document.createElement("div");
    bot.className = "dodollm-message-bot dodollm-message-bot--plain";
    setBotMessageContent(bot, text);
    messages.append(bot);
    attachBotSignature();
    scrollChatToBottom();
    return bot;
  }

  function removeBotSignatures() {
    messages.querySelectorAll(".dodollm-signature-wrap").forEach((el) => el.remove());
    signatureTipOpen = false;
  }

  function setSignatureTipOpen(wrap, isOpen) {
    signatureTipOpen = isOpen;
    wrap.classList.toggle("is-open", isOpen);
    const tip = wrap.querySelector(".dodollm-signature-tip");
    tip?.setAttribute("aria-hidden", isOpen ? "false" : "true");
  }

  function closeBotSignatureTip() {
    const wrap = messages.querySelector(".dodollm-signature-wrap.is-open");
    if (wrap) setSignatureTipOpen(wrap, false);
    else signatureTipOpen = false;
  }

  function createBotSignature() {
    const wrap = document.createElement("div");
    wrap.className = "dodollm-signature-wrap";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "dodollm-signature";
    button.setAttribute("aria-label", "About dodoGPT");
    button.innerHTML = SIGNATURE_SVG;

    const tip = document.createElement("div");
    tip.className = "dodollm-signature-tip";
    tip.setAttribute("role", "tooltip");
    tip.setAttribute("aria-hidden", "true");
    tip.textContent = SIGNATURE_TOOLTIP;

    wrap.append(button, tip);

    if (!hoverFineMq.matches) {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const isOpen = wrap.classList.contains("is-open");
        closeBotSignatureTip();
        if (!isOpen) setSignatureTipOpen(wrap, true);
      });
    }

    return wrap;
  }

  function attachBotSignature() {
    removeBotSignatures();

    const workCards = messages.querySelectorAll(".dodollm-work-cards");
    const botMessages = messages.querySelectorAll(".dodollm-message-bot");
    const anchor = workCards[workCards.length - 1] ?? botMessages[botMessages.length - 1];
    if (!anchor) return;

    anchor.insertAdjacentElement("afterend", createBotSignature());
    scrollChatToBottom();
  }

  function renderWorkCards(workItems) {
    if (!workItems.length) return;

    const cards = document.createElement("div");
    cards.className = "dodollm-work-cards";

    workItems.forEach((work) => {
      const card = work.href ? document.createElement("a") : document.createElement("div");
      card.className = "dodollm-work-card";
      if (work.href) {
        card.href = work.href;
      }

      const image = document.createElement("img");
      image.className = "dodollm-work-card__image";
      image.src = work.image;
      image.alt = work.alt;
      image.loading = "lazy";

      const title = document.createElement("div");
      title.className = "dodollm-work-card__title";
      title.textContent = work.title;

      card.append(image, title);
      cards.append(card);
    });

    messages.append(cards);
    scrollChatToBottom();
  }

  function clearThinkingRow() {
    thinkingRow.replaceChildren();
    thinkingRow.hidden = true;
  }

  function renderLoadingBubble() {
    const bot = document.createElement("div");
    bot.className = "dodollm-message-bot dodollm-message-bot--loading";

    const loader = document.createElement("span");
    loader.className = "dodollm-loader";
    loader.setAttribute("aria-hidden", "true");

    const label = document.createElement("span");
    label.className = "dodollm-thinking-text";
    label.textContent = THINKING_TEXT;

    thinkingRow.replaceChildren(bot);
    thinkingRow.hidden = false;
    bot.append(loader, label);
    scrollChatToBottom();
    return bot;
  }

  function streamBotResponse(text, onDone) {
    const bot = document.createElement("div");
    bot.className = "dodollm-message-bot dodollm-message-bot--plain";
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
        setBotMessageContent(bot, text);
        onDone?.();
        scrollChatToBottom();
      }
    }, 18);
  }

  function beginPromptResponse(rawPrompt) {
    const prompt = rawPrompt.trim();
    if (!prompt || isWaitingForResponse) return null;

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

    const mentionedWorks = getMentionedWorks(prompt);
    conversationMessages.push({ role: "user", content: prompt });

    const requestId = activeRequestId + 1;
    activeRequestId = requestId;
    renderLoadingBubble();
    setWaitingState(true);

    return { prompt, mentionedWorks, requestId };
  }

  function renderAssistantResponse(content, mentionedWorks) {
    conversationMessages.push({ role: "assistant", content });
    clearThinkingRow();
    streamBotResponse(content, () => {
      renderWorkCards(mentionedWorks);
      attachBotSignature();
      renderFollowUps();
    });
  }

  function submitSuggestionPrompt(rawPrompt) {
    const submission = beginPromptResponse(rawPrompt);
    if (!submission) return;

    const { prompt, mentionedWorks, requestId } = submission;
    const content = SUGGESTION_ANSWERS[prompt] ?? SUGGESTION_FALLBACK_ANSWER;

    window.setTimeout(() => {
      if (requestId !== activeRequestId) return;

      renderAssistantResponse(content, mentionedWorks);
      setWaitingState(false);
      input.focus();
    }, 180);
  }

  async function submitPrompt(rawPrompt) {
    const submission = beginPromptResponse(rawPrompt);
    if (!submission) return;

    const { prompt, mentionedWorks, requestId } = submission;
    currentRequestController = new AbortController();

    try {
      const requestBody = {
        messages: conversationMessages.slice(-MAX_HISTORY_MESSAGES),
      };
      const pageContext = getCurrentPageContext();
      if (pageContext) {
        requestBody.pageContext = pageContext;
      }

      const response = await fetch(API_ENDPOINT, {
        method: "POST",
        signal: currentRequestController.signal,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || typeof data.content !== "string" || !data.content.trim()) {
        const serverError =
          typeof data.error === "string" && data.error.trim()
            ? data.error.trim()
            : `dodoGPT couldn't respond right now (HTTP ${response.status}). Try again soon.`;

        throw new Error(serverError);
      }

      if (requestId !== activeRequestId) return;

      const content = data.content.trim();
      renderAssistantResponse(content, mentionedWorks);
    } catch (error) {
      if (requestId !== activeRequestId) return;

      const lastMessage = conversationMessages[conversationMessages.length - 1];
      if (lastMessage?.role === "user" && lastMessage.content === prompt) {
        conversationMessages.pop();
      }

      clearThinkingRow();
      renderBotMessage(getErrorMessage(error));
    } finally {
      if (requestId === activeRequestId) {
        currentRequestController = null;
        setWaitingState(false);
        input.focus();
      }
    }
  }

  dockButton?.addEventListener("click", (event) => {
    event.stopPropagation();
    togglePanel();
  });

  document.querySelectorAll("[data-dodollm-trigger]").forEach((trigger) => {
    trigger.addEventListener("click", (event) => {
      event.stopPropagation();
      togglePanel();
    });
  });

  document.addEventListener("click", handleClickOutside);
  backdrop.addEventListener("click", closePanel);
  closeButton.addEventListener("click", closePanel);
  resetButton.addEventListener("click", renderInitialState);
  initInfoDisclaimer();

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    submitPrompt(input.value);
  });

  function handleWindowResize() {
    syncPanelLayout();
  }

  overlayMq.addEventListener("change", syncPanelLayout);
  window.addEventListener("resize", handleWindowResize);
  window.addEventListener("pageshow", () => {
    if (!isPanelOpen()) syncBackgroundScrollLock(false);
  });
  renderInitialState();

  window.openDodollmPanel = openPanel;

  if (location.hash === "#dodollm") {
    requestAnimationFrame(() => openPanel());
  }

  window.addEventListener("hashchange", () => {
    if (location.hash === "#dodollm") openPanel();
  });
})();
