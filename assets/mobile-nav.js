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

  const backdrop = (() => {
    const existing = document.querySelector(".cs-nav-backdrop");
    if (existing) return existing;

    const el = document.createElement("div");
    el.className = "cs-nav-backdrop";
    el.setAttribute("aria-hidden", "true");
    shell.parentNode?.insertBefore(el, shell);
    return el;
  })();

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

  const isCaseStudyPage = () =>
    Boolean(document.querySelector(".layout")) && !document.getElementById("home");

  let inHero = false;

  const applyNavHidden = () => {
    const heroHidden = !isCaseStudyPage() && inHero && !isDrawerOpen();
    const hidden = interactionHidden || scrollHidden || heroHidden;
    shell.classList.toggle("is-scroll-hidden", hidden);
    shell.classList.toggle("is-in-hero", inHero && !isCaseStudyPage());
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
    btn.setAttribute("aria-label", "Ask AI");
    btn.innerHTML = `
      <svg class="mobile-ai-fab__icon" viewBox="0 0 66 81" aria-hidden="true">
        <use href="assets/icons.svg#icon-dodollm-sparkle" />
      </svg>
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
          <svg class="cs-nav__drawer-ai-icon" viewBox="0 0 66 81" aria-hidden="true">
            <use href="assets/icons.svg#icon-dodollm-sparkle" />
          </svg>
          <span class="cs-nav__drawer-ai-cta">Ask AI</span>
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
    backdrop.classList.remove("is-open");
    backdrop.setAttribute("aria-hidden", "true");
    syncMobileAiFab();
    applyNavHidden();
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
    backdrop.classList.add("is-open");
    backdrop.setAttribute("aria-hidden", "false");
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

  const bindDrawerLinks = () => {
    drawerInner.querySelectorAll("nav a").forEach((link) => {
      if (!(link instanceof HTMLAnchorElement) || link.dataset.csNavLinkBound) return;
      link.dataset.csNavLinkBound = "1";

      const stopBubble = (event) => {
        event.stopPropagation();
      };

      link.addEventListener("pointerdown", stopBubble, true);
      link.addEventListener("touchstart", stopBubble, { capture: true, passive: true });

      link.addEventListener("click", (event) => {
        event.stopPropagation();

        const href = link.getAttribute("href")?.trim();
        if (!href) return;

        if (href.startsWith("#")) {
          event.preventDefault();
          const targetId = href.slice(1);
          const target = targetId ? document.getElementById(targetId) : null;
          const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

          close();

          window.requestAnimationFrame(() => {
            if (target) {
              target.scrollIntoView({
                behavior: reduceMotion ? "auto" : "smooth",
                block: "start",
              });
            } else {
              window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
            }
            history.pushState(null, "", href);
          });
          return;
        }

        if (href.startsWith("mailto:") || href.startsWith("tel:")) {
          close();
          return;
        }

        event.preventDefault();
        close();
        window.location.assign(href);
      });
    });
  };

  bindDrawerLinks();

  document.addEventListener(
    "click",
    (event) => {
      if (!mobileMq.matches || !isDrawerOpen()) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest(".cs-nav-shell")) return;
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

    const y = Math.max(0, window.scrollY || window.pageYOffset);

    if (isCaseStudyPage()) {
      setScrollHidden(false);
      lastY = y;
      return;
    }

    if (inHero) {
      setScrollHidden(true);
      lastY = y;
      return;
    }

    if (reducedMq.matches) {
      setScrollHidden(false);
      lastY = y;
      return;
    }

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
    if (!mobileMq.matches) {
      inHero = false;
    }
    applyNavHidden();
    if (!mobileMq.matches) close();
    syncNavHeight();
    syncDrawerOpenHeight();
    syncMobileAiFab();
    syncHeroState();
  };

  document.addEventListener("dodollm-panel-change", syncMobileAiFab);

  const liquidBg = document.getElementById("liquid-bg");

  const getHeroZoneElement = () => {
    const home = document.getElementById("home");
    if (home) return home;

    const hero = document.querySelector(".layout .main__inner > .hero");
    if (!hero) return null;

    const next = hero.nextElementSibling;
    if (next instanceof HTMLElement && next.classList.contains("placeholder-hero")) {
      return next;
    }

    return hero;
  };

  const setPastHome = (pastHome) => {
    shell.classList.toggle("is-past-home", pastHome);
    csNav.classList.toggle("is-past-home", pastHome);
    drawer.classList.toggle("is-past-home", pastHome);
    liquidBg?.classList.toggle("is-past-home", pastHome);
  };

  const setInHero = (nextInHero) => {
    if (!mobileMq.matches) {
      if (inHero) {
        inHero = false;
        setPastHome(false);
        applyNavHidden();
      }
      return;
    }

    if (isCaseStudyPage()) {
      if (inHero) {
        inHero = false;
        applyNavHidden();
        onScroll();
      }
      return;
    }

    const pastHero = !nextInHero;
    if (inHero === nextInHero) {
      setPastHome(pastHero);
      return;
    }

    inHero = nextInHero;
    setPastHome(pastHero);
    applyNavHidden();
    if (!inHero) onScroll();
  };

  const syncHeroState = () => {
    const heroZone = getHeroZoneElement();
    if (!heroZone || !mobileMq.matches) {
      setInHero(false);
      return;
    }

    const rect = heroZone.getBoundingClientRect();
    const pastHero = rect.bottom <= 0 && rect.top < 0;

    if (isCaseStudyPage()) {
      setPastHome(pastHero);
      if (inHero) {
        inHero = false;
        applyNavHidden();
      }
      return;
    }

    setInHero(!pastHero);
  };

  const heroZone = getHeroZoneElement();
  if (heroZone) {
    const heroObserver = new IntersectionObserver(
      ([entry]) => {
        if (!mobileMq.matches) {
          setInHero(false);
          return;
        }

        const pastHero = !entry.isIntersecting && entry.boundingClientRect.top < 0;

        if (isCaseStudyPage()) {
          setPastHome(pastHero);
          if (inHero) {
            inHero = false;
            applyNavHidden();
          }
          return;
        }

        setInHero(!pastHero);
      },
      { threshold: [0, 0.01, 0.1] }
    );
    heroObserver.observe(heroZone);
    syncHeroState();
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
