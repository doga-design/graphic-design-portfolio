(function initDockReorder() {
  const DEFAULT_DOCK_ORDER = [
    "home",
    "work",
    "about",
    "github",
    "linkedin",
    "email",
    "resume",
    "dodollm",
  ];
  const HOLD_MS = 180;
  const MOVE_CANCEL_PX = 8;

  const track = document.querySelector("[data-dock-track]");
  if (!track) return;

  const getGroups = () => {
    const groups = [];
    let current = [];
    for (const child of track.children) {
      if (child.classList.contains("dock__divider")) {
        if (current.length) groups.push(current);
        current = [];
      } else if (child.matches("[data-dock-item]")) {
        current.push(child);
      }
    }
    if (current.length) groups.push(current);
    return groups;
  };

  const getGroupForItem = (item) =>
    getGroups().find((group) => group.includes(item)) || [];

  const getDockOrder = () =>
    [...track.querySelectorAll("[data-dock-item]")].map(
      (el) => el.dataset.dockId
    );

  const applyDockOrder = (orderIds) => {
    if (!Array.isArray(orderIds)) return;

    const allIds = getDockOrder();
    if (
      orderIds.length !== allIds.length ||
      !orderIds.every((id) => allIds.includes(id))
    ) {
      return;
    }

    getGroups().forEach((group) => {
      const ids = group.map((el) => el.dataset.dockId);
      const ordered = orderIds.filter((id) => ids.includes(id));
      if (ordered.length !== ids.length) return;

      const sorted = ordered.map((id) =>
        group.find((el) => el.dataset.dockId === id)
      );
      const insertBefore = group[group.length - 1].nextElementSibling;
      for (let i = 0; i < sorted.length; i++) {
        track.insertBefore(sorted[i], insertBefore);
      }
    });
  };

  applyDockOrder(DEFAULT_DOCK_ORDER);

  let holdTimer = null;
  let dragItem = null;
  let placeholder = null;
  let group = [];
  let pointerId = null;
  let startX = 0;
  let startY = 0;
  let originLeft = 0;
  let originTop = 0;
  let fixedLeft = 0;
  let fixedTop = 0;
  let originIndex = 0;
  let insertIndex = 0;
  let didDrag = false;
  let suppressClick = false;
  let itemStep = 52;
  let currentX = 0;
  let currentY = 0;
  let targetX = 0;
  let targetY = 0;
  let followRafId = null;

  const getOrderedSlots = () => {
    if (!dragItem) return [];
    const set = new Set(getGroupForItem(dragItem));
    return [...track.children].filter(
      (el) =>
        el === placeholder || (set.has(el) && el !== dragItem)
    );
  };

  const clearDisplaced = () => {
    group.forEach((el) => {
      if (el === dragItem) return;
      el.classList.remove("is-drag-displaced");
      el.style.removeProperty("--dock-shift-x");
    });
  };

  const applyDisplaced = () => {
    clearDisplaced();
    if (!dragItem || !placeholder) return;

    const slots = getOrderedSlots();
    const from = originIndex;
    const to = slots.indexOf(placeholder);
    if (to < 0) return;

    insertIndex = to;
    const shift =
      (placeholder.getBoundingClientRect().width || 48) +
      parseFloat(getComputedStyle(track).gap || "0");
    itemStep = shift;

    slots.forEach((el, idx) => {
      if (el === placeholder) return;
      let offset = 0;
      if (from < to && idx > from && idx <= to) offset = -shift;
      if (from > to && idx >= to && idx < from) offset = shift;
      if (offset !== 0) {
        el.classList.add("is-drag-displaced");
        el.style.setProperty("--dock-shift-x", `${offset}px`);
      }
    });
  };

  const getInsertIndex = (pointerX) => {
    const slots = getOrderedSlots().filter((el) => el !== placeholder);
    for (let i = 0; i < slots.length; i++) {
      const rect = slots[i].getBoundingClientRect();
      const center = rect.left + rect.width / 2;
      if (pointerX < center) return i;
    }
    return slots.length;
  };

  const movePlaceholder = (index) => {
    const slots = getOrderedSlots().filter((el) => el !== placeholder);
    const ref = slots[index] || null;
    if (ref) {
      track.insertBefore(placeholder, ref);
    } else if (slots.length) {
      track.insertBefore(
        placeholder,
        slots[slots.length - 1].nextSibling
      );
    }
    applyDisplaced();
  };

  const resetDragStyles = (item) => {
    item.classList.remove("is-dragging", "is-dropping", "is-holding");
    item.style.removeProperty("position");
    item.style.removeProperty("left");
    item.style.removeProperty("top");
    item.style.removeProperty("width");
    item.style.removeProperty("height");
    item.style.removeProperty("z-index");
    item.style.removeProperty("--dock-drag-x");
    item.style.removeProperty("--dock-drag-y");
    item.style.removeProperty("--dock-drag-scale");
    item.style.removeProperty("box-shadow");
    item.style.removeProperty("will-change");
  };

  const setDragOffset = (x, y) => {
    currentX = x;
    currentY = y;
    dragItem?.style.setProperty("--dock-drag-x", `${x}px`);
    dragItem?.style.setProperty("--dock-drag-y", `${y}px`);
  };

  const stopFollowLoop = () => {
    if (followRafId !== null) {
      cancelAnimationFrame(followRafId);
      followRafId = null;
    }
  };

  const animateFollow = () => {
    if (!dragItem || !didDrag) {
      followRafId = null;
      return;
    }

    const ease = 0.28;
    const nextX = currentX + (targetX - currentX) * ease;
    const nextY = currentY + (targetY - currentY) * ease;
    setDragOffset(nextX, nextY);

    if (
      Math.abs(targetX - nextX) > 0.1 ||
      Math.abs(targetY - nextY) > 0.1
    ) {
      followRafId = requestAnimationFrame(animateFollow);
    } else {
      setDragOffset(targetX, targetY);
      followRafId = null;
    }
  };

  const startFollowLoop = () => {
    if (followRafId === null) {
      followRafId = requestAnimationFrame(animateFollow);
    }
  };

  const cancelHold = () => {
    if (holdTimer) {
      clearTimeout(holdTimer);
      holdTimer = null;
    }
  };

  const clearHolding = (item) => {
    item?.classList.remove("is-holding");
  };

  const endDrag = (commit) => {
    cancelHold();
    clearDisplaced();

    if (!dragItem) return;

    const item = dragItem;

    const cleanup = () => {
      track.classList.remove("is-drag-active");
      resetDragStyles(item);

      placeholder = null;
      dragItem = null;
      group = [];
      pointerId = null;
      didDrag = false;
      originIndex = 0;
      insertIndex = 0;
      fixedLeft = 0;
      fixedTop = 0;
      currentX = 0;
      currentY = 0;
      targetX = 0;
      targetY = 0;
    };

    const finish = () => {
      if (placeholder) {
        track.insertBefore(item, placeholder);
        placeholder.remove();
      }
      cleanup();
    };

    stopFollowLoop();

    if (commit && placeholder && placeholder.parentNode === track) {
      suppressClick = true;
      window.setTimeout(() => {
        suppressClick = false;
      }, 350);

      const targetRect = placeholder.getBoundingClientRect();
      const dropX = targetRect.left - originLeft;
      const dropY = targetRect.top - originTop;
      item.classList.add("is-dropping");
      setDragOffset(currentX, currentY);
      item.getBoundingClientRect();
      requestAnimationFrame(() => {
        item.style.setProperty("--dock-drag-x", `${dropX}px`);
        item.style.setProperty("--dock-drag-y", `${dropY}px`);
        item.style.setProperty("--dock-drag-scale", "1");
      });

      const dropDone = (event) => {
        if (event.target !== item || event.propertyName !== "transform") {
          return;
        }
        item.removeEventListener("transitionend", dropDone);
        window.clearTimeout(fallbackId);
        finish();
      };
      const fallbackId = window.setTimeout(() => {
        item.removeEventListener("transitionend", dropDone);
        finish();
      }, 380);
      item.addEventListener("transitionend", dropDone);
    } else if (placeholder) {
      finish();
    } else {
      cleanup();
    }
  };

  const startDrag = (item, event) => {
    didDrag = true;
    dragItem = item;
    group = getGroupForItem(item);
    if (group.length < 2) {
      endDrag(false);
      return;
    }

    const rect = item.getBoundingClientRect();
    const dockRect = document.getElementById("dock").getBoundingClientRect();
    originLeft = rect.left;
    originTop = rect.top;
    fixedLeft = rect.left - dockRect.left;
    fixedTop = rect.top - dockRect.top;
    startX = event.clientX;
    startY = event.clientY;

    placeholder = document.createElement("span");
    placeholder.className = "dock__placeholder";
    placeholder.setAttribute("aria-hidden", "true");
    placeholder.style.width = `${rect.width}px`;
    placeholder.style.height = `${rect.height}px`;

    track.insertBefore(placeholder, item);
    originIndex = getOrderedSlots().indexOf(placeholder);
    insertIndex = originIndex;

    item.classList.remove("is-holding");
    item.classList.add("is-dragging");
    track.classList.add("is-drag-active");

    item.style.position = "fixed";
    item.style.left = `${fixedLeft}px`;
    item.style.top = `${fixedTop}px`;
    item.style.width = `${rect.width}px`;
    item.style.height = `${rect.height}px`;
    item.style.setProperty("--dock-drag-x", "0px");
    item.style.setProperty("--dock-drag-y", "0px");
    item.style.setProperty("--dock-drag-scale", "1.1");
    item.style.setProperty("--dock-scale", "1");
    currentX = 0;
    currentY = 0;
    targetX = 0;
    targetY = 0;

    try {
      item.setPointerCapture(event.pointerId);
    } catch {
      /* ignore */
    }

    applyDisplaced();
  };

  const onPointerMove = (event) => {
    if (pointerId !== null && event.pointerId !== pointerId) return;

    if (!didDrag && dragItem) {
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      if (Math.hypot(dx, dy) > MOVE_CANCEL_PX) {
        cancelHold();
        clearHolding(dragItem);
        dragItem = null;
        pointerId = null;
        return;
      }
    }

    if (!didDrag || !dragItem) return;

    event.preventDefault();
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    targetX = dx;
    targetY = dy;
    startFollowLoop();

    const nextIndex = getInsertIndex(event.clientX);
    if (nextIndex !== insertIndex) {
      movePlaceholder(nextIndex);
    }
  };

  const onPointerUp = (event) => {
    if (pointerId !== null && event.pointerId !== pointerId) return;

    cancelHold();

    const pendingItem = dragItem;

    if (didDrag && pendingItem) {
      event.preventDefault();
      try {
        pendingItem.releasePointerCapture(event.pointerId);
      } catch {
        /* ignore */
      }
      endDrag(true);
    } else {
      clearHolding(pendingItem);
      dragItem = null;
      pointerId = null;
    }

    document.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("pointerup", onPointerUp);
    document.removeEventListener("pointercancel", onPointerUp);
  };

  track.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    const item = event.target.closest("[data-dock-item]");
    if (!item || !track.contains(item)) return;

    const itemGroup = getGroupForItem(item);
    if (itemGroup.length < 2) return;

    pointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    dragItem = item;
    didDrag = false;

    item.classList.add("is-holding");

    holdTimer = window.setTimeout(() => {
      holdTimer = null;
      startDrag(item, event);
    }, HOLD_MS);

    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
    document.addEventListener("pointercancel", onPointerUp);
  });

  track.addEventListener(
    "click",
    (event) => {
      if (!suppressClick) return;
      const item = event.target.closest("[data-dock-item]");
      if (item) {
        event.preventDefault();
        event.stopPropagation();
      }
    },
    true
  );

  track.addEventListener("dragstart", (event) => {
    event.preventDefault();
  });
})();

