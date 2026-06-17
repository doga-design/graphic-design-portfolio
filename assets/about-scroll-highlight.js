(function initAboutScrollHighlight() {
  "use strict";

  const about = document.getElementById("about");
  const copy = about?.querySelector(".about-copy");
  const aboutText = copy?.querySelector(".about-text");
  if (!about || !aboutText) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const mobileMq = window.matchMedia("(max-width: 960px)");
  const targets = [...aboutText.querySelectorAll("p")];
  if (!targets.length) return;

  const originals = new Map(targets.map((el) => [el, el.innerHTML]));
  let lines = [];
  let ticking = false;

  function getScrollContainer() {
    const main = document.querySelector(".app-shell__main");
    if (!main || !main.contains(about)) {
      return document.scrollingElement || document.documentElement;
    }

    const { overflowY } = getComputedStyle(main);
    if (
      (overflowY === "auto" || overflowY === "scroll") &&
      main.scrollHeight > main.clientHeight
    ) {
      return main;
    }

    return document.scrollingElement || document.documentElement;
  }

  function getNodeTop(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const range = document.createRange();
      range.selectNodeContents(node);
      return range.getBoundingClientRect().top;
    }

    return node.getBoundingClientRect().top;
  }

  function splitTextNodeAtLineBreaks(textNode) {
    const text = textNode.textContent;
    if (!text || !/\S/.test(text)) return;

    const range = document.createRange();
    const words = text.match(/\S+\s*/g);
    if (!words || words.length <= 1) return;

    const breaks = [0];
    let lastTop = null;
    let offset = 0;

    words.forEach((word) => {
      offset += word.length;
      range.setStart(textNode, 0);
      range.setEnd(textNode, offset);
      const top = range.getBoundingClientRect().top;

      if (lastTop !== null && Math.abs(top - lastTop) > 2) {
        breaks.push(offset - word.length);
      }

      lastTop = top;
    });

    breaks.push(text.length);
    if (breaks.length <= 2) return;

    const parent = textNode.parentNode;
    const frag = document.createDocumentFragment();

    for (let i = 0; i < breaks.length - 1; i += 1) {
      frag.appendChild(
        document.createTextNode(text.slice(breaks[i], breaks[i + 1]))
      );
    }

    parent.replaceChild(frag, textNode);
  }

  function splitTextNodes(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const textNodes = [];

    while (walker.nextNode()) textNodes.push(walker.currentNode);
    textNodes.forEach(splitTextNodeAtLineBreaks);
  }

  function groupLines(root) {
    const items = [];

    root.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE && !node.textContent) return;
      items.push({ node, top: getNodeTop(node) });
    });

    if (!items.length) return [];

    const groups = [];
    let group = [];
    let lastTop = null;

    items.forEach((item, index) => {
      if (lastTop !== null && Math.abs(item.top - lastTop) > 2) {
        groups.push(group);
        group = [];
      }

      group.push(item.node);
      lastTop = item.top;

      if (index === items.length - 1) groups.push(group);
    });

    return groups.map((nodes) => {
      const line = document.createElement("span");
      const paragraphIndex = targets.indexOf(root);
      const isPaperLine = paragraphIndex < 2;

      line.className = isPaperLine
        ? "about-line about-line--paper"
        : "about-line about-line--accent";
      root.insertBefore(line, nodes[0]);
      nodes.forEach((node) => line.appendChild(node));
      return line;
    });
  }

  function update() {
    if (!lines.length) return;

    const scrollEl = getScrollContainer();
    const isDocumentScroll =
      scrollEl === document.documentElement ||
      scrollEl === document.body ||
      scrollEl === document.scrollingElement;

    const trigger = isDocumentScroll
      ? window.innerHeight * 0.76
      : scrollEl.getBoundingClientRect().top + scrollEl.clientHeight * 0.76;

    let activeCount = 0;

    for (let i = 0; i < lines.length; i += 1) {
      const rect = lines[i].getBoundingClientRect();
      if (rect.top < trigger) activeCount = i + 1;
      else break;
    }

    lines.forEach((line, index) => {
      line.classList.toggle("is-highlighted", index < activeCount);
    });
  }

  function rebuild() {
    targets.forEach((el) => {
      el.innerHTML = originals.get(el);
      splitTextNodes(el);
    });

    lines = targets.flatMap((el) => groupLines(el));

    if (reduceMotion.matches) {
      lines.forEach((line) => line.classList.add("is-highlighted"));
      return;
    }

    update();
  }

  function onScroll() {
    if (ticking || reduceMotion.matches) return;
    ticking = true;
    requestAnimationFrame(() => {
      update();
      ticking = false;
    });
  }

  function bindScroll() {
    const scrollEl = getScrollContainer();
    window.removeEventListener("scroll", onScroll);
    scrollEl.removeEventListener("scroll", onScroll);
    scrollEl.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  let resizeTimer = 0;
  window.addEventListener(
    "resize",
    () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        rebuild();
        bindScroll();
      }, 120);
    },
    { passive: true }
  );

  reduceMotion.addEventListener("change", () => {
    rebuild();
    bindScroll();
  });

  mobileMq.addEventListener("change", () => {
    rebuild();
    bindScroll();
  });

  const ready = document.fonts?.ready ?? Promise.resolve();
  ready.then(() => {
    rebuild();
    bindScroll();
  });
})();
