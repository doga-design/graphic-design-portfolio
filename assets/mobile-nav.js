(function initMobileNavChrome() {
  "use strict";

  const burger = document.querySelector(".cs-nav__burger");
  const drawer = document.querySelector(".cs-nav__drawer");
  const csNav = document.querySelector(".cs-nav");
  if (!burger || !drawer || !csNav) return;

  const shell = (() => {
    const existing = csNav.closest(".cs-nav-shell");
    if (existing) return existing;

    const wrap = document.createElement("div");
    wrap.className = "cs-nav-shell";
    const parent = csNav.parentNode;
    if (!parent) return null;

    parent.insertBefore(wrap, csNav);
    wrap.appendChild(csNav);
    wrap.appendChild(drawer);
    return wrap;
  })();

  if (!shell) return;

  const drawerInner = (() => {
    let inner = drawer.querySelector(".cs-nav__drawer-inner");
    if (inner) return inner;

    inner = document.createElement("div");
    inner.className = "cs-nav__drawer-inner";
    while (drawer.firstChild) {
      inner.appendChild(drawer.firstChild);
    }
    drawer.appendChild(inner);
    return inner;
  })();

  const mobileMq = window.matchMedia("(max-width: 960px)");
  const reducedMq = window.matchMedia("(prefers-reduced-motion: reduce)");

  const SCROLL_THRESHOLD = 6;
  const TOP_SHOW_Y = 32;

  let lastY = 0;
  let ticking = false;
  let scrollHidden = false;
  let interactionHidden = false;

  const isDrawerOpen = () => shell.classList.contains("is-drawer-open");

  const applyNavHidden = () => {
    const hidden = interactionHidden || scrollHidden;
    shell.classList.toggle("is-scroll-hidden", hidden);
    if (hidden && isDrawerOpen()) close();
  };

  const syncDrawerOpenHeight = () => {
    if (!mobileMq.matches) {
      shell.style.removeProperty("--drawer-open-height");
      return;
    }

    const height = Math.ceil(drawerInner.scrollHeight);
    if (height > 0) {
      shell.style.setProperty("--drawer-open-height", `${height}px`);
    }
  };

  let mobileAiFab = null;

  const syncMobileAiFab = () => {
    if (!mobileAiFab) return;

    const hide =
      !mobileMq.matches ||
      isDrawerOpen() ||
      document.body.classList.contains("dodollm-panel-open");

    mobileAiFab.classList.toggle("is-hidden", hide);
    mobileAiFab.setAttribute("aria-hidden", hide ? "true" : "false");
    mobileAiFab.tabIndex = hide ? -1 : 0;
  };

  const injectMobileAiFab = () => {
    if (document.querySelector("[data-mobile-ai-fab]")) {
      mobileAiFab = document.querySelector("[data-mobile-ai-fab]");
      syncMobileAiFab();
      return;
    }

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "mobile-ai-fab";
    btn.dataset.mobileAiFab = "1";
    btn.setAttribute("aria-label", "Open dodoLLM");
    btn.innerHTML = `
      <img
        class="mobile-ai-fab__icon"
        src="assets/dodollm-favicon.svg"
        alt=""
        decoding="async"
      />
    `;

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (typeof window.openDodollmPanel === "function") {
        window.openDodollmPanel();
        return;
      }

      const dockBtn = document.querySelector('[data-dock-id="dodollm"]');
      if (dockBtn) {
        dockBtn.click();
        return;
      }

      window.location.href = "index.html#dodollm";
    });

    document.body.appendChild(btn);
    mobileAiFab = btn;
    syncMobileAiFab();
  };

  const injectAiLink = () => {
    let footer = drawerInner.querySelector(".cs-nav__drawer-ai");
    if (!footer) {
      footer = document.createElement("div");
      footer.className = "cs-nav__drawer-ai";
      footer.innerHTML = `
        <button type="button" class="cs-nav__drawer-ai-link" data-cs-nav-ai-link>
          <img
            class="cs-nav__drawer-ai-icon"
            src="assets/dodollm-favicon.svg"
            alt=""
            width="32"
            height="32"
            decoding="async"
          />
          <span class="cs-nav__drawer-ai-cta">Ask Doga LLM</span>
        </button>
      `;
      drawerInner.appendChild(footer);
    } else {
      footer.querySelector(".cs-nav__drawer-ai-label")?.remove();
    }

    const btn = footer.querySelector("[data-cs-nav-ai-link]");
    if (btn && !btn.dataset.csNavAiBound) {
      btn.dataset.csNavAiBound = "1";
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        close();

        if (typeof window.openDodollmPanel === "function") {
          window.openDodollmPanel();
          return;
        }

        const dockBtn = document.querySelector('[data-dock-id="dodollm"]');
        if (dockBtn) {
          dockBtn.click();
          return;
        }

        window.location.href = "index.html#dodollm";
      });
    }

    syncDrawerOpenHeight();
  };

  const close = () => {
    shell.classList.remove("is-drawer-open");
    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    burger.setAttribute("aria-expanded", "false");
    burger.setAttribute("aria-label", "Open menu");
    syncMobileAiFab();
  };

  const open = () => {
    syncDrawerOpenHeight();
    shell.classList.remove("is-scroll-hidden");
    scrollHidden = false;
    shell.classList.add("is-drawer-open");
    drawer.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");
    burger.setAttribute("aria-expanded", "true");
    burger.setAttribute("aria-label", "Close menu");
    syncMobileAiFab();
  };

  injectAiLink();
  injectMobileAiFab();
  if (document.fonts?.ready) {
    document.fonts.ready.then(syncDrawerOpenHeight);
  }

  burger.addEventListener("click", (e) => {
    e.stopPropagation();
    if (isDrawerOpen()) close();
    else open();
  });

  drawerInner.querySelectorAll("nav a").forEach((link) => {
    link.addEventListener("click", () => close());
  });

  document.addEventListener(
    "pointerdown",
    (e) => {
      if (!mobileMq.matches || !isDrawerOpen()) return;
      const target = e.target;
      if (!(target instanceof Node)) return;
      if (shell.contains(target)) return;
      close();
    },
    true
  );

  document.addEventListener("keydown", (e) => {
    if (!mobileMq.matches || !isDrawerOpen()) return;
    if (e.key === "Escape") close();
  });

  const syncNavHeight = () => {
    if (!mobileMq.matches) return;
    const height = csNav.getBoundingClientRect().height;
    if (height > 0) {
      document.documentElement.style.setProperty("--mobile-nav-height", `${height}px`);
    }
  };

  const setScrollHidden = (hidden) => {
    if (scrollHidden === hidden) return;
    scrollHidden = hidden;
    applyNavHidden();
  };

  const setInteractionHidden = (hidden) => {
    if (!mobileMq.matches) return;
    if (interactionHidden === hidden) return;
    interactionHidden = hidden;
    applyNavHidden();
    if (!hidden) onScroll();
  };

  const isNavActive = () => {
    if (!mobileMq.matches) return false;
    const home = document.getElementById("home");
    if (!home) return true;
    return csNav.classList.contains("visible");
  };

  const onScroll = () => {
    if (!isNavActive()) return;

    if (reducedMq.matches) {
      setScrollHidden(false);
      lastY = Math.max(0, window.scrollY || window.pageYOffset);
      return;
    }

    const y = Math.max(0, window.scrollY || window.pageYOffset);
    const delta = y - lastY;

    if (isDrawerOpen()) {
      setScrollHidden(false);
    } else if (y <= TOP_SHOW_Y) {
      setScrollHidden(false);
    } else if (delta > SCROLL_THRESHOLD) {
      setScrollHidden(true);
    } else if (delta < -SCROLL_THRESHOLD) {
      setScrollHidden(false);
    }

    lastY = y;
  };

  const onScrollRAF = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      onScroll();
      ticking = false;
    });
  };

  const reset = () => {
    lastY = Math.max(0, window.scrollY || window.pageYOffset);
    interactionHidden = false;
    scrollHidden = false;
    applyNavHidden();
    if (!mobileMq.matches) close();
    syncNavHeight();
    syncDrawerOpenHeight();
    syncMobileAiFab();
  };

  document.addEventListener("dodollm-panel-change", syncMobileAiFab);

  const homeSection = document.getElementById("home");
  const liquidBg = document.getElementById("liquid-bg");

  const setPastHome = (pastHome) => {
    shell.classList.toggle("is-past-home", pastHome);
    csNav.classList.toggle("is-past-home", pastHome);
    drawer.classList.toggle("is-past-home", pastHome);
    liquidBg?.classList.toggle("is-past-home", pastHome);
  };

  if (homeSection) {
    const homeObserver = new IntersectionObserver(
      ([entry]) => {
        if (!mobileMq.matches) {
          setPastHome(false);
          return;
        }
        const pastHome = !entry.isIntersecting && entry.boundingClientRect.top < 0;
        setPastHome(pastHome);
      },
      { threshold: [0, 0.01] }
    );
    homeObserver.observe(homeSection);
  }

  window.addEventListener("scroll", onScrollRAF, { passive: true });
  window.addEventListener("resize", () => {
    syncNavHeight();
    syncDrawerOpenHeight();
  });
  mobileMq.addEventListener("change", reset);
  reducedMq.addEventListener("change", reset);
  reset();

  window.csMobileNav = {
    close,
    open,
    reset,
    syncNavHeight,
    syncDrawerOpenHeight,
    setInteractionHidden,
    shell,
  };
})();
