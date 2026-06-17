/**
 * Builds assets/icons.svg from Untitled UI Icons (duotone when PRO is installed).
 * GitHub + LinkedIn use custom SVG Repo assets in /assets.
 * Run: npm run build:icons
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const __dirname = dirname(fileURLToPath(import.meta.url));
const assetsDir = join(__dirname, "../assets");

/** @type {[string, string][]} */
const UNTITLED_ICON_MAP = [
  ["icon-mail", "Mail01"],
  ["icon-chevron-down", "ChevronDown"],
  ["icon-close", "XClose"],
  ["icon-arrow-left", "ArrowLeft"],
  ["icon-arrow-down", "ArrowDown"],
  ["icon-external", "LinkExternal01"],
  ["icon-home", "Home01"],
  ["icon-about", "User01"],
  ["icon-work", "Briefcase01"],
  ["icon-play", "Star01"],
  ["icon-resume", "File06"],
];

/** @type {[string, string][]} */
const CUSTOM_ICON_FILES = [
  ["icon-github", "github-svgrepo-com.svg"],
  ["icon-linkedin", "linkedin-svgrepo-com.svg"],
  ["icon-menu", "menu-2dash.svg"],
  ["icon-dodollm-sparkle", "dodollm-sparkle.svg"],
];

const DUOTONE_FILL = 'fill="var(--icon-duotone-bg, currentColor)"';
const STROKE_ATTRS =
  'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';

async function loadIcons() {
  try {
    const pro = await import("@untitledui-pro/icons/duotone");
    return { Icons: pro, source: "pro-duotone" };
  } catch {
    const free = await import("@untitledui/icons");
    return { Icons: free, source: "free-line-as-duotone" };
  }
}

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

function lineSvgToDuotoneMarkup(inner) {
  const tags = inner.match(
    /<(?:path|circle|rect|ellipse|line|polyline|polygon)\b[^>]*\/?>/gi
  );
  if (!tags?.length) return formatChildren(inner);

  const layers = tags.flatMap((tag) => {
    const d = tag.match(/\bd="([^"]+)"/)?.[1];
    const isClosed = d && /z/i.test(d);

    if (d && isClosed) {
      return [
        `<path d="${d}" ${DUOTONE_FILL} stroke="none" />`,
        `<path d="${d}" ${STROKE_ATTRS} />`,
      ];
    }

    if (d) {
      return [`<path d="${d}" ${STROKE_ATTRS} />`];
    }

    return [tag.replace(/\/?>$/, ` ${STROKE_ATTRS} />`)];
  });

  return formatChildren(layers.join(""));
}

function proSvgToDuotoneMarkup(inner) {
  return formatChildren(
    inner
      .replace(/\sstroke-width="[^"]*"/g, "")
      .replace(/<(\w+)([^>]*)\/>/g, (_, name, attrs) => {
        if (attrs.includes('fill="currentColor"') && !attrs.includes("fill-opacity")) {
          return `<${name}${attrs.replace('fill="currentColor"', DUOTONE_FILL)} />`;
        }
        return `<${name}${attrs} />`;
      })
  );
}

function toSymbolMarkup(symbolId, svgMarkup, source) {
  const inner = extractInner(svgMarkup);
  const children =
    source === "pro-duotone"
      ? proSvgToDuotoneMarkup(inner)
      : lineSvgToDuotoneMarkup(inner);

  return `    <symbol id="${symbolId}" viewBox="0 0 24 24">\n${children}\n    </symbol>`;
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

function customFileToSymbol(symbolId, filename) {
  const { inner, viewBox } = parseCustomSvgFile(filename);
  const pathTags = [...inner.matchAll(/<path\b([^>]*?)\/?>/gi)];

  if (symbolId === "icon-github" || symbolId === "icon-menu") {
    const d = inner.match(/\bd="([^"]+)"/)?.[1];
    if (!d) throw new Error(`No path in ${filename}`);
    const path = `<path d="${d}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />`;
    return `    <symbol id="${symbolId}" viewBox="${viewBox}">\n${formatChildren(path)}\n    </symbol>`;
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

const { Icons, source } = await loadIcons();

const symbolById = new Map();

for (const [id, exportName] of UNTITLED_ICON_MAP) {
  const Icon = Icons[exportName];
  if (!Icon) {
    throw new Error(`Missing icon export: ${exportName} (${source})`);
  }
  const svg = renderToStaticMarkup(
    createElement(Icon, { size: 24, color: "currentColor", "aria-hidden": true })
  );
  symbolById.set(id, toSymbolMarkup(id, svg, source));
}

for (const [id, file] of CUSTOM_ICON_FILES) {
  symbolById.set(id, customFileToSymbol(id, file));
}

const SYMBOL_ORDER = [
  "icon-mail",
  "icon-github",
  "icon-linkedin",
  "icon-chevron-down",
  "icon-menu",
  "icon-close",
  "icon-arrow-left",
  "icon-arrow-down",
  "icon-external",
  "icon-home",
  "icon-about",
  "icon-work",
  "icon-play",
  "icon-resume",
  "icon-dodollm-sparkle",
];

const symbols = SYMBOL_ORDER.map((id) => symbolById.get(id));

const sprite = `<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
${symbols.join("\n")}
  </defs>
</svg>
`;

writeFileSync(join(assetsDir, "icons.svg"), sprite);
console.log(
  `Wrote assets/icons.svg (${UNTITLED_ICON_MAP.length} Untitled + ${CUSTOM_ICON_FILES.length} custom, ${source})`
);