(function initMagneticDock() {
  const track = document.querySelector("[data-dock-track]");
  if (!track) return;

  const items = [...track.querySelectorAll("[data-dock-item]")];
  const maxScale = 1.4;
  const sigma = 95;
  const followEase = 0.14;
  const releaseEase = 0.1;
  const highlightFollowEase = 0.11;
  const highlightReleaseEase = 0.075;
  const highlightAngleStiffnessNear = 0.042;
  const highlightAngleStiffnessFar = 0.014;
  const highlightAngleDampingNear = 0.84;
  const highlightAngleDampingFar = 0.9;

  const states = items.map((el) => ({
    el,
    scale: 1,
    target: 1,
  }));

  let mouseX = Infinity;
  let rafId = null;
  const highlight = {
    angle: 0,
    targetAngle: 0,
    angleVel: 0,
    strength: 0,
    targetStrength: 0,
  };

  const shortestAngleDelta = (from, to) =>
    ((to - from + 540) % 360) - 180;

  const applyHighlight = () => {
    track.style.setProperty(
      "--dock-highlight-angle",
      `${highlight.angle}deg`
    );
    track.style.setProperty(
      "--dock-highlight-strength",
      highlight.strength.toFixed(3)
    );
  };

  const applyScale = (state) => {
    state.el.style.setProperty("--dock-scale", state.scale.toFixed(3));
  };

  const updateTargets = () => {
    states.forEach((state) => {
      const rect = state.el.getBoundingClientRect();
      const center = rect.left + rect.width / 2;
      const dist = mouseX - center;
      const influence = Math.exp(-(dist * dist) / (2 * sigma * sigma));
      state.target = 1 + (maxScale - 1) * influence;
    });
  };

  const tick = () => {
    let active = false;
    const ease = mouseX === Infinity ? releaseEase : followEase;

    states.forEach((state) => {
      const delta = state.target - state.scale;
      if (Math.abs(delta) > 0.002) {
        state.scale += delta * ease;
        active = true;
      } else {
        state.scale = state.target;
      }
      applyScale(state);
    });

    const angleDelta = shortestAngleDelta(
      highlight.angle,
      highlight.targetAngle
    );
    const strengthDelta = highlight.targetStrength - highlight.strength;
    const highlightEase =
      highlight.targetStrength > highlight.strength
        ? highlightFollowEase
        : highlightReleaseEase;

    const absAngleDelta = Math.abs(angleDelta);
    const angleTravel = Math.min(absAngleDelta / 105, 1);
    const angleStiffness =
      highlightAngleStiffnessNear +
      (highlightAngleStiffnessFar - highlightAngleStiffnessNear) *
        angleTravel;
    const angleDamping =
      highlightAngleDampingNear +
      (highlightAngleDampingFar - highlightAngleDampingNear) * angleTravel;

    if (absAngleDelta > 0.1 || Math.abs(highlight.angleVel) > 0.04) {
      highlight.angleVel += angleDelta * angleStiffness;
      highlight.angleVel *= angleDamping;
      highlight.angle += highlight.angleVel;
      active = true;
    } else {
      highlight.angle = highlight.targetAngle;
      highlight.angleVel = 0;
    }

    if (Math.abs(strengthDelta) > 0.003) {
      highlight.strength += strengthDelta * highlightEase;
      active = true;
    } else {
      highlight.strength = highlight.targetStrength;
    }

    applyHighlight();
    rafId = active ? requestAnimationFrame(tick) : null;
  };

  const startLoop = () => {
    if (rafId === null) rafId = requestAnimationFrame(tick);
  };

  const highlightAngleFromItem = (item) => {
    const trackRect = track.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    const cx = trackRect.left + trackRect.width / 2;
    const cy = trackRect.top + trackRect.height / 2;
    const ix = itemRect.left + itemRect.width / 2;
    const iy = itemRect.top + itemRect.height / 2;
    return Math.atan2(ix - cx, cy - iy) * (180 / Math.PI);
  };

  const setBorderHighlight = (item) => {
    const nextAngle = highlightAngleFromItem(item);
    const sweep = Math.abs(shortestAngleDelta(highlight.angle, nextAngle));
    highlight.targetAngle = nextAngle;
    highlight.targetStrength = 1;
    if (sweep > 48) {
      highlight.angleVel *= 0.2;
    }
    startLoop();
  };

  const clearBorderHighlight = () => {
    highlight.targetStrength = 0;
    startLoop();
  };

  items.forEach((item) => {
    item.addEventListener("pointerenter", () => {
      if (track.classList.contains("is-drag-active")) return;
      setBorderHighlight(item);
    });
  });

  track.addEventListener("pointerleave", (event) => {
    if (track.classList.contains("is-drag-active")) return;
    if (!event.relatedTarget || !track.contains(event.relatedTarget)) {
      clearBorderHighlight();
    }
  });

  track.addEventListener("mousemove", (event) => {
    if (track.classList.contains("is-drag-active")) return;
    mouseX = event.clientX;
    updateTargets();
    startLoop();
  });

  track.addEventListener("mouseleave", () => {
    if (track.classList.contains("is-drag-active")) return;
    mouseX = Infinity;
    states.forEach((state) => {
      state.target = 1;
    });
    clearBorderHighlight();
    startLoop();
  });

  const sectionItems = items.filter((item) => item.dataset.section);
  const sections = sectionItems
    .map((item) => document.getElementById(item.dataset.section))
    .filter(Boolean);

  if (sectionItems.length && sections.length) {
    let activeOverride = null;
    let scrollEndTimer = null;
    let scrollListener = null;

    const setActive = (id) => {
      sectionItems.forEach((item) => {
        item.classList.toggle(
          "is-active",
          item.dataset.section === id
        );
      });
    };

    const releaseActiveOverride = () => {
      activeOverride = null;
      if (scrollListener) {
        window.removeEventListener("scroll", scrollListener, true);
        scrollListener = null;
      }
    };

    const lockActive = (id) => {
      activeOverride = id;
      setActive(id);
      window.clearTimeout(scrollEndTimer);

      if (scrollListener) {
        window.removeEventListener("scroll", scrollListener, true);
      }

      scrollListener = () => {
        window.clearTimeout(scrollEndTimer);
        scrollEndTimer = window.setTimeout(() => {
          releaseActiveOverride();
        }, 90);
      };

      window.addEventListener("scroll", scrollListener, {
        passive: true,
        capture: true,
      });
      scrollListener();
    };

    sectionItems.forEach((item) => {
      item.addEventListener("click", () => {
        const id = item.dataset.section;
        if (id) lockActive(id);
      });
    });

    const observer = new IntersectionObserver(
      (entries) => {
        if (activeOverride) {
          setActive(activeOverride);
          return;
        }

        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-40% 0px -45% 0px", threshold: [0, 0.25, 0.5, 0.75] }
    );

    sections.forEach((section) => observer.observe(section));
    setActive(sections[0].id);
  }
})();

const WORD_FULL = "dogaçimen";
const WORD_MOBILE = "doğa";
// Same breakpoints as home.css, so the word and alignment always match the
// canvas height CSS gives us.
const heroWordMobileMq = window.matchMedia("(max-width: 640px)");
const heroDesktopCreditMq = window.matchMedia("(min-width: 961px)");
const heroCenteredMq = window.matchMedia("(max-width: 960px)");
// Dot grid aims for this spacing, kept between these many rows across the name,
// so dots grow relatively chunkier as the name shrinks without any jumps.
const HERO_DOT_SPACING = 8.55;
const HERO_DOT_ROWS_MIN = 15;
const HERO_DOT_ROWS_MAX = 33;
// Narrow viewports: tighter grid + smaller dot radius.
const heroDotSizeMobileMq = window.matchMedia("(max-width: 955px)");
const HERO_MOBILE_DOT_RADIUS_SCALE = 0.9;
const HERO_MOBILE_DOT_SPACING = 3.44;
const HERO_MOBILE_DOT_ROWS_MIN = 26;
const HERO_MOBILE_DOT_ROWS_MAX = 58;
// Halo blur around the name, as a fraction of the font size.
const HERO_HALO_RADIUS = 0.067;
const HERO_MOBILE_WORDMARK_URL = "assets/hero-doga-wordmark.svg";
const HERO_MOBILE_WORDMARK_W = 373.58;
const HERO_MOBILE_WORDMARK_H = 150.79;
// Two independent loops. Upper is the high arch (path 3); lower is the wider band (path 2).
const HERO_WING_UPPER_PATH =
  "M113.64 84.23C91.78 79.25 78.48 60.82 84.67 33.6C90.77 6.81996 110.26 -3.83003 132.4 1.20997C154.54 6.24997 245.73 42.11 239.63 68.88C233.4 96.24 135.64 89.23 113.64 84.22V84.23ZM117.92 65.44C127.51 67.62 213.65 80.71 217.49 63.84C221.03 48.31 137.96 22.39 128.23 20.17C118.78 18.02 110.49 22.51 106.82 38.63C103.08 55.05 108.47 63.28 117.92 65.43V65.44Z";
const HERO_WING_LOWER_PATH =
  "M122.09 120.98C99.67 120.98 82.6 105.96 82.6 78.0499C82.6 50.5899 99.23 35.8799 121.94 35.8799C144.07 35.8799 241.52 50.5999 241.52 78.0499C241.52 106.12 144.65 120.98 122.08 120.98H122.09ZM122.09 101.71C131.93 101.71 218.82 95.3399 218.82 78.0399C218.82 62.1099 132.07 55.2799 122.09 55.2799C112.4 55.2799 105.31 61.4999 105.31 78.0399C105.31 94.5799 112.4 101.71 122.09 101.71Z";
const HERO_WING_UPPER_SVG_X = 246;
const HERO_WING_UPPER_SVG_Y = 42;
const HERO_WING_LOWER_SVG_X = 242;
const HERO_WING_LOWER_SVG_Y = 78;
const HERO_WING_UPPER_SPAN_SVG = 168;
const HERO_WING_LOWER_SPAN_SVG = 160;
const HERO_WING_BURST_MIN = 3.6;
const HERO_WING_BURST_MAX = 8.2;
const HERO_WING_MAX_RAD = (3.6 * Math.PI) / 180;
const HERO_WING_LOWER_LAG = 0.032;

const heroReduceMotionMq = window.matchMedia("(prefers-reduced-motion: reduce)");

let heroMobileWordmarkImage = null;
let heroMobileWordmarkLoadPromise = null;

function canUseHeroMobileWordmark(wordOverride = null) {
  if (wordOverride) return false;
  return heroMobileWordmarkImage && heroMobileWordmarkImage.naturalWidth > 0;
}

function loadHeroMobileWordmark() {
  if (heroMobileWordmarkImage) {
    return Promise.resolve(heroMobileWordmarkImage);
  }
  if (heroMobileWordmarkLoadPromise) {
    return heroMobileWordmarkLoadPromise;
  }

  heroMobileWordmarkLoadPromise = new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const finish = () => {
        heroMobileWordmarkImage = img;
        window.dispatchEvent(new CustomEvent("hero-mobile-wordmark-ready"));
        resolve(img);
      };
      if (typeof img.decode === "function") {
        img.decode().then(finish).catch(finish);
        return;
      }
      finish();
    };
    img.onerror = () => resolve(null);
    img.src = HERO_MOBILE_WORDMARK_URL;
  });

  return heroMobileWordmarkLoadPromise;
}

function getDisplayWord(wordOverride = null) {
  if (typeof wordOverride === "string" && wordOverride.trim()) {
    return wordOverride;
  }
  return heroWordMobileMq.matches ? WORD_MOBILE : WORD_FULL;
}
const FONT_FAMILY = "Monigue";
const COPY_FONT_FAMILY = "Geist Sans";
const LETTER_SPACING_RATIO = 0.025;
const CREDIT_PREFIX = "p5.js interaction inspired by ";
const CREDIT_LINK = "yigit.world";
const CREDIT_URL = "https://yigit.world/";
const INK_FALLBACK = "#1a1814";
const INK_MUTED = "#7a746c";
const INK_FAINT = "#c9c4bc";

