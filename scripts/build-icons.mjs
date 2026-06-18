/**
 * Builds assets/icons.svg from Solar Icons (BoldDuotone).
 * Dock GitHub uses Solar Command; dock LinkedIn uses custom duotone SVG.
 * dodoGPT sparkle uses custom asset in /assets.
 * Run: npm run build:icons
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  Letter,
  Home,
  UserCircle,
  CaseRound,
  Star,
  Lock,
  DocumentText,
  ChatRoundDots,
  Command,
} from "@solar-icons/react/ssr";

const __dirname = dirname(fileURLToPath(import.meta.url));
const assetsDir = join(__dirname, "../assets");

/** @type {[string, import("react").ComponentType][]} */
const SOLAR_ICON_MAP = [
  ["icon-mail", Letter],
  ["icon-home", Home],
  ["icon-about", UserCircle],
  ["icon-work", CaseRound],
  ["icon-play", Star],
  ["icon-lock", Lock],
  ["icon-resume", DocumentText],
  ["icon-quote", ChatRoundDots],
  ["icon-code-circle", Command],
];

/** Stroke arrows/chevrons — kept as legacy line icons for case studies + UI rolls */
const LEGACY_STROKE_SYMBOLS = new Map([
  [
    "icon-menu",
    `    <symbol id="icon-menu" viewBox="0 0 24 24">
      <path d="M4 9h16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
      <path d="M4 15h16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
    </symbol>`,
  ],
  [
    "icon-close",
    `    <symbol id="icon-close" viewBox="0 0 24 24">
      <path d="M7 7l10 10" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
      <path d="M17 7L7 17" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
    </symbol>`,
  ],
  [
    "icon-chevron-down",
    `    <symbol id="icon-chevron-down" viewBox="0 0 24 24">
      <path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    </symbol>`,
  ],
  [
    "icon-chevron-left",
    `    <symbol id="icon-chevron-left" viewBox="0 0 24 24">
      <path d="m15 6-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    </symbol>`,
  ],
  [
    "icon-chevron-right",
    `    <symbol id="icon-chevron-right" viewBox="0 0 24 24">
      <path d="m9 6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    </symbol>`,
  ],
  [
    "icon-arrow-left",
    `    <symbol id="icon-arrow-left" viewBox="0 0 24 24">
      <path d="M19 12H5m0 0 7 7m-7-7 7-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    </symbol>`,
  ],
  [
    "icon-arrow-down",
    `    <symbol id="icon-arrow-down" viewBox="0 0 24 24">
      <path d="M12 5v14M19 12l-7 7-7-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    </symbol>`,
  ],
  [
    "icon-external",
    `    <symbol id="icon-external" viewBox="0 0 24 24">
      <path d="M21 9V3m0 0h-6m6 0-8 8m-3-6H7.8c-1.68 0-2.52 0-3.162.327a3 3 0 0 0-1.311 1.311C3 7.28 3 8.12 3 9.8v6.4c0 1.68 0 2.52.327 3.162a3 3 0 0 0 1.311 1.311C5.28 21 6.12 21 7.8 21h6.4c1.68 0 2.52 0 3.162-.327a3 3 0 0 0 1.311-1.311C19 18.72 19 17.88 19 16.2V14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    </symbol>`,
  ],
  [
    "icon-arrow-up-right",
    `    <symbol id="icon-arrow-up-right" viewBox="0 0 24 24">
      <path d="M7 17 17 7M17 7H9M17 7v8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    </symbol>`,
  ],
]);

/** @type {[string, string][]} */
const CUSTOM_ICON_FILES = [
  ["icon-github", "github-svgrepo-com.svg"],
  ["icon-linkedin", "linkedin-svgrepo-com.svg"],
  ["icon-link-circle", "linkedin-duotone-custom.svg"],
  ["icon-dodollm-sparkle", "dodollm-sparkle.svg"],
];

const DUOTONE_FILL = 'fill="var(--icon-duotone-bg, currentColor)"';

function extractInner(svgMarkup) {
  return svgMarkup
    .replace(/^<svg[^>]*>/, "")
    .replace(/<\/svg>\s*$/, "")
    .trim();
}

function formatChildren(html) {
  return html
    .replace(/><(\w)/g, ">\n      <$1")
    .split("\n")
    .map((line) => (line.trim() ? `      ${line.trim()}` : ""))
    .filter(Boolean)
    .join("\n");
}

function solarDuotoneToSymbolMarkup(inner) {
  const withoutClosing = inner.replace(/<\/path>/gi, "");
  const tags = withoutClosing.match(/<(?:path|circle|rect|ellipse)\b[^>]*>/gi);
  if (!tags?.length) return formatChildren(inner);

  const layers = tags.map((tag) => {
    const opacity = tag.match(/\bopacity="([^"]+)"/)?.[1];
    const fillOpacity = tag.match(/\bfill-opacity="([^"]+)"/)?.[1];
    const isMuted =
      (opacity && Number(opacity) < 1) ||
      (fillOpacity && Number(fillOpacity) < 1);
    const hasStroke = /\bstroke="/.test(tag) && !/\bstroke="none"/.test(tag);

    let attrs = tag
      .replace(/^<\w+/, "")
      .replace(/\s*\/?>$/, "")
      .replace(/\sopacity="[^"]*"/g, "")
      .replace(/\sfill-opacity="[^"]*"/g, "");

    if (hasStroke) {
      attrs = attrs
        .replace(/\sfill="[^"]*"/g, "")
        .replace(/\sstroke="[^"]*"/g, "")
        .replace(/\sstroke-width="[^"]*"/g, "")
        .replace(/\sstroke-linecap="[^"]*"/g, "");
      return `<path${attrs} fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />`;
    }

    attrs = attrs.replace(/\sstroke-width="[^"]*"/g, "");
    const fill = isMuted ? DUOTONE_FILL : 'fill="currentColor"';
    attrs = attrs.replace(/\sfill="[^"]*"/g, "");
    return `<path${attrs} ${fill} />`;
  });

  return formatChildren(layers.join(""));
}