function applyTextStyle(ctx, fontSize) {
  ctx.font = `${fontSize}px "${FONT_FAMILY}", sans-serif`;
  if ("letterSpacing" in ctx) {
    ctx.letterSpacing = `${fontSize * LETTER_SPACING_RATIO}px`;
  }
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function lerp(a, b, amount) {
  return a + (b - a) * amount;
}

function readCssPxVar(name, fallback, host = document.documentElement) {
  const probe = document.createElement("div");
  probe.style.cssText = `position:absolute;visibility:hidden;pointer-events:none;width:var(${name});height:0;`;
  host.appendChild(probe);
  const px = probe.getBoundingClientRect().width;
  probe.remove();
  return Number.isFinite(px) && px > 0 ? px : fallback;
}

function readCssNumberVar(name, fallback, host = document.documentElement) {
  const raw = getComputedStyle(host).getPropertyValue(name).trim();
  const value = parseFloat(raw);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

// Reads the hero sizing variables from home.css (#hero-stack). They use
// container units, so they are resolved inside the stack itself.
function getHeroFrame(canvas, width) {
  const host = canvas.parentElement || document.documentElement;
  return {
    nameW: readCssPxVar("--hero-name-w", width * 0.9, host),
    bleedTop: readCssPxVar("--hero-bleed-top", 0, host),
    bleedBottom: readCssPxVar("--hero-bleed-bottom", 0, host),
    trailingPad: readCssPxVar("--hero-trailing-pad", 0, host),
    inkScale: readCssNumberVar("--hero-ink-scale", 1, host),
  };
}

// Right edge of .hero-divider ink band (nudged into the visible stroke).
function readHeroDividerVisibleRight(canvasWidth, host) {
  const contentW = readCssPxVar("--hero-content-w", canvasWidth, host);
  const dividerW = Math.min(canvasWidth, contentW * 0.8);
  const dividerLeft = (canvasWidth - dividerW) / 2;
  return dividerLeft + dividerW * 0.92;
}

function smoothstep(a, b, value) {
  const t = clamp((value - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}

function hash2d(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return s - Math.floor(s);
}

function sampleBrightness(image, x, y) {
  const px = clamp(x | 0, 0, image.width - 1);
  const py = clamp(y | 0, 0, image.height - 1);
  const idx = (py * image.width + px) * 4;
  return (image.data[idx] + image.data[idx + 1] + image.data[idx + 2]) / 3;
}

function smoothBrightness(image, x, y, radius) {
  const b0 = sampleBrightness(image, x, y);
  const b1 = sampleBrightness(image, x + radius, y);
  const b2 = sampleBrightness(image, x, y + radius);
  return b0 * 0.5 + b1 * 0.25 + b2 * 0.25;
}

function rasterizeWingSubpath(width, height, pathD, inkLeft, drawY, scale) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, width, height);
  ctx.save();
  ctx.translate(inkLeft, drawY);
  ctx.scale(scale, scale);
  ctx.fillStyle = "white";
  ctx.fill(new Path2D(pathD), "evenodd");
  ctx.restore();
  return ctx.getImageData(0, 0, width, height);
}

function rotateAround(x, y, px, py, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = x - px;
  const dy = y - py;
  return {
    x: px + dx * cos - dy * sin,
    y: py + dx * sin + dy * cos,
  };
}

function resetPointer(pointer, width, height) {
  pointer.x = width / 2;
  pointer.y = height / 2;
  pointer.px = pointer.x;
  pointer.py = pointer.y;
  pointer.fx = pointer.x;
  pointer.fy = pointer.y;
  pointer.vx = 0;
  pointer.vy = 0;
  pointer.strength = 0;
  pointer.lastX = 1;
  pointer.lastY = 0;
}

function buildMasks(width, height, frame, wordOverride = null, textOffset = null) {
  const crispCanvas = document.createElement("canvas");
  const softCanvas = document.createElement("canvas");
  crispCanvas.width = softCanvas.width = width;
  crispCanvas.height = softCanvas.height = height;

  const crisp = crispCanvas.getContext("2d", { willReadFrequently: true });
  const soft = softCanvas.getContext("2d", { willReadFrequently: true });

  const availHeight = Math.max(
    1,
    height - frame.bleedTop - frame.bleedBottom - (frame.trailingPad ?? 0)
  );
  let fontSize;
  let inkWidth;
  let inkHeight;
  let inkLeft;
  let textBottom;
  let textRight;
  let drawWord;
  let wing = null;

  if (canUseHeroMobileWordmark(wordOverride)) {
    fontSize =
      Math.max(
        1,
        Math.min(
          frame.nameW / HERO_MOBILE_WORDMARK_W,
          availHeight / HERO_MOBILE_WORDMARK_H
        )
      ) * frame.inkScale;
    const maxInkW = width * 0.92;
    const mobileInkW = HERO_MOBILE_WORDMARK_W * fontSize;
    if (mobileInkW > maxInkW) fontSize *= maxInkW / mobileInkW;
    inkWidth = HERO_MOBILE_WORDMARK_W * fontSize;
    inkHeight = HERO_MOBILE_WORDMARK_H * fontSize;
    inkLeft = (width - inkWidth) / 2 + (textOffset?.x ?? 0);
    const drawY = frame.bleedTop + (textOffset?.y ?? 0);
    textBottom = drawY + inkHeight;
    textRight = inkLeft + inkWidth;
    wing = {
      upperX: inkLeft + HERO_WING_UPPER_SVG_X * fontSize,
      upperY: drawY + HERO_WING_UPPER_SVG_Y * fontSize,
      lowerX: inkLeft + HERO_WING_LOWER_SVG_X * fontSize,
      lowerY: drawY + HERO_WING_LOWER_SVG_Y * fontSize,
      upperSpan: HERO_WING_UPPER_SPAN_SVG * fontSize,
      lowerSpan: HERO_WING_LOWER_SPAN_SVG * fontSize,
      upper: rasterizeWingSubpath(
        width,
        height,
        HERO_WING_UPPER_PATH,
        inkLeft,
        drawY,
        fontSize
      ),
      lower: rasterizeWingSubpath(
        width,
        height,
        HERO_WING_LOWER_PATH,
        inkLeft,
        drawY,
        fontSize
      ),
    };

    drawWord = (target, ox = 0, oy = 0) => {
      target.drawImage(
        heroMobileWordmarkImage,
        inkLeft + ox,
        drawY + oy,
        inkWidth,
        inkHeight
      );
    };
  } else {
    const word = getDisplayWord(wordOverride);
    // Ink metrics scale linearly with font size, so measure once and solve.
    const REF_SIZE = 1000;
    applyTextStyle(crisp, REF_SIZE);
    crisp.textAlign = "left";
    crisp.textBaseline = "alphabetic";
    const ref = crisp.measureText(word);
    const inkLeftRatio = (ref.actualBoundingBoxLeft ?? 0) / REF_SIZE;
    const inkWRatio =
      ((ref.actualBoundingBoxLeft ?? 0) + (ref.actualBoundingBoxRight ?? ref.width)) /
      REF_SIZE;
    const ascentRatio = (ref.actualBoundingBoxAscent || REF_SIZE * 0.78) / REF_SIZE;
    const descentRatio = (ref.actualBoundingBoxDescent || REF_SIZE * 0.22) / REF_SIZE;

    fontSize =
      Math.max(
        1,
        Math.min(frame.nameW / inkWRatio, availHeight / (ascentRatio + descentRatio))
      ) * frame.inkScale;
    const maxInkW = width * 0.92;
    const fittedInkW = inkWRatio * fontSize;
    if (fittedInkW > maxInkW) fontSize *= maxInkW / fittedInkW;
    inkWidth = inkWRatio * fontSize;
    inkHeight = (ascentRatio + descentRatio) * fontSize;

    inkLeft = (width - inkWidth) / 2;
    let baselineY = frame.bleedTop + ascentRatio * fontSize;
    inkLeft += textOffset?.x ?? 0;
    baselineY += textOffset?.y ?? 0;
    const drawX = inkLeft + inkLeftRatio * fontSize;
    textBottom = baselineY + descentRatio * fontSize;
    textRight = inkLeft + inkWidth;

    drawWord = (target, ox = 0, oy = 0) => {
      applyTextStyle(target, fontSize);
      target.textAlign = "left";
      target.textBaseline = "alphabetic";
      target.fillText(word, drawX + ox, baselineY + oy);
    };
  }

  crisp.fillStyle = "black";
  crisp.fillRect(0, 0, width, height);
  crisp.fillStyle = "white";
  drawWord(crisp);

  // Soft mask: a cheap blur of the word that the halo dots fade out along.
  soft.fillStyle = "black";
  soft.fillRect(0, 0, width, height);
  const blurRadius = Math.max(2, Math.round(fontSize * HERO_HALO_RADIUS));
  const step = Math.max(2, Math.round(blurRadius / 7));
  soft.fillStyle = "rgba(255, 255, 255, 0.12)";
  drawWord(soft);
  for (let ox = -blurRadius; ox <= blurRadius; ox += step) {
    for (let oy = -blurRadius; oy <= blurRadius; oy += step) {
      if (ox === 0 && oy === 0) continue;
      const distance = Math.sqrt(ox * ox + oy * oy);
      if (distance > blurRadius) continue;
      soft.fillStyle = `rgba(255, 255, 255, ${lerp(0.1, 0.004, distance / blurRadius)})`;
      drawWord(soft, ox, oy);
    }
  }

  return {
    crisp: crisp.getImageData(0, 0, width, height),
    soft: soft.getImageData(0, 0, width, height),
    layout: {
      cx: width / 2,
      fontSize,
      inkHeight,
      textBottom,
      textRight,
      canvasWidth: width,
      canvasHeight: height,
    },
    wing,
  };
}

function drawCredit(ctx, layout, reveal, showIcon = true) {
  const size = clamp(layout.fontSize * 0.11, 10, 13);
  const muted = INK_MUTED;

  ctx.save();
  ctx.font = `400 ${size}px "${COPY_FONT_FAMILY}", sans-serif`;
  ctx.textBaseline = "top";

  const prefixWidth = ctx.measureText(CREDIT_PREFIX).width;
  const linkWidth = ctx.measureText(CREDIT_LINK).width;
  const totalWidth = prefixWidth + linkWidth;
  const circleR = size * 0.72;
  const iconLift = layout.fontSize * 0.08;
  const useDividerAnchor =
    showIcon &&
    heroDesktopCreditMq.matches &&
    layout.canvasWidth > 0 &&
    layout.canvasHeight > 0;

  let creditY;
  let circleCX;
  let circleCY;
  if (useDividerAnchor) {
    const anchorRight = layout.dividerVisibleRight ?? layout.canvasWidth * 0.78;
    const bottomGap = Math.max(14, size * 1.2);
    circleCX = anchorRight - circleR;
    circleCY = layout.canvasHeight - bottomGap - circleR;
    creditY = circleCY - size * 0.52 + iconLift;
  } else {
    const y = layout.textBottom;
    creditY = y - iconLift;
    circleCX = layout.textRight - circleR;
    circleCY = creditY + size * 0.52;
  }

  layout.iconHit = showIcon
    ? {
    x: circleCX - circleR - 3,
    y: circleCY - circleR - 3,
    w: (circleR + 3) * 2,
    h: (circleR + 3) * 2,
      }
    : null;

  const iconAlpha = showIcon ? 1 - smoothstep(0, 0.4, reveal) : 0;
  if (iconAlpha > 0.01) {
    ctx.globalAlpha = iconAlpha;
    ctx.beginPath();
    ctx.arc(circleCX, circleCY, circleR, 0, Math.PI * 2);
    ctx.strokeStyle = INK_FAINT;
    ctx.lineWidth = 0.75;
    ctx.stroke();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = muted;
    ctx.fillText("?", circleCX, circleCY);
    ctx.textBaseline = "top";
    ctx.globalAlpha = 1;
  }

  layout.creditHit = null;
  layout.creditAreaHit = null;

  if (reveal > 0.01) {
    const slide = (1 - reveal) * 14;
    const textAnchorRight = useDividerAnchor
      ? circleCX - circleR - 8
      : layout.textRight;
    const startX = textAnchorRight - totalWidth + slide;

    ctx.globalAlpha = reveal;
    ctx.textAlign = "left";
    ctx.fillStyle = muted;
    ctx.fillText(CREDIT_PREFIX, startX, creditY);

    const linkX = startX + prefixWidth;
    ctx.fillText(CREDIT_LINK, linkX, creditY);

    const underlineY = creditY + size + 2;
    ctx.beginPath();
    ctx.moveTo(linkX, underlineY);
    ctx.lineTo(linkX + linkWidth, underlineY);
    ctx.strokeStyle = INK_FAINT;
    ctx.lineWidth = 0.75;
    ctx.stroke();
    ctx.globalAlpha = 1;

    layout.creditHit = {
      x: linkX - 2,
      y: creditY - 2,
      w: linkWidth + 4,
      h: size + 8,
    };
    layout.creditAreaHit = {
      x: startX - 4,
      y: creditY - 4,
      w: totalWidth + 8,
      h: size + 10,
    };
  }

  ctx.restore();
}

function startHero(
  canvas,
  {
    skipIntro = false,
    wordOverride = null,
    showCredit = true,
    allowNavHide = true,
    backgroundColor = null,
    textOffset = null,
  } = {}
) {
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return;

  const inkColor =
    getComputedStyle(document.documentElement).getPropertyValue("--ink").trim() ||
    INK_FALLBACK;

  let disposed = false;
  let frame = 0;
  let width = 1;
  let height = 1;
  let dpr = 1;
  let needsResize = true;
  let inView = true;
  let masks = null;
  let textLayout = null;
  let reveal = skipIntro ? 1 : 0;
  let hasRevealed = skipIntro;
  let particles = [];
  let dotSpacing = 8;
  let hovering = false;
  let creditHover = false;
  let creditReveal = 0;
  const shouldShowDesktopCredit = () =>
    showCredit && heroDesktopCreditMq.matches;
  let centeredHero = false;
  let wingBurstStart = -1e9;
  let wingNextBurst = null;
  let wingBurstIndex = 0;
  let wingFlopCount = 0;
  let wingBurstDuration = 0;
  let wingBurstDurs = [];
  let wingBurstAmps = [];
  let wingBurstGaps = [];
  let wingBurstKind = "flick";
  let wingSpread = null;

  const pointer = {
    x: 0,
    y: 0,
    px: 0,
    py: 0,
    fx: 0,
    fy: 0,
    vx: 0,
    vy: 0,
    strength: 0,
    lastX: 1,
    lastY: 0,
  };

  const setPointer = (clientX, clientY) => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = clamp(clientX - rect.left, 0, width);
    pointer.y = clamp(clientY - rect.top, 0, height);
    pointer.strength = 1;
  };

  const updatePointer = () => {
    const dx = pointer.x - pointer.px;
    const dy = pointer.y - pointer.py;
    pointer.px = pointer.x;
    pointer.py = pointer.y;

    pointer.vx = lerp(pointer.vx, dx, 0.35) * 0.92;
    pointer.vy = lerp(pointer.vy, dy, 0.35) * 0.92;
    pointer.fx = lerp(pointer.fx, pointer.x, 0.14);
    pointer.fy = lerp(pointer.fy, pointer.y, 0.14);

    const speed = Math.sqrt(pointer.vx * pointer.vx + pointer.vy * pointer.vy);
    if (speed > 0.2) {
      pointer.lastX = pointer.vx / speed;
      pointer.lastY = pointer.vy / speed;
    }

    const targetStrength = hovering ? 1 : 0;
    pointer.strength = lerp(pointer.strength, targetStrength, hovering ? 0.1 : 0.01);
  };

  const buildParticles = () => {
    const list = [];
    const mobileDense = heroDotSizeMobileMq.matches;
    const radiusScale = mobileDense ? HERO_MOBILE_DOT_RADIUS_SCALE : 1;
    const dotSizeMul = mobileDense ? 1.14 : 1;
    const maxDotMul = mobileDense ? 1.52 : 1.38;
    const bgMaxMul = mobileDense ? 0.48 : 0.4;
    const bgMinMul = mobileDense ? 0.02 : 0.01;
    const maxDotSize = dotSpacing * maxDotMul * radiusScale * dotSizeMul;
    const textMaxDot = maxDotSize * (mobileDense ? 0.92 : 0.96);
    const bgMinDot = dotSpacing * bgMinMul * radiusScale * dotSizeMul;
    const bgMaxDot = dotSpacing * bgMaxMul * radiusScale * dotSizeMul;
    const sampleRadius = dotSpacing * 0.5;
    const centerX = width / 2;
    const centerY = height / 2;
    const softGamma = 0.65;
    const mobileThickCenterX = centerX;
    const mobileThickCenterY =
      textLayout?.inkHeight != null
        ? textLayout.textBottom - textLayout.inkHeight * 0.5
        : centerY;
    const heroCenterReach = Math.min(
      width * 0.34,
      Math.max(textLayout?.inkHeight ?? 0, height * 0.2) * 0.82
    );
    const heroCoreReach = Math.min(
      width * 0.4,
      Math.max(textLayout?.inkHeight ?? 0, height * 0.18) * 0.72
    );
    const heroCoreCenterY =
      textLayout?.inkHeight != null && !mobileDense
        ? mobileThickCenterY - textLayout.inkHeight * 0.08
        : mobileThickCenterY;

    const heroCenterFieldAt = (px, py) => {
      const rx = heroCenterReach * 1.08;
      const ry = heroCenterReach * 0.86;
      const dx = (px - mobileThickCenterX) / rx;
      const dy = (py - mobileThickCenterY) / ry;
      const d = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);
      const organic =
        1 +
        0.18 * Math.sin(angle * 2.35 + 0.9) +
        0.14 * (hash2d(px * 0.055, py * 0.055) - 0.5);
      const shaped = d / clamp(organic, 0.74, 1.26);
      const t = 1 - smoothstep(0.06, 1.48, shaped);
      return t * t * (3 - 2 * t);
    };

    const heroCoreFieldAt = (px, py) => {
      const rx = heroCoreReach * 1.42;
      const ry = heroCoreReach * 0.64;
      const dx = (px - mobileThickCenterX) / rx;
      const dy = (py - heroCoreCenterY) / ry;
      const d = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);
      const organic =
        1 +
        0.17 * Math.sin(angle * 2.15 + 0.75) +
        0.13 * (hash2d(px * 0.046, py * 0.046) - 0.5);
      const shaped = d / clamp(organic, 0.75, 1.24);
      const t = 1 - smoothstep(0.05, 1.52, shaped);
      return t * t * (3 - 2 * t);
    };

    for (let x = 0; x < width; x += dotSpacing) {
      for (let y = 0; y < height; y += dotSpacing) {
        const cellThick = heroCenterFieldAt(x, y);
        const half = dotSpacing * 0.5;
        const samplePoints = [{ px: x, py: y, sub: false }];
        if (mobileDense && cellThick > 0.03) {
          samplePoints.push({ px: x + half, py: y, sub: true });
          samplePoints.push({ px: x, py: y + half, sub: true });
          samplePoints.push({ px: x + half, py: y + half, sub: true });
        }
        if (mobileDense && cellThick > 0.14) {
          const quarter = dotSpacing * 0.25;
          samplePoints.push({ px: x + quarter, py: y + quarter, sub: true });
          samplePoints.push({ px: x + half + quarter, py: y + quarter, sub: true });
          samplePoints.push({ px: x + quarter, py: y + half + quarter, sub: true });
        }
        const cellCore = mobileDense ? 0 : heroCoreFieldAt(x, y);
        if (!mobileDense && cellCore > 0.3) {
          samplePoints.push({ px: x + half, py: y, sub: true });
          samplePoints.push({ px: x, py: y + half, sub: true });
        }
        if (!mobileDense && cellCore > 0.48) {
          samplePoints.push({ px: x + half, py: y + half, sub: true });
        }

        for (let si = 0; si < samplePoints.length; si += 1) {
          const { px, py, sub } = samplePoints[si];
          if (px >= width || py >= height) continue;

          const gridX = (px / dotSpacing) | 0;
          const gridY = (py / dotSpacing) | 0;
          const crisp = smoothBrightness(masks.crisp, px, py, sampleRadius);
          const isText = crisp > 45;
          const thickField = heroCenterFieldAt(px, py);
          const coreField = mobileDense ? thickField : heroCoreFieldAt(px, py);

          if (sub && coreField < (mobileDense ? 0.1 : 0.2)) continue;
          if (sub && isText && (mobileDense || coreField < 0.6)) continue;

          let isWing = false;
          let wingLayer = 0;
          let wingOverlap = false;
          if (isText && masks.wing) {
            const upper = sampleBrightness(masks.wing.upper, px, py);
            const lower = sampleBrightness(masks.wing.lower, px, py);
            if (upper > 45 && lower > 45) {
              isWing = true;
              wingLayer = 0;
              wingOverlap = true;
            } else if (upper > 45) {
              isWing = true;
              wingLayer = 0;
            } else if (lower > 45) {
              isWing = true;
              wingLayer = 1;
            }
          }

          let soft = smoothBrightness(masks.soft, px, py, sampleRadius) / 255;
          soft = Math.pow(clamp(soft * 2, 0, 1), softGamma);

          const wordFalloff = isText ? 1 : smoothstep(0, 1, soft);

          const dxn = (px - centerX) / (width / 2);
          const dyn = (py - centerY) / (height / 2);
          const edge = clamp(Math.sqrt(dxn * dxn + dyn * dyn), 0, 1);

          if (!isText) {
            let keepProbability = (mobileDense ? 0.94 : 0.93) * wordFalloff;
            if (mobileDense) {
              const edgeSparse = lerp(0.68, 1.18, Math.pow(thickField, 0.48));
              keepProbability = Math.min(0.995, keepProbability * edgeSparse);
              if (sub) keepProbability = Math.min(0.998, keepProbability + 0.09);
            } else {
              const coreBoost = Math.pow(coreField, 0.7);
              keepProbability = Math.min(
                0.99,
                keepProbability * lerp(1, 1.14, coreBoost)
              );
              if (sub) {
                keepProbability = Math.min(0.995, keepProbability + 0.045 * coreField);
              }
            }
            if (hash2d(gridX * 19.7 + si * 3.7, gridY * 23.3 + si * 5.1) > keepProbability) {
              continue;
            }
          }

          const jitter = hash2d(gridX + si * 0.31, gridY + si * 0.47) * 2 - 1;
          const jitterAmount = (mobileDense ? 0.18 : 0.26) * wordFalloff;
          const phase = hash2d(gridX * 3.1 + si, gridY * 3.1 + si) * Math.PI * 2;

          let baseSize = 0;
          if (isText) {
            const baseDot = dotSpacing * (mobileDense ? 0.56 : 0.52) * radiusScale;
            const textMin = mobileDense ? 0.85 : 0.72;
            const textCrisp = mobileDense ? crisp / 255 : Math.pow(crisp / 255, 0.82);
            baseSize = lerp(baseDot * textMin, textMaxDot, textCrisp);
            baseSize *= 1 + jitter * jitterAmount * (mobileDense ? 0.45 : 0.62);
          } else {
            const softWeight = mobileDense ? lerp(0.3, 0.75, soft) : lerp(0.22, 0.88, soft);
            baseSize = lerp(bgMinDot, bgMaxDot, wordFalloff) * softWeight;
            baseSize *= 1 + jitter * jitterAmount;
          }

          if (mobileDense) {
            baseSize *= lerp(0.62, 1.12, Math.pow(thickField, 0.58));
          } else {
            const grain = hash2d(gridX * 8.17, gridY * 12.91);
            baseSize *= lerp(0.62, 1.12, Math.pow(grain, 0.78));
            if (sub) baseSize *= isText ? 0.9 : 0.94;
          }

          if (baseSize < 0.12) continue;

          const heatSeed = hash2d(gridX * 11.7, gridY * 17.3);

          const particle = {
            ox: px,
            oy: py,
            x: px,
            y: py,
            vx: 0,
            vy: 0,
            baseSize,
            isText,
            isWing,
            wingLayer,
            crisp,
            edge,
            wordFalloff,
            phase,
            jitter,
            jitterAmount,
            gravityWeight: lerp(0.6, 1.45, heatSeed),
            springWeight: lerp(0.5, 1.2, hash2d(gridX * 29.3, gridY * 31.1)),
            settleFreq: lerp(0.9, 2.2, heatSeed),
          };
          list.push(particle);
          if (wingOverlap && !sub) {
            list.push({ ...particle, wingLayer: 1 });
          }
        }
      }
    }

    return list;
  };

  const wingUnit = (n) => {
    const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
  };

  // Arrive slowly. The last part of the move crawls into place.
  const wingEaseOut = (t) => 1 - (1 - t) ** 4;

  // Quick open, then a long ease into rest.
  const wingFlapShape = (u) => {
    const attack = 0.28;
    if (u < attack) return wingEaseOut(u / attack);
    const t = (u - attack) / (1 - attack);
    return (1 - t) ** 4;
  };

  // Bug flick with a premium settle: short open, most of the time slowing to rest.
  const wingSnapShape = (u) => {
    const attack = 0.22;
    if (u < attack) return wingEaseOut(u / attack);
    const t = (u - attack) / (1 - attack);
    return (1 - t) ** 4;
  };

  const scheduleWingBurst = (now) => {
    wingBurstStart = now;
    const first = wingBurstIndex === 0;
    wingBurstIndex += 1;
    const h1 = wingUnit(wingBurstIndex * 1.7);
    const h2 = wingUnit(wingBurstIndex * 2.9 + 4.2);
    if (first) {
      wingBurstKind = "flick";
      wingSpread = null;
      wingFlopCount = 1;
      wingBurstDurs = [lerp(0.72, 0.96, h1)];
      wingBurstAmps = [lerp(0.82, 1, h2)];
      wingBurstGaps = [0];
      wingBurstDuration = wingBurstDurs[0];
    } else {
      const h3 = wingUnit(wingBurstIndex * 4.1 + 1.3);
      const peak = lerp(1.75, 2.05, h1);
      const rise = lerp(0.7, 0.9, h2);
      const hold = lerp(0.18, 0.32, h3);
      const flutterDur = lerp(0.28, 0.4, h1);
      const flutterGap = lerp(0.04, 0.07, h2);
      const flutterAmps = [1.7, 1.05, 0.55].map((amp, index) =>
        amp * lerp(0.92, 1.08, wingUnit(wingBurstIndex * 3.3 + index))
      );
      wingBurstKind = "spread";
      wingSpread = { rise, hold, flutterDur, flutterGap, flutterAmps, peak };
      wingBurstDuration = rise + hold + flutterAmps.length * flutterDur + (flutterAmps.length - 1) * flutterGap;
    }
    wingNextBurst =
      now +
      lerp(
        HERO_WING_BURST_MIN,
        HERO_WING_BURST_MAX,
        wingUnit(wingBurstIndex * 5.1)
      );
  };

  const wingSpreadAt = (elapsed) => {
    const { rise, hold, flutterDur, flutterGap, flutterAmps, peak } = wingSpread;
    if (elapsed < rise) {
      const u = elapsed / rise;
      return peak * wingEaseOut(u);
    }
    let t = elapsed - rise;
    if (t < hold) return peak;
    t -= hold;

    const count = flutterAmps.length;
    for (let i = 0; i < count; i += 1) {
      if (t < flutterDur) {
        return flutterAmps[i] * wingSnapShape(t / flutterDur);
      }
      t -= flutterDur;
      if (i < count - 1 && t < flutterGap) return 0;
      t -= flutterGap;
    }
    return 0;
  };

  const wingWaveAt = (elapsed) => {
    if (wingBurstKind === "spread" && wingSpread) return wingSpreadAt(elapsed);
    let t = elapsed;
    for (let i = 0; i < wingFlopCount; i += 1) {
      if (t < wingBurstDurs[i]) {
        return wingBurstAmps[i] * wingFlapShape(t / wingBurstDurs[i]);
      }
      t -= wingBurstDurs[i];
      if (t < wingBurstGaps[i]) return 0;
      t -= wingBurstGaps[i];
    }
    return 0;
  };

  const wingAnglesAt = (now) => {
    if (heroReduceMotionMq.matches || !masks?.wing) return null;
    if (wingNextBurst == null) wingNextBurst = now + 2.4;
    if (now >= wingNextBurst) scheduleWingBurst(now);

    const elapsed = now - wingBurstStart;
    if (elapsed < 0 || elapsed >= wingBurstDuration) return [0, 0];

    const upper = wingWaveAt(elapsed) * HERO_WING_MAX_RAD;
    const lowerElapsed = elapsed - HERO_WING_LOWER_LAG;
    const lower =
      lowerElapsed < 0
        ? 0
        : -wingWaveAt(lowerElapsed) * HERO_WING_MAX_RAD * 0.94;
    return [upper, lower];
  };

  const updateParticles = (now) => {
    const influence = Math.min(width, height) * 0.3;
    const cursorNear = pointer.strength > 0.02;
    const releaseEase = hovering ? 0 : smoothstep(0, 1, 1 - pointer.strength);
    const springMix = hovering ? 0 : lerp(0.002, 0.02, 1 - pointer.strength);
    const wingAngles = wingAnglesAt(now);
    const wing = masks?.wing;

    for (let i = 0; i < particles.length; i += 1) {
      const p = particles[i];
      const homeDx = p.ox - p.x;
      const homeDy = p.oy - p.y;
      const homeDist = Math.hypot(homeDx, homeDy);
      const follow = springMix * p.springWeight;

      p.vx += homeDx * follow;
      p.vy += homeDy * follow;

      if (releaseEase > 0 && homeDist > 0.01) {
        const tangentX = -homeDy / homeDist;
        const tangentY = homeDx / homeDist;
        const settleFalloff = clamp(homeDist / (dotSpacing * 4), 0, 1);
        const settleDrift =
          (Math.sin(now * p.settleFreq + p.phase) +
            Math.sin(now * p.settleFreq * 1.37 + p.phase * 1.6) * 0.35) *
          dotSpacing *
          0.01 *
          releaseEase *
          settleFalloff;
        p.vx += tangentX * settleDrift;
        p.vy += tangentY * settleDrift;
      }

      const dx = p.x - pointer.fx;
      const dy = p.y - pointer.fy;
      const dist = Math.hypot(dx, dy) || 0.001;

      if (cursorNear && dist < influence) {
        const falloff = 1 - smoothstep(0, influence, dist);
        const nx = dx / dist;
        const ny = dy / dist;

        const explode =
          dotSpacing * 0.68 * falloff * falloff * falloff * pointer.strength;
        p.vx += nx * explode;
        p.vy += ny * explode;

        const pullBand = falloff * (1 - falloff) * 4;
        const gravity =
          dotSpacing * 0.1 * pullBand * pointer.strength * p.gravityWeight;
        p.vx -= nx * gravity;
        p.vy -= ny * gravity;

        const speed = Math.hypot(pointer.vx, pointer.vy);
        if (speed > 0.4) {
          const shove = dotSpacing * 0.18 * falloff * clamp(speed / 16, 0, 1);
          p.vx += pointer.lastX * shove;
          p.vy += pointer.lastY * shove;
        }

        const wobble = Math.sin(now * 6.2 + dist * 0.06);
        p.vx += -ny * wobble * dotSpacing * 0.04 * falloff;
        p.vy += nx * wobble * dotSpacing * 0.04 * falloff;
      }

      const damping = lerp(0.982, 0.9, 1 - pointer.strength);
      p.vx *= damping;
      p.vy *= damping;
      p.x += p.vx;
      p.y += p.vy;

      const odx = p.x - p.ox;
      const ody = p.y - p.oy;
      const offset = Math.hypot(odx, ody);
      const maxOffset = dotSpacing * (p.isText ? 12 : 7.5);
      if (offset > maxOffset) {
        const excess = (offset - maxOffset) / offset;
        p.x -= odx * excess * 0.06;
        p.y -= ody * excess * 0.06;
        p.vx *= 0.94;
        p.vy *= 0.94;
      }

      p.flapX = 0;
      p.flapY = 0;
      if (p.isWing && wingAngles && wing) {
        const pivotX = p.wingLayer === 0 ? wing.upperX : wing.lowerX;
        const pivotY = p.wingLayer === 0 ? wing.upperY : wing.lowerY;
        const span = p.wingLayer === 0 ? wing.upperSpan : wing.lowerSpan;
        const along = clamp((pivotX - p.ox) / (span || 1), 0, 1);
        const weight = smoothstep(0.15, 1, along);
        const rest = rotateAround(
          p.ox,
          p.oy,
          pivotX,
          pivotY,
          (wingAngles[p.wingLayer] || 0) * weight
        );
        const drag = Math.hypot(p.x - p.ox, p.y - p.oy);
        const fade = 1 - smoothstep(dotSpacing * 0.35, dotSpacing * 3.5, drag);
        p.flapX = (rest.x - p.ox) * fade;
        p.flapY = (rest.y - p.oy) * fade;
      }
    }
  };

  const getDpr = () => Math.min(window.devicePixelRatio || 1, 2);

  const resize = () => {
    if (document.body.classList.contains("dodollm-panel-animating")) {
      return;
    }
    needsResize = false;

    const rect = canvas.getBoundingClientRect();
    const nextWidth = Math.max(1, Math.round(rect.width));
    const nextHeight = Math.max(1, Math.round(rect.height));
    const nextDpr = getDpr();

    if (
      width === nextWidth &&
      height === nextHeight &&
      dpr === nextDpr &&
      masks
    ) {
      return;
    }

    width = nextWidth;
    height = nextHeight;
    dpr = nextDpr;
    centeredHero = heroCenteredMq.matches;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    masks = buildMasks(width, height, getHeroFrame(canvas, width), wordOverride, textOffset);
    textLayout = masks.layout;
    const layoutHost = canvas.parentElement || document.documentElement;
    textLayout.dividerVisibleRight = readHeroDividerVisibleRight(width, layoutHost);
    const mobileDots = heroDotSizeMobileMq.matches;
    dotSpacing = clamp(
      mobileDots ? HERO_MOBILE_DOT_SPACING : HERO_DOT_SPACING,
      textLayout.inkHeight /
        (mobileDots ? HERO_MOBILE_DOT_ROWS_MAX : HERO_DOT_ROWS_MAX),
      textLayout.inkHeight /
        (mobileDots ? HERO_MOBILE_DOT_ROWS_MIN : HERO_DOT_ROWS_MIN)
    );
    particles = buildParticles();
    if (!hasRevealed) reveal = 0;
    resetPointer(pointer, width, height);
  };

  const draw = (time) => {
    frame = 0;
    if (disposed) return;

    // Layout is read only when the ResizeObserver or a DPR change asks for it.
    if (needsResize || dpr !== getDpr()) resize();
    reveal = Math.min(1, reveal + INTRO_DOT_REVEAL_RATE);
    if (reveal >= 1) hasRevealed = true;
    updatePointer();
    const now = time * 0.001;
    updateParticles(now);

    ctx.clearRect(0, 0, width, height);
    if (backgroundColor) {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, width, height);
    }
    ctx.fillStyle = inkColor;

    const cursorDist = (p) => Math.hypot(p.x - pointer.fx, p.y - pointer.fy);
    const influence = Math.min(width, height) * 0.3;

    // Every dot is the same opaque ink, so the whole field is one path.
    ctx.beginPath();
    for (let i = 0; i < particles.length; i += 1) {
      const p = particles[i];
      const idle = Math.sin(now * 0.7 + p.phase);
      const idleMultiplier = 1 + idle * 0.028 * p.wordFalloff;

      let dotSize = p.baseSize;
      if (p.isText) {
        dotSize *= centeredHero
          ? smoothstep(0, 0.12, reveal)
          : smoothstep(0, 0.12, reveal - p.edge);
      }
      dotSize *= idleMultiplier;

      if (pointer.strength > 0.02) {
        const dist = cursorDist(p);
        if (dist < influence) {
          const falloff = 1 - smoothstep(0, influence, dist);
          const wobble = Math.sin(now * 6.2 + dist * 0.06);
          const sizeBoost = 1 + wobble * 0.12 * falloff * pointer.strength;
          dotSize *= p.isText
            ? lerp(0.97, 1.08, clamp((sizeBoost - 1) / 0.12 + 0.5, 0, 1))
            : sizeBoost;
        }
      }

      if (dotSize < 0.12) continue;

      const radius = dotSize / 2;
      const drawX = p.x + (p.flapX || 0);
      const drawY = p.y + (p.flapY || 0);
      ctx.moveTo(drawX + radius, drawY);
      ctx.arc(drawX, drawY, radius, 0, Math.PI * 2);
    }
    ctx.fill();

    creditReveal = shouldShowDesktopCredit()
      ? lerp(creditReveal, creditHover ? 1 : 0, creditHover ? 0.22 : 0.14)
      : 0;
    if (shouldShowDesktopCredit() && textLayout) {
      drawCredit(ctx, textLayout, creditReveal, true);
    }

    if (inView) frame = window.requestAnimationFrame(draw);
  };

  const canvasPoint = (event) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const inRect = (hit, x, y) =>
    hit && x >= hit.x && x <= hit.x + hit.w && y >= hit.y && y <= hit.y + hit.h;

  const hitCreditIcon = (x, y) => inRect(textLayout?.iconHit, x, y);

  const hitCreditLink = (x, y) =>
    creditReveal > 0.45 && inRect(textLayout?.creditHit, x, y);

  const hitCreditZone = (x, y) =>
    hitCreditIcon(x, y) ||
    (creditReveal > 0.35 && inRect(textLayout?.creditAreaHit, x, y));

  const mobileTouchMq = window.matchMedia("(max-width: 960px)");
  const TOUCH_AXIS_SLOP = 10;
  const TAP_SLOP = 14;
  let touchGestureAxis = null;
  let touchStartX = 0;
  let touchStartY = 0;
  let lastCanvasTapAt = 0;

  const setCanvasNavHidden = (hidden) => {
    if (!allowNavHide || !mobileTouchMq.matches) return;
    window.csMobileNav?.setInteractionHidden?.(hidden);
  };

  const touchMovement = (clientX, clientY) => {
    const dx = clientX - touchStartX;
    const dy = clientY - touchStartY;
    return { dx, dy, dist: Math.hypot(dx, dy) };
  };

  const isTapGesture = (clientX, clientY) =>
    touchMovement(clientX, clientY).dist < TAP_SLOP;

  const resolveTouchAxis = (clientX, clientY) => {
    if (!mobileTouchMq.matches) return "interact";
    if (touchGestureAxis !== null) return touchGestureAxis;

    const { dist, dx, dy } = touchMovement(clientX, clientY);
    if (dist < TOUCH_AXIS_SLOP) return null;

    touchGestureAxis = Math.abs(dx) >= Math.abs(dy) ? "interact" : "scroll";
    return touchGestureAxis;
  };

  const resetTouchGesture = () => {
    touchGestureAxis = null;
  };

  const handleCanvasTapAt = (clientX, clientY, event) => {
    const now = Date.now();
    if (now - lastCanvasTapAt < 450) return;
    lastCanvasTapAt = now;

    const { x, y } = canvasPoint(
      event ?? { clientX, clientY }
    );
    if (!shouldShowDesktopCredit()) return;
    if (hitCreditLink(x, y)) {
      window.open(CREDIT_URL, "_blank", "noopener,noreferrer");
    }
  };

  const isTouchLikePointer = (event) =>
    event.pointerType === "touch" || event.pointerType === "pen";

  const applyPointerFromClient = (clientX, clientY, event) => {
    setPointer(clientX, clientY);
    const { x, y } = canvasPoint(event);
    creditHover = shouldShowDesktopCredit() && hitCreditZone(x, y);
    canvas.style.cursor =
      shouldShowDesktopCredit() &&
      (hitCreditLink(x, y) || (creditReveal < 0.2 && hitCreditIcon(x, y)))
        ? "pointer"
        : "crosshair";
  };

  const onPointerMove = (event) => {
    if (mobileTouchMq.matches && isTouchLikePointer(event)) {
      const axis = resolveTouchAxis(event.clientX, event.clientY);
      if (axis === null) return;
      if (axis === "scroll") {
        hovering = false;
        setCanvasNavHidden(false);
        return;
      }
      hovering = true;
      setCanvasNavHidden(true);
    }

    applyPointerFromClient(event.clientX, event.clientY, event);
  };

  const onClick = (event) => {
    handleCanvasTapAt(event.clientX, event.clientY, event);
  };

  const onPointerDown = (event) => {
    if (mobileTouchMq.matches && isTouchLikePointer(event)) {
      resetTouchGesture();
      touchStartX = event.clientX;
      touchStartY = event.clientY;
      setCanvasNavHidden(true);
      return;
    }
    applyPointerFromClient(event.clientX, event.clientY, event);
  };

  const onPointerUp = (event) => {
    if (mobileTouchMq.matches && isTouchLikePointer(event)) {
      if (isTapGesture(event.clientX, event.clientY)) {
        applyPointerFromClient(event.clientX, event.clientY, event);
        handleCanvasTapAt(event.clientX, event.clientY, event);
      }
      setCanvasNavHidden(false);
      resetTouchGesture();
      return;
    }
  };

  const onPointerEnter = () => {
    if (!mobileTouchMq.matches) hovering = true;
  };

  const onPointerLeave = () => {
    hovering = false;
    creditHover = false;
    resetTouchGesture();
    setCanvasNavHidden(false);
  };

  const onTouchStart = (event) => {
    resetTouchGesture();
    const touch = event.touches[0];
    if (!touch) return;
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    setCanvasNavHidden(true);
  };

  const onTouchMove = (event) => {
    const touch = event.touches[0];
    if (!touch) return;

    const axis = resolveTouchAxis(touch.clientX, touch.clientY);
    if (axis === null) return;
    if (axis === "scroll") {
      hovering = false;
      setCanvasNavHidden(false);
      return;
    }

    hovering = true;
    setCanvasNavHidden(true);
    setPointer(touch.clientX, touch.clientY);
  };

  const onTouchEnd = (event) => {
    const touch = event.changedTouches[0];
    if (
      touch &&
      mobileTouchMq.matches &&
      isTapGesture(touch.clientX, touch.clientY)
    ) {
      handleCanvasTapAt(touch.clientX, touch.clientY, touch);
    }
    hovering = false;
    resetTouchGesture();
    setCanvasNavHidden(false);
  };

  const observer = new ResizeObserver(() => {
    needsResize = true;
  });
  observer.observe(canvas);

  const onHeroWordMobileMqChange = () => {
    loadHeroMobileWordmark().finally(() => {
      needsResize = true;
    });
  };
  const onHeroMobileWordmarkReady = () => {
    needsResize = true;
  };
  heroWordMobileMq.addEventListener("change", onHeroWordMobileMqChange);
  const onHeroDesktopCreditMqChange = () => {
    creditHover = false;
    creditReveal = 0;
    needsResize = true;
  };
  heroDesktopCreditMq.addEventListener("change", onHeroDesktopCreditMqChange);
  heroDotSizeMobileMq.addEventListener("change", () => {
    needsResize = true;
  });
  window.addEventListener("hero-mobile-wordmark-ready", onHeroMobileWordmarkReady);

  // Stop drawing while the hero is scrolled out of view.
  const viewObserver = new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    if (inView && !frame && !disposed) {
      frame = window.requestAnimationFrame(draw);
    }
  });
  viewObserver.observe(canvas);

  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("click", onClick);
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointerenter", onPointerEnter);
  canvas.addEventListener("pointerleave", onPointerLeave);
  canvas.addEventListener("touchstart", onTouchStart, { passive: true });
  canvas.addEventListener("touchmove", onTouchMove, { passive: true });
  canvas.addEventListener("touchend", onTouchEnd);
  canvas.addEventListener("touchcancel", onTouchEnd);

  resize();
  frame = window.requestAnimationFrame(draw);

  return () => {
    disposed = true;
    window.cancelAnimationFrame(frame);
    observer.disconnect();
    viewObserver.disconnect();
    heroWordMobileMq.removeEventListener("change", onHeroWordMobileMqChange);
    heroDesktopCreditMq.removeEventListener("change", onHeroDesktopCreditMqChange);
    window.removeEventListener(
      "hero-mobile-wordmark-ready",
      onHeroMobileWordmarkReady
    );
    canvas.removeEventListener("pointermove", onPointerMove);
    canvas.removeEventListener("click", onClick);
    canvas.removeEventListener("pointerdown", onPointerDown);
    canvas.removeEventListener("pointerup", onPointerUp);
    canvas.removeEventListener("pointerenter", onPointerEnter);
    canvas.removeEventListener("pointerleave", onPointerLeave);
    canvas.removeEventListener("touchstart", onTouchStart);
    canvas.removeEventListener("touchmove", onTouchMove);
    canvas.removeEventListener("touchend", onTouchEnd);
    canvas.removeEventListener("touchcancel", onTouchEnd);
  };
}

function positionHeroForIntro(canvas) {
  const rect = canvas.getBoundingClientRect();
  const currentCenter = rect.top + rect.height / 2;

  if (window.matchMedia("(max-width: 960px)").matches) {
    const nav = document.querySelector(".cs-nav");
    const navBottom = nav?.getBoundingClientRect().bottom ?? 48;
    const visibleCenter =
      navBottom + (window.innerHeight - navBottom) / 2;
    return visibleCenter - currentCenter;
  }

  return window.innerHeight / 2 - currentCenter;
}

const INTRO_DOT_REVEAL_RATE = 0.028;
const INTRO_CENTER_HOLD_MS = 700;
const INTRO_SLIDE_MS = 550;
const INTRO_SCROLL_UNLOCK_FALLBACK_MS = 600;
const INTRO_DOCK_DELAY_MS = 500;
const INTRO_HERO_CHROME_DELAY_MS = 700;
const INTRO_WORK_DELAY_MS = 1000;
const INTRO_LIQUID_DELAY_MS = 1100;
const INTRO_SEEN_KEY = "portfolio-intro-seen";

function hasSeenIntro() {
  try {
    return localStorage.getItem(INTRO_SEEN_KEY) === "true";
  } catch {
    return false;
  }
}

function markIntroSeen() {
  try {
    localStorage.setItem(INTRO_SEEN_KEY, "true");
  } catch {
    /* quota / private mode */
  }
}