function solarToSymbol(symbolId, Icon) {
  const svg = renderToStaticMarkup(
    createElement(Icon, {
      size: 24,
      weight: "BoldDuotone",
      color: "currentColor",
      "aria-hidden": true,
    })
  );
  const inner = extractInner(svg);
  return `    <symbol id="${symbolId}" viewBox="0 0 24 24">\n${solarDuotoneToSymbolMarkup(inner)}\n    </symbol>`;
}

function parseCustomSvgFile(filename) {
  let raw = readFileSync(join(assetsDir, filename), "utf8");
  raw = raw.replace(/<\?xml[^?]*\?>/gi, "").replace(/<!--[\s\S]*?-->/g, "");
  const match = raw.match(/<svg([^>]*)>([\s\S]*)<\/svg>/i);
  if (!match) {
    throw new Error(`No <svg> root in ${filename}`);
  }
  const viewBox = match[1].match(/\bviewBox="([^"]+)"/)?.[1] ?? "0 0 24 24";
  return { inner: match[2].trim(), viewBox };
}

function duotoneCustomPath(attrs) {
  const d = attrs.match(/\bd="([^"]+)"/)?.[1];
  if (!d) return "";
  const fill = attrs.match(/\bfill="([^"]+)"/i)?.[1]?.toLowerCase();
  const fillAttr =
    fill === "#c1d3db" ? DUOTONE_FILL : 'fill="currentColor"';
  return `<path d="${d}" ${fillAttr} />`;
}

function customFileToSymbol(symbolId, filename) {
  const { inner, viewBox } = parseCustomSvgFile(filename);
  const pathTags = [...inner.matchAll(/<path\b([^>]*?)\/?>/gi)];

  if (symbolId === "icon-github") {
    const d = inner.match(/\bd="([^"]+)"/)?.[1];
    if (!d) throw new Error(`No path in ${filename}`);
    const path = `<path d="${d}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />`;
    return `    <symbol id="${symbolId}" viewBox="${viewBox}">\n${formatChildren(path)}\n    </symbol>`;
  }

  if (symbolId === "icon-link-circle") {
    const paths = pathTags
      .map(([, attrs]) => duotoneCustomPath(attrs))
      .filter(Boolean);
    return `    <symbol id="${symbolId}" viewBox="${viewBox}">\n${formatChildren(paths.join(""))}\n    </symbol>`;
  }

  const paths = pathTags.map(([, attrs]) => {
    const d = attrs.match(/\bd="([^"]+)"/)?.[1];
    const fillRule = attrs.match(/\bfill-rule="([^"]+)"/)?.[0] ?? "";
    const clipRule = attrs.match(/\bclip-rule="([^"]+)"/)?.[0] ?? "";
    return `<path ${fillRule} ${clipRule} d="${d}" fill="currentColor" />`
      .replace(/\s+/g, " ")
      .trim();
  });

  return `    <symbol id="${symbolId}" viewBox="${viewBox}">\n${formatChildren(paths.join(""))}\n    </symbol>`;
}

const symbolById = new Map();

for (const [id, Icon] of SOLAR_ICON_MAP) {
  symbolById.set(id, solarToSymbol(id, Icon));
}

for (const [id, symbol] of LEGACY_STROKE_SYMBOLS) {
  symbolById.set(id, symbol);
}

for (const [id, file] of CUSTOM_ICON_FILES) {
  symbolById.set(id, customFileToSymbol(id, file));
}

const SYMBOL_ORDER = [
  "icon-mail",
  "icon-github",
  "icon-linkedin",
  "icon-code-circle",
  "icon-link-circle",
  "icon-chevron-down",
  "icon-chevron-left",
  "icon-chevron-right",
  "icon-menu",
  "icon-close",
  "icon-arrow-left",
  "icon-arrow-down",
  "icon-external",
  "icon-arrow-up-right",
  "icon-home",
  "icon-about",
  "icon-work",
  "icon-play",
  "icon-lock",
  "icon-resume",
  "icon-quote",
  "icon-dodollm-sparkle",
];

const symbols = SYMBOL_ORDER.map((id) => {
  const symbol = symbolById.get(id);
  if (!symbol) throw new Error(`Missing symbol: ${id}`);
  return symbol;
});

const sprite = `<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
${symbols.join("\n")}
  </defs>
</svg>
`;

writeFileSync(join(assetsDir, "icons.svg"), sprite);
console.log(
  `Wrote assets/icons.svg (${SOLAR_ICON_MAP.length} Solar BoldDuotone + ${LEGACY_STROKE_SYMBOLS.size} legacy stroke + ${CUSTOM_ICON_FILES.length} custom)`
);