let entranceTimeouts = [];
let scrollLocked = false;
let scrollUnlockFallbackId = null;

const SCROLL_KEYS = new Set([
  " ",
  "PageUp",
  "PageDown",
  "ArrowUp",
  "ArrowDown",
  "Home",
  "End",
]);

function preventScrollWhileLocked(event) {
  if (!scrollLocked) return;
  event.preventDefault();
}

function preventScrollKeysWhileLocked(event) {
  if (!scrollLocked) return;
  if (SCROLL_KEYS.has(event.key)) event.preventDefault();
}

function lockScroll() {
  if (scrollLocked) return;
  scrollLocked = true;
  document.documentElement.classList.add("intro-locked");
  document.body.classList.add("intro-locked");
  window.addEventListener("wheel", preventScrollWhileLocked, {
    passive: false,
  });
  window.addEventListener("touchmove", preventScrollWhileLocked, {
    passive: false,
  });
  window.addEventListener("keydown", preventScrollKeysWhileLocked);
}

function unlockScroll() {
  if (!scrollLocked) return;
  scrollLocked = false;
  document.documentElement.classList.remove("intro-locked");
  document.body.classList.remove("intro-locked");
  window.removeEventListener("wheel", preventScrollWhileLocked);
  window.removeEventListener("touchmove", preventScrollWhileLocked);
  window.removeEventListener("keydown", preventScrollKeysWhileLocked);
  if (scrollUnlockFallbackId !== null) {
    window.clearTimeout(scrollUnlockFallbackId);
    scrollUnlockFallbackId = null;
  }
}

function unlockScrollAfterHeroSlide(canvasWrapper) {
  if (!scrollLocked) return;

  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    canvasWrapper.removeEventListener("transitionend", onTransitionEnd);
    unlockScroll();
    markIntroSeen();
  };

  const onTransitionEnd = (event) => {
    if (event.target !== canvasWrapper || event.propertyName !== "transform") {
      return;
    }
    finish();
  };

  canvasWrapper.addEventListener("transitionend", onTransitionEnd);
  scrollUnlockFallbackId = window.setTimeout(
    finish,
    INTRO_SCROLL_UNLOCK_FALLBACK_MS
  );
}

function clearEntranceTimeouts() {
  entranceTimeouts.forEach((id) => window.clearTimeout(id));
  entranceTimeouts = [];
}

function scheduleEntrance(fn, delay) {
  const id = window.setTimeout(fn, delay);
  entranceTimeouts.push(id);
  return id;
}

function resetEntranceDomState() {
  clearEntranceTimeouts();

  const canvasWrapper = document.getElementById("canvas-wrapper");
  const dock = document.getElementById("dock");
  const csNav = document.querySelector(".cs-nav");
  const heroCopy = document.getElementById("hero-copy");
  const heroDivider = document.querySelector(".hero-divider");
  const workMore = document.querySelector(".work-more");
  const workSection = document.getElementById("work");

  canvasWrapper.classList.remove("is-animating");
  canvasWrapper.style.transition = "";
  canvasWrapper.style.transform = "";

  dock?.classList.remove("visible");
  csNav?.classList.remove("visible");
  heroCopy.classList.remove("visible");
  heroDivider.classList.remove("visible");
  workMore?.classList.remove("visible");
  workSection.classList.remove("visible");
  if (!window.matchMedia("(max-width: 960px)").matches) lockScroll();
}

function skipEntranceToFinalState() {
  clearEntranceTimeouts();

  const canvasWrapper = document.getElementById("canvas-wrapper");
  const dock = document.getElementById("dock");
  const csNav = document.querySelector(".cs-nav");
  const heroCopy = document.getElementById("hero-copy");
  const heroDivider = document.querySelector(".hero-divider");
  const workMore = document.querySelector(".work-more");
  const workSection = document.getElementById("work");

  canvasWrapper?.classList.remove("is-animating");
  if (canvasWrapper) {
    canvasWrapper.style.transition = "";
    canvasWrapper.style.transform = "none";
  }

  dock?.classList.add("visible");
  csNav?.classList.add("visible");
  heroCopy?.classList.add("visible");
  heroDivider?.classList.add("visible");
  workMore?.classList.add("visible");
  workSection?.classList.add("visible");
  document.getElementById("liquid-bg")?.classList.add("ready");
  unlockScroll();
}

function startEntranceSequence() {
  clearEntranceTimeouts();

  const canvasWrapper = document.getElementById("canvas-wrapper");
  const canvas = document.getElementById("hero-canvas");
  const dock = document.getElementById("dock");
  const csNav = document.querySelector(".cs-nav");
  const heroCopy = document.getElementById("hero-copy");
  const heroDivider = document.querySelector(".hero-divider");
  const workMore = document.querySelector(".work-more");
  const workSection = document.getElementById("work");

  const revealHeroChrome = () => {
    heroCopy.classList.add("visible");
    heroDivider.classList.add("visible");
    workMore?.classList.add("visible");
    csNav?.classList.add("visible");
  };

  const revealAll = () => {
    dock?.classList.add("visible");
    revealHeroChrome();
    workSection.classList.add("visible");
    unlockScroll();
    markIntroSeen();
  };

  if (window.matchMedia("(max-width: 960px)").matches) {
    canvasWrapper.style.transform = "none";
    revealAll();
    return;
  }

  // Measure canvas in its final in-flow position, then offset it
  // downward so it appears visually centered in the viewport.
  const startY = positionHeroForIntro(canvas);
  canvasWrapper.style.transition = "none";
  canvasWrapper.style.transform = `translate3d(0, ${startY}px, 0)`;

  // Let the p5 dots animate in, then slide the canvas to its final position.
  scheduleEntrance(() => {
    canvasWrapper.style.transition = "";
    canvasWrapper.classList.add("is-animating");

    requestAnimationFrame(() => {
      canvasWrapper.style.transform = "translate3d(0, 0, 0)";
      unlockScrollAfterHeroSlide(canvasWrapper);
    });

    scheduleEntrance(
      () => dock?.classList.add("visible"),
      INTRO_DOCK_DELAY_MS
    );

    scheduleEntrance(revealHeroChrome, INTRO_HERO_CHROME_DELAY_MS);

    scheduleEntrance(
      () => document.getElementById("liquid-bg")?.classList.add("ready"),
      INTRO_LIQUID_DELAY_MS
    );

    scheduleEntrance(
      () => workSection.classList.add("visible"),
      INTRO_WORK_DELAY_MS
    );
  }, INTRO_CENTER_HOLD_MS);
}

function initHeroChatPull() {
  const stack = document.getElementById("hero-stack");
  const float = document.querySelector(".hero-chat__float");
  if (!stack || !float) return;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const INFLUENCE = 240;
  const PULL_X = 22;
  const PULL_Y = -28;
  let targetX = 0;
  let targetY = 0;
  let currentX = 0;
  let currentY = 0;
  let raf = 0;

  const apply = () => {
    float.style.transform = `translate(${currentX.toFixed(2)}px, ${currentY.toFixed(2)}px)`;
  };

  const tick = () => {
    currentX = lerp(currentX, targetX, 0.16);
    currentY = lerp(currentY, targetY, 0.16);
    apply();
    if (Math.hypot(currentX - targetX, currentY - targetY) > 0.25) {
      raf = requestAnimationFrame(tick);
      return;
    }
    currentX = targetX;
    currentY = targetY;
    apply();
    raf = 0;
  };

  const start = () => {
    if (raf) return;
    raf = requestAnimationFrame(tick);
  };

  stack.addEventListener("pointermove", (event) => {
    if (reduced.matches) return;
    const rect = float.getBoundingClientRect();
    const dist = Math.hypot(
      event.clientX - (rect.left + rect.width / 2),
      event.clientY - (rect.top + rect.height / 2)
    );
    const strength = 1 - clamp(dist / INFLUENCE, 0, 1);
    const eased = strength * strength;
    // Only up and right, so the bubble stays on the wordmark.
    targetX = eased * PULL_X;
    targetY = eased * PULL_Y;
    start();
  });

  stack.addEventListener("pointerleave", () => {
    targetX = 0;
    targetY = 0;
    start();
  });
}

const boot = () => {
  const skipIntro = hasSeenIntro();
  const canvas = document.getElementById("hero-canvas");
  const isMobile = window.matchMedia("(max-width: 960px)").matches;

  if (!skipIntro && !isMobile) lockScroll();
  startHero(canvas, { skipIntro });

  if (skipIntro) {
    skipEntranceToFinalState();
    return;
  }

  // One rAF to let startHero size the canvas, then measure + begin entrance.
  requestAnimationFrame(startEntranceSequence);
};

initHeroChatPull();

window.addEventListener("pageshow", (event) => {
  if (!event.persisted) return;
  window.scrollTo(0, 0);
  if (hasSeenIntro()) {
    skipEntranceToFinalState();
    return;
  }
  resetEntranceDomState();
  requestAnimationFrame(startEntranceSequence);
});

// Boot once fonts are ready, but never let a stalled font hold the intro.
const FONT_WAIT_MAX_MS = 3000;
let booted = false;
const bootOnce = () => {
  if (booted) return;
  booted = true;
  boot();
};

Promise.race([
  Promise.all([
    document.fonts.load(`120px "${FONT_FAMILY}"`),
    document.fonts.load(`400 16px "${COPY_FONT_FAMILY}"`),
    loadHeroMobileWordmark(),
  ]),
  new Promise((resolve) => window.setTimeout(resolve, FONT_WAIT_MAX_MS)),
]).finally(bootOnce);

(function initWorkMore() {
  const btn = document.querySelector(".work-more__btn");
  const panel = document.getElementById("work-extra");
  const label = btn?.querySelector(".work-more__btn-label");
  if (!btn || !panel || !label) return;

  const labelMore = "View more work";
  const labelLess = "View less work";

  const getScrollContainer = (el) => {
    const main = document.querySelector(".app-shell__main");
    if (main && main.contains(el)) {
      const { overflowY } = getComputedStyle(main);
      if (
        (overflowY === "auto" || overflowY === "scroll") &&
        main.scrollHeight > main.clientHeight
      ) {
        return main;
      }
    }
    return document.scrollingElement || document.documentElement;
  };

  const scrollTowardExtraWork = () => {
    const target = panel.querySelector(".work-extra-grid") || btn;
    const scrollEl = getScrollContainer(target);
    const targetRect = target.getBoundingClientRect();
    const isDocumentScroll =
      scrollEl === document.documentElement ||
      scrollEl === document.body ||
      scrollEl === document.scrollingElement;
    const viewportTop = isDocumentScroll
      ? 0
      : scrollEl.getBoundingClientRect().top;
    const viewportHeight = isDocumentScroll
      ? window.innerHeight
      : scrollEl.clientHeight;
    const desiredTop = viewportTop + viewportHeight * 0.16;
    const delta = targetRect.top - desiredTop;

    if (Math.abs(delta) < 12) return;

    const distance = Math.sign(delta) * Math.min(Math.abs(delta), 320);
    scrollEl.scrollBy({
      top: distance,
      behavior: "smooth",
    });
  };

  const setOpen = (open) => {
    panel.classList.toggle("is-open", open);
    btn.setAttribute("aria-expanded", String(open));
    panel.setAttribute("aria-hidden", String(!open));
    const nextLabel = open ? labelLess : labelMore;
    label
      .querySelectorAll(".work-more__btn-label-line")
      .forEach((line) => {
        line.textContent = nextLabel;
      });

    if (open) {
      scrollTowardExtraWork();
    }
  };

  btn.addEventListener("click", () => {
    setOpen(!panel.classList.contains("is-open"));
  });
})();

(function initAboutCardStack() {
  const stack = document.querySelector("[data-about-card-stack]");
  if (!stack) return;

  const cards = [...stack.querySelectorAll(".about-card")];
  if (cards.length < 2) return;

  const media = cards
    .map((card) => card.querySelector(".about-card__media"))
    .filter(Boolean);

  media.forEach((img) => {
    const markReady = () => {
      img.classList.add("is-loaded");
    };

    if (img.complete && img.naturalWidth > 0) {
      markReady();
    } else {
      img.addEventListener("load", markReady, { once: true });
    }

    if (typeof img.decode === "function") {
      img.decode().then(markReady).catch(() => {});
    }
  });

  const positions = ["front", "middle", "back"];
  const finePointer = window.matchMedia("(pointer: fine)");
  let order = [...cards];
  let pointerState = null;
  let isAnimating = false;
  let cursorRafId = 0;
  let cursorX = 0;
  let cursorY = 0;
  let cursorTargetX = 0;
  let cursorTargetY = 0;

  const cursor = finePointer.matches
    ? (() => {
        const el = document.createElement("span");
        el.className = "about-cursor-chevron";
        el.setAttribute("aria-hidden", "true");
        el.innerHTML = `
          <span class="about-cursor-chevron__side about-cursor-chevron__side--left">
            <span class="about-cursor-chevron__glass" aria-hidden="true"></span>
            <span class="about-cursor-chevron__chevron-slot">
              <span class="about-cursor-chevron__chevrons">
                <svg class="icon about-cursor-chevron__chevron" viewBox="0 0 24 24" aria-hidden="true">
                  <use href="assets/icons.svg#icon-chevron-left" />
                </svg>
                <svg class="icon about-cursor-chevron__chevron about-cursor-chevron__chevron--ghost" viewBox="0 0 24 24" aria-hidden="true">
                  <use href="assets/icons.svg#icon-chevron-left" />
                </svg>
              </span>
            </span>
          </span>
          <span class="about-cursor-chevron__side about-cursor-chevron__side--right">
            <span class="about-cursor-chevron__glass" aria-hidden="true"></span>
            <span class="about-cursor-chevron__chevron-slot">
              <span class="about-cursor-chevron__chevrons">
                <svg class="icon about-cursor-chevron__chevron" viewBox="0 0 24 24" aria-hidden="true">
                  <use href="assets/icons.svg#icon-chevron-right" />
                </svg>
                <svg class="icon about-cursor-chevron__chevron about-cursor-chevron__chevron--ghost" viewBox="0 0 24 24" aria-hidden="true">
                  <use href="assets/icons.svg#icon-chevron-right" />
                </svg>
              </span>
            </span>
          </span>
        `;
        document.body.appendChild(el);
        return el;
      })()
    : null;

  const render = () => {
    order.forEach((card, index) => {
      card.dataset.position = positions[index] || "back";
    });
  };

  const clearDragVars = () => {
    stack.style.removeProperty("--about-drag-offset");
    stack.style.removeProperty("--about-drag-rotate");
  };

  const setDragVars = (dx) => {
    const clamped = Math.max(-80, Math.min(80, dx));
    stack.style.setProperty("--about-drag-offset", `${clamped * 0.14}px`);
    stack.style.setProperty("--about-drag-rotate", `${clamped * 0.012}deg`);
  };

  const rotateOrder = (direction) => {
    if (direction === "left") {
      order.unshift(order.pop());
      return;
    }

    order.push(order.shift());
  };

  const SHUFFLE_MS = 520;
  const SHUFFLE_SETTLE_MS = Math.round(SHUFFLE_MS * 0.34);
  const AUTO_SHUFFLE_MIN_MS = 4800;
  const AUTO_SHUFFLE_MAX_MS = 9200;
  let autoShuffleTimerId = 0;
  let isInView = false;

  const clearAutoShuffle = () => {
    window.clearTimeout(autoShuffleTimerId);
    autoShuffleTimerId = 0;
  };

  const scheduleAutoShuffle = () => {
    clearAutoShuffle();
    if (!isInView || document.hidden) return;

    const delay =
      AUTO_SHUFFLE_MIN_MS +
      Math.random() * (AUTO_SHUFFLE_MAX_MS - AUTO_SHUFFLE_MIN_MS);

    autoShuffleTimerId = window.setTimeout(() => {
      autoShuffleTimerId = 0;
      if (!isInView || document.hidden || isAnimating || pointerState) {
        scheduleAutoShuffle();
        return;
      }

      shuffle(Math.random() < 0.5 ? "left" : "right");
      scheduleAutoShuffle();
    }, delay);
  };

  const resetAutoShuffle = () => {
    clearAutoShuffle();
    scheduleAutoShuffle();
  };

  const aboutSection = stack.closest("#about") || stack.closest("section");
  if (aboutSection && "IntersectionObserver" in window) {
    const viewObserver = new IntersectionObserver(
      (entries) => {
        isInView = entries.some((entry) => entry.isIntersecting);
        if (isInView) scheduleAutoShuffle();
        else clearAutoShuffle();
      },
      { threshold: 0.25 }
    );
    viewObserver.observe(aboutSection);
  } else {
    isInView = true;
    scheduleAutoShuffle();
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) clearAutoShuffle();
    else scheduleAutoShuffle();
  });

  const finishShuffle = () => {
    stack.classList.remove("is-shuffling");
    cards.forEach((card) => card.classList.remove("is-exiting"));
    delete stack.dataset.direction;
    isAnimating = false;
  };

  const shuffle = (direction = "right") => {
    if (isAnimating) return;

    isAnimating = true;
    clearDragVars();
    stack.classList.remove("is-dragging", "is-compressing");
    cursor?.classList.remove("is-pressed");

    stack.dataset.direction = direction;
    const exitingCard = order[0];
    stack.classList.add("is-shuffling");

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        exitingCard?.classList.add("is-exiting");
        rotateOrder(direction);
        render();

        const settleId = window.setTimeout(() => {
          exitingCard?.classList.remove("is-exiting");
        }, SHUFFLE_SETTLE_MS);

        let finished = false;
        const complete = () => {
          if (finished) return;
          finished = true;
          stack.removeEventListener("transitionend", onTransitionEnd);
          window.clearTimeout(settleId);
          window.clearTimeout(fallbackId);
          finishShuffle();
        };

        const onTransitionEnd = (event) => {
          if (event.target !== exitingCard) return;
          if (event.propertyName !== "transform") return;
          if (exitingCard.classList.contains("is-exiting")) return;
          complete();
        };

        stack.addEventListener("transitionend", onTransitionEnd);
        const fallbackId = window.setTimeout(
          complete,
          SHUFFLE_SETTLE_MS + SHUFFLE_MS + 80
        );
      });
    });
  };

  const getHoverSide = (clientX) => {
    const rect = stack.getBoundingClientRect();
    const localX = clientX - rect.left;
    return localX < rect.width / 3 ? "left" : "right";
  };

  const tickCursor = () => {
    if (!cursor) return;
    cursorX += (cursorTargetX - cursorX) * 0.38;
    cursorY += (cursorTargetY - cursorY) * 0.38;
    cursor.style.left = `${cursorX}px`;
    cursor.style.top = `${cursorY}px`;

    if (
      Math.abs(cursorTargetX - cursorX) < 0.1 &&
      Math.abs(cursorTargetY - cursorY) < 0.1
    ) {
      cursorRafId = 0;
      return;
    }

    cursorRafId = requestAnimationFrame(tickCursor);
  };

  const moveCursor = (clientX, clientY) => {
    if (!cursor) return;
    cursorTargetX = clientX;
    cursorTargetY = clientY;
    if (!cursorRafId) cursorRafId = requestAnimationFrame(tickCursor);
  };

  const showCursor = (side, clientX, clientY) => {
    if (!cursor || stack.classList.contains("is-dragging")) return;
    cursor.dataset.side = side;
    moveCursor(clientX, clientY);
    cursor.classList.add("is-visible");
  };

  const hideCursor = () => {
    if (!cursor) return;
    cursor.classList.remove("is-visible");
    delete cursor.dataset.side;
  };

  const updateCursor = (clientX, clientY) => {
    if (!cursor) return;
    if (stack.classList.contains("is-dragging")) {
      hideCursor();
      return;
    }
    showCursor(getHoverSide(clientX), clientX, clientY);
  };

  const bounceCursor = () => {
    if (!cursor) return;
    cursor.classList.remove("is-pressed", "is-bouncing");
    void cursor.offsetWidth;
    cursor.classList.add("is-bouncing");

    const onBounceEnd = (event) => {
      if (event.animationName !== "about-email-pill-bounce") return;
      cursor.classList.remove("is-bouncing");
      cursor.removeEventListener("animationend", onBounceEnd);
    };

    cursor.addEventListener("animationend", onBounceEnd);
  };

  stack.addEventListener("pointerdown", (event) => {
    if (isAnimating || event.button !== 0) return;
    resetAutoShuffle();
    cursor?.classList.add("is-pressed");

    pointerState = {
      id: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      isHorizontal: false,
    };
  });

  stack.addEventListener("pointermove", (event) => {
    if (!pointerState || pointerState.id !== event.pointerId) {
      updateCursor(event.clientX, event.clientY);
      return;
    }

    const dx = event.clientX - pointerState.startX;
    const dy = event.clientY - pointerState.startY;

    if (!pointerState.isHorizontal && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.25) {
      pointerState.isHorizontal = true;
      hideCursor();
      stack.setPointerCapture?.(event.pointerId);
    }

    if (!pointerState.isHorizontal) {
      updateCursor(event.clientX, event.clientY);
      return;
    }

    if (isAnimating) return;

    event.preventDefault();
    stack.classList.add("is-dragging", "is-compressing");
    setDragVars(dx);

    if (Math.abs(dx) > 82) {
      shuffle(dx < 0 ? "left" : "right");
      bounceCursor();
      pointerState = null;
    }
  });

  stack.addEventListener("pointerenter", (event) => {
    updateCursor(event.clientX, event.clientY);
  });

  stack.addEventListener("pointerleave", () => {
    hideCursor();
  });

  const endPointer = (event) => {
    if (!pointerState || pointerState.id !== event.pointerId) return;

    const dx = event.clientX - pointerState.startX;
    const didSwipe = pointerState.isHorizontal && Math.abs(dx) > 42;
    const direction = didSwipe ? (dx < 0 ? "left" : "right") : getHoverSide(event.clientX);

    stack.classList.remove("is-dragging", "is-compressing");
    clearDragVars();
    pointerState = null;
    resetAutoShuffle();
    shuffle(direction);
    bounceCursor();
  };

  stack.addEventListener("pointerup", endPointer);
  stack.addEventListener("pointercancel", (event) => {
    if (pointerState?.id === event.pointerId) {
      pointerState = null;
      stack.classList.remove("is-dragging", "is-compressing");
      clearDragVars();
      cursor?.classList.remove("is-pressed", "is-bouncing");
      hideCursor();
    }
  });

  window.addEventListener("blur", hideCursor);

  stack.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      resetAutoShuffle();
      shuffle("left");
      bounceCursor();
    }

    if (event.key === "ArrowRight" || event.key === " " || event.key === "Enter") {
      event.preventDefault();
      resetAutoShuffle();
      shuffle("right");
      bounceCursor();
    }
  });

  render();
})();

(function initThumbVideos() {
  // Hover previews only exist for real pointers; touch devices never fetch them.
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

  const links = [...document.querySelectorAll(".work-card-link")];

  links.forEach((link) => {
    const video = link.querySelector(".work-thumb-video");
    if (!video) return;

    // Reveal the video only once frames are actually playing.
    video.addEventListener("playing", () => {
      if (link.matches(":hover")) video.classList.add("is-playing");
    });

    link.addEventListener("pointerenter", () => {
      video.currentTime = 0;
      video.play().catch(() => {});
    });

    link.addEventListener("pointerleave", () => {
      video.classList.remove("is-playing");
      video.pause();
      video.currentTime = 0;
    });
  });

  // Once the page is idle, warm the main grid's videos so first hover is instant.
  const warmMainGridVideos = () => {
    document
      .querySelectorAll(".work-grid .work-thumb-video")
      .forEach((video) => {
        video.preload = "auto";
      });
  };
  const scheduleWarm = () => {
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(warmMainGridVideos, { timeout: 4000 });
    } else {
      window.setTimeout(warmMainGridVideos, 1500);
    }
  };
  if (document.readyState === "complete") scheduleWarm();
  else window.addEventListener("load", scheduleWarm, { once: true });
})();

(function initWorkCardLoadingState() {
  document.querySelectorAll(".work-card-link").forEach((link) => {
    link.addEventListener("click", (e) => {
      if (e.defaultPrevented) return;
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      link.classList.add("is-loading");
    });
  });

  window.addEventListener("pageshow", () => {
    document.querySelectorAll(".work-card-link.is-loading").forEach((link) => {
      link.classList.remove("is-loading");
    });
  });
})();

(function initAboutEmailPill() {
  if (!window.matchMedia("(pointer: fine)").matches) return;
  if (window.matchMedia("(max-width: 960px)").matches) return;

  const aboutText = document.querySelector("#about .about-text");
  if (!aboutText) return;

  const pill = document.createElement("span");
  pill.className = "about-email-pill";
  pill.setAttribute("aria-hidden", "true");
  pill.innerHTML = `
    <span class="about-email-pill__content">
      <svg class="icon about-email-pill__icon" viewBox="0 0 24 24" aria-hidden="true">
        <use href="assets/icons.svg#icon-mail" />
      </svg>
      <span class="about-email-pill__label">copy email</span>
    </span>
  `;
  document.body.appendChild(pill);

  const label = pill.querySelector(".about-email-pill__label");
  let activeLink = null;
  let rafId = 0;
  let targetX = window.innerWidth / 2;
  let targetY = window.innerHeight / 2;
  let currentX = targetX;
  let currentY = targetY;
  let restoreLabelId = 0;
  let bounceId = 0;

  const getEmailLink = (target) => {
    if (!(target instanceof Element)) return null;
    return target.closest("[data-about-email]");
  };

  const getEmail = (link) =>
    link?.dataset.email || "dogacimen35@gmail.com";

  const setLabel = (text) => {
    if (label) label.textContent = text;
  };

  const stopAnimation = () => {
    if (!rafId) return;
    cancelAnimationFrame(rafId);
    rafId = 0;
  };

  const tick = () => {
    currentX += (targetX - currentX) * 0.28;
    currentY += (targetY - currentY) * 0.28;
    pill.style.left = `${currentX}px`;
    pill.style.top = `${currentY}px`;

    if (Math.abs(targetX - currentX) < 0.1 && Math.abs(targetY - currentY) < 0.1) {
      rafId = 0;
      return;
    }

    rafId = requestAnimationFrame(tick);
  };

  const updatePosition = (event) => {
    targetX = event.clientX;
    targetY = event.clientY;
    if (!rafId) rafId = requestAnimationFrame(tick);
  };

  const resetCopiedState = () => {
    window.clearTimeout(restoreLabelId);
    restoreLabelId = 0;
    pill.classList.remove("is-copied");
    setLabel("copy email");
  };

  const runBounce = () => {
    pill.classList.remove("is-bouncing");
    void pill.offsetWidth;
    pill.classList.add("is-bouncing");
    window.clearTimeout(bounceId);
    bounceId = window.setTimeout(() => {
      pill.classList.remove("is-bouncing");
      bounceId = 0;
    }, 540);
  };

  const copyEmail = async (email) => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(email);
      return true;
    }

    const field = document.createElement("textarea");
    field.value = email;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.appendChild(field);
    field.select();
    const copied = document.execCommand("copy");
    field.remove();
    return copied;
  };

  const onEnter = (event) => {
    resetCopiedState();
    updatePosition(event);
    pill.classList.add("is-visible");
    document.body.classList.add("about-email-pill-active");
  };

  const onLeave = () => {
    resetCopiedState();
    pill.classList.remove("is-visible", "is-pressed", "is-bouncing");
    document.body.classList.remove("about-email-pill-active");
    stopAnimation();
  };

  aboutText.addEventListener("pointerover", (event) => {
    const link = getEmailLink(event.target);
    if (!link) return;

    if (activeLink && activeLink !== link) {
      onLeave();
    }

    if (activeLink !== link) {
      activeLink = link;
      onEnter(event);
      return;
    }

    updatePosition(event);
  });

  aboutText.addEventListener("pointermove", (event) => {
    if (!activeLink) return;
    const link = getEmailLink(event.target);
    if (link !== activeLink) return;
    updatePosition(event);
  });

  aboutText.addEventListener("pointerout", (event) => {
    if (!activeLink) return;
    const link = getEmailLink(event.target);
    if (link !== activeLink) return;

    const related = event.relatedTarget;
    if (related instanceof Node && activeLink.contains(related)) return;

    activeLink = null;
    onLeave();
  });

  aboutText.addEventListener("pointerdown", (event) => {
    const link = getEmailLink(event.target);
    if (!link) return;
    activeLink = link;
    updatePosition(event);
    pill.classList.add("is-pressed");
  });

  aboutText.addEventListener("click", async (event) => {
    if (window.matchMedia("(max-width: 960px)").matches) return;

    const link = getEmailLink(event.target);
    if (!link) return;

    event.preventDefault();
    const email = getEmail(link);

    try {
      const copied = await copyEmail(email);
      if (!copied) throw new Error("Copy failed");

      pill.classList.remove("is-pressed");
      pill.classList.add("is-copied");
      setLabel("email copied!");
      runBounce();
      window.clearTimeout(restoreLabelId);
      restoreLabelId = window.setTimeout(resetCopiedState, 1300);
    } catch {
      pill.classList.remove("is-pressed");
      setLabel("copy failed");
      window.clearTimeout(restoreLabelId);
      restoreLabelId = window.setTimeout(() => {
        resetCopiedState();
        window.location.href = link.href;
      }, 700);
    }
  });

  window.addEventListener("pointerup", () => {
    pill.classList.remove("is-pressed");
  });
  window.addEventListener("pointercancel", () => {
    pill.classList.remove("is-pressed");
  });
  window.addEventListener("blur", () => {
    activeLink = null;
    onLeave();
  });
})();

(function initAboutEmailMobilePill() {
  const aboutText = document.querySelector("#about .about-text");
  if (!aboutText) return;

  const mobileMq = window.matchMedia("(max-width: 960px)");
  const HOLD_MS = 3200;

  const pill = document.createElement("span");
  pill.className = "about-email-pill is-anchor-above";
  pill.setAttribute("role", "status");
  pill.setAttribute("aria-live", "polite");
  pill.innerHTML = `
    <span class="about-email-pill__content">
      <svg class="icon about-email-pill__icon" viewBox="0 0 24 24" aria-hidden="true">
        <use href="assets/icons.svg#icon-mail" />
      </svg>
      <span class="about-email-pill__label">email copied!</span>
    </span>
  `;
  document.body.appendChild(pill);

  const label = pill.querySelector(".about-email-pill__label");
  let holdTimer = 0;
  let bounceTimer = 0;
  let activeLink = null;

  const isMobileMode = () => mobileMq.matches;

  const getEmailLink = (target) => {
    if (!(target instanceof Element)) return null;
    return target.closest("[data-about-email]");
  };

  const getEmail = (link) =>
    link?.dataset.email || "dogacimen35@gmail.com";

  const copyEmailSync = (email) => {
    const field = document.createElement("textarea");
    field.value = email;
    field.setAttribute("readonly", "");
    field.style.position = "absolute";
    field.style.left = "-9999px";
    field.style.top = "0";
    document.body.appendChild(field);

    const selection = document.getSelection();
    const selected =
      selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

    field.select();
    field.setSelectionRange(0, email.length);

    let copied = false;
    try {
      copied = document.execCommand("copy");
    } catch {
      copied = false;
    }

    if (selected && selection) {
      selection.removeAllRanges();
      selection.addRange(selected);
    } else if (selection) {
      selection.removeAllRanges();
    }

    field.remove();
    return copied;
  };

  const positionAboveLink = (link) => {
    const rect = link.getBoundingClientRect();
    pill.style.left = `${rect.left + rect.width / 2}px`;
    pill.style.top = `${rect.top}px`;
  };

  const runBounce = () => {
    pill.classList.remove("is-bouncing");
    void pill.offsetWidth;
    pill.classList.add("is-bouncing");
    window.clearTimeout(bounceTimer);
    bounceTimer = window.setTimeout(() => {
      pill.classList.remove("is-bouncing");
      bounceTimer = 0;
    }, 540);
  };

  const hidePill = () => {
    window.clearTimeout(holdTimer);
    holdTimer = 0;
    activeLink = null;
    pill.classList.remove(
      "is-visible",
      "is-copied",
      "is-pressed",
      "is-bouncing"
    );
  };

  const showCopiedPill = (link) => {
    hidePill();
    activeLink = link;
    positionAboveLink(link);
    if (label) label.textContent = "email copied!";

    requestAnimationFrame(() => {
      pill.classList.add("is-visible", "is-copied", "is-pressed");

      requestAnimationFrame(() => {
        pill.classList.remove("is-pressed");
        runBounce();
      });
    });

    holdTimer = window.setTimeout(hidePill, HOLD_MS);
  };

  const handleEmailTap = (event) => {
    if (!isMobileMode()) return;

    const link = getEmailLink(event.target);
    if (!link) return;

    event.preventDefault();
    event.stopPropagation();

    const copied = copyEmailSync(getEmail(link));

    if (!copied) {
      window.setTimeout(() => {
        window.location.href = link.href;
      }, 60);
      return;
    }

    showCopiedPill(link);
  };

  aboutText.addEventListener("click", handleEmailTap, true);

  window.addEventListener(
    "scroll",
    () => {
      if (!activeLink || !pill.classList.contains("is-visible")) return;
      positionAboveLink(activeLink);
    },
    { passive: true }
  );

  mobileMq.addEventListener("change", (event) => {
    if (!event.matches) hidePill();
  });
})();

(function initWorkCursorPill() {
  if (!window.matchMedia("(pointer: fine)").matches) return;

  const thumbs = document.querySelectorAll(".work-card-link .work-thumb");
  if (!thumbs.length) return;

  const pill = document.createElement("span");
  pill.className = "work-cursor-pill";
  pill.setAttribute("aria-hidden", "true");
  pill.innerHTML = `
    <span class="work-cursor-pill__content">
      <svg class="work-cursor-pill__icon" xmlns="http://www.w3.org/2000/svg" width="34" height="16" viewBox="0 0 84 40" fill="none" aria-hidden="true">
        <title>Blinking eye</title>
        <g class="work-cursor-pill__eye-frame">
          <path d="M81.7418 13.391C71.0858 5.0082 56.1048 0 41.6678 0C27.2338 0 12.2498 5.0078 1.5938 13.391C0.586 14.184 0 15.391 0 16.6683C0 17.9456 0.58594 19.1527 1.5898 19.9456C12.2498 28.3284 27.2348 33.3366 41.6678 33.3366C56.1058 33.3366 71.0858 28.3327 81.7418 19.9456C82.7457 19.1565 83.3316 17.9495 83.3316 16.6683C83.3355 15.391 82.7496 14.1839 81.7418 13.391ZM49.9998 16.6683C49.9998 21.2621 46.2615 25.0003 41.6678 25.0003C37.0701 25.0003 33.3358 21.262 33.3358 16.6683C33.3358 12.0706 37.0741 8.3363 41.6678 8.3363C46.2615 8.3363 49.9998 12.0707 49.9998 16.6683ZM26.2378 10.43C25.4566 12.3597 25.0034 14.4573 25.0034 16.6683C25.0034 18.8753 25.4565 20.9769 26.2378 22.9066C20.9644 21.4808 15.9328 19.3714 11.4798 16.6683C15.9329 13.9652 20.9642 11.8558 26.2378 10.43ZM57.0968 22.907C57.8781 20.9773 58.3312 18.8797 58.3312 16.6687C58.3312 14.4617 57.8781 12.3601 57.0968 10.4304C62.3663 11.8562 67.4018 13.9656 71.8508 16.6687C67.4016 19.3718 62.3703 21.4812 57.0968 22.907Z" fill="currentColor"/>
        </g>
        <g class="work-cursor-pill__eye-frame" hidden transform="translate(0,3)">
          <path d="M81.7418 11.1141C71.0858 4.15652 56.1048 -0.000175476 41.6678 -0.000175476C27.2338 -0.000175476 12.2498 4.15619 1.5938 11.1141C0.586 11.7722 0 12.774 0 13.8341C0 14.8943 0.58594 15.8961 1.5898 16.5542C12.2498 23.5118 27.2348 27.6685 41.6678 27.6685C56.1058 27.6685 71.0858 23.5153 81.7418 16.5542C82.7457 15.8993 83.3316 14.8975 83.3316 13.8341C83.3355 12.774 82.7496 11.7721 81.7418 11.1141ZM49.9998 13.8341C49.9998 17.6469 46.2615 19.6685 41.6678 19.6685C37.0701 19.6685 33.3358 17.6468 33.3358 13.8341C33.3358 10.0182 37.0741 8.66846 41.6678 8.66846C46.2615 8.66846 49.9998 10.0182 49.9998 13.8341ZM26.2378 10.4062C25.4566 12.0078 25.0034 11.9991 25.0034 13.8341C25.0034 15.6659 25.4565 18.4066 26.2378 19.0118C20.9644 18.5646 15.9328 16.0777 11.4798 13.8341C15.9329 11.5906 20.9642 11.5896 26.2378 10.4062ZM57.0968 19.0119C57.8781 18.4067 58.3312 15.6696 58.3312 13.8345C58.3312 12.0027 57.8781 12.0081 57.0968 10.4065C62.3663 11.5899 67.4018 11.591 71.8508 13.8345C67.4016 16.078 62.3703 18.5647 57.0968 19.0119Z" fill="currentColor"/>
        </g>
        <g class="work-cursor-pill__eye-frame" hidden transform="translate(0.5,7)">
          <path d="M81.4165 8.03381C70.8029 3.00462 55.8815 0 41.502 0C27.1254 0 12.2011 3.00438 1.58746 8.03381C0.583668 8.50955 0 9.2337 0 10C0 10.7663 0.583608 11.4905 1.58347 11.9662C12.2011 16.9954 27.1264 20 41.502 20C55.8825 20 70.8029 16.998 81.4165 11.9662C82.4164 11.4928 83 10.7686 83 10C83.0039 9.2337 82.4203 8.5095 81.4165 8.03381ZM49.8008 10C49.8008 12.756 46.0774 12.334 41.502 12.334C36.9226 12.334 33.2031 12.7559 33.2031 10C33.2031 7.24165 36.9266 8.14933 41.502 8.14933C46.0774 8.14933 49.8008 7.24171 49.8008 10ZM26.1334 7.52213C25.3552 8.67984 24.9039 8.67353 24.9039 10C24.9039 11.3241 25.3552 13.3051 26.1334 13.7426C20.881 13.4194 15.8694 11.6217 11.4341 10C15.8695 8.3783 20.8808 8.37753 26.1334 7.52213ZM56.8696 13.7427C57.6477 13.3052 58.0991 11.3267 58.0991 10.0002C58.0991 8.67617 57.6478 8.68008 56.8696 7.52237C62.1181 8.37777 67.1336 8.37854 71.5649 10.0002C67.1334 11.6219 62.1221 13.4195 56.8696 13.7427Z" fill="currentColor"/>
        </g>
        <g class="work-cursor-pill__eye-frame" hidden transform="translate(0.5,12)">
          <path d="M3.50098 7.74252C32.4318 2.1326 49.6614 2.03917 79.001 7.74256M4.00098 7.74245C32.9318 13.3524 49.1614 13.4458 78.501 7.74245" stroke="currentColor" stroke-width="7" stroke-linecap="round" fill="none"/>
        </g>
        <g class="work-cursor-pill__eye-frame" hidden transform="translate(0.5,15)">
          <path d="M79 3.5H3.5" stroke="currentColor" stroke-width="7" stroke-linecap="round" fill="none"/>
        </g>
      </svg>
      <span class="work-cursor-pill__label">View case study</span>
    </span>
  `;
  document.body.appendChild(pill);

  const eyeFrames = [...pill.querySelectorAll(".work-cursor-pill__eye-frame")];
  const blinkSequence = [0, 1, 2, 3, 4, 4, 3, 2, 1, 0];
  const blinkFrameMs = 38;
  const EYE_BLINK_HOVER_DELAY_MS = 220;
  const EYE_BLINK_INTERVAL_MIN_MS = 550;
  const EYE_BLINK_INTERVAL_SPREAD_MS = 850;
  let blinkScheduleId = 0;
  let blinkStepId = 0;
  let eyeBlinking = false;
  // Blink timers only run while the pill is on screen.
  let pillVisible = false;

  const showEyeFrame = (idx) => {
    eyeFrames.forEach((frame, i) => {
      if (i === idx) frame.removeAttribute("hidden");
      else frame.setAttribute("hidden", "");
    });
  };

  const clearEyeBlinkTimers = () => {
    window.clearTimeout(blinkScheduleId);
    window.clearTimeout(blinkStepId);
    blinkScheduleId = 0;
    blinkStepId = 0;
  };

  const scheduleEyeBlink = (delayMs) => {
    if (!pillVisible) return;
    if (eyeBlinking) return;
    window.clearTimeout(blinkScheduleId);
    blinkScheduleId = 0;
    if (!eyeBlinking) {
      window.clearTimeout(blinkStepId);
      blinkStepId = 0;
    }
    const delay =
      delayMs ??
      EYE_BLINK_INTERVAL_MIN_MS +
        Math.random() * EYE_BLINK_INTERVAL_SPREAD_MS;
    blinkScheduleId = window.setTimeout(runEyeBlink, delay);
  };

  const runEyeBlink = () => {
    clearEyeBlinkTimers();
    eyeBlinking = true;
    let step = 0;
    const next = () => {
      if (step >= blinkSequence.length) {
        showEyeFrame(0);
        eyeBlinking = false;
        scheduleEyeBlink();
        return;
      }
      showEyeFrame(blinkSequence[step]);
      step += 1;
      blinkStepId = window.setTimeout(next, blinkFrameMs);
    };
    next();
  };

  const blinkOnHover = () => {
    if (eyeBlinking) return;
    window.clearTimeout(blinkScheduleId);
    blinkScheduleId = window.setTimeout(runEyeBlink, EYE_BLINK_HOVER_DELAY_MS);
  };

  const stopEyeBlink = () => {
    clearEyeBlinkTimers();
    eyeBlinking = false;
    showEyeFrame(0);
  };

  let activeCount = 0;
  let rafId = 0;
  let targetX = window.innerWidth / 2;
  let targetY = window.innerHeight / 2;
  let currentX = targetX;
  let currentY = targetY;

  const stopAnimation = () => {
    if (!rafId) return;
    cancelAnimationFrame(rafId);
    rafId = 0;
  };

  const tick = () => {
    currentX += (targetX - currentX) * 0.24;
    currentY += (targetY - currentY) * 0.24;
    pill.style.left = `${currentX}px`;
    pill.style.top = `${currentY}px`;

    if (Math.abs(targetX - currentX) < 0.1 && Math.abs(targetY - currentY) < 0.1) {
      rafId = 0;
      return;
    }

    rafId = requestAnimationFrame(tick);
  };

  const updatePosition = (event) => {
    targetX = event.clientX;
    targetY = event.clientY;
    if (!rafId) rafId = requestAnimationFrame(tick);
  };

  const onEnter = (event) => {
    activeCount += 1;
    updatePosition(event);
    pill.classList.add("is-visible");
    document.body.classList.add("work-pill-active");
    pillVisible = true;
    blinkOnHover();
  };

  const onLeave = () => {
    activeCount = Math.max(0, activeCount - 1);
    if (activeCount > 0) return;
    pill.classList.remove("is-visible", "is-pressed");
    document.body.classList.remove("work-pill-active");
    pillVisible = false;
    stopEyeBlink();
    stopAnimation();
  };

  thumbs.forEach((thumb) => {
    thumb.addEventListener("pointerenter", onEnter);
    thumb.addEventListener("pointermove", updatePosition);
    thumb.addEventListener("pointerleave", onLeave);
    thumb.addEventListener("pointercancel", onLeave);
  });

  const releasePress = () => pill.classList.remove("is-pressed");

  document.querySelectorAll(".work-card-link").forEach((link) => {
    link.addEventListener("pointerdown", () => {
      if (!pill.classList.contains("is-visible")) return;
      pill.classList.add("is-pressed");
    });
  });

  window.addEventListener("pointerup", releasePress);
  window.addEventListener("pointercancel", releasePress);

  window.addEventListener("blur", onLeave);
})();
