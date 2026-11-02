/*
 * Animated dither behind the about section.
 *
 * Rules that keep it from ever showing a gap, a blank frame or a jump:
 * - Resizing a canvas clears it, so every resize draws in the same callback.
 * - The buffer holds one pixel per dither cell and is scaled by a whole number
 *   of device pixels, so the browser never resamples the pattern.
 * - The grid is anchored to the bottom-left of the host and always overshoots
 *   it, so the canvas cannot fall short of any edge.
 * - Time wraps at the wave's period, so precision never degrades.
 * - If WebGL2 is missing, fails or loses its context, a 2D renderer draws the
 *   same pattern until the GPU comes back.
 */
(function initAboutDithering() {
  "use strict";

  const about = document.getElementById("about");
  if (!about) return;

  // Dither cell width in CSS px at 1x. Screens at 1.5x and up use 2 CSS px.
  const CELL_CSS_PX = 3;
  const MAX_CELL_DPR = 1.5;
  // Wave phase advanced per second.
  const WAVE_SPEED = 0.1;
  // Every wave term repeats after this much phase (see waveAt).
  const WAVE_PERIOD = Math.PI * 2;
  // Scroll distance before the section is on screen at which the loop starts.
  const LOAD_MARGIN = "160px";
  const SCROLLER_MQ = "(min-width: 1288px)";

  const BAYER_8X8 = [
    0, 32, 8, 40, 2, 34, 10, 42,
    48, 16, 56, 24, 50, 18, 58, 26,
    12, 44, 4, 36, 14, 46, 6, 38,
    60, 28, 52, 20, 62, 30, 54, 22,
    3, 35, 11, 43, 1, 33, 9, 41,
    51, 19, 59, 27, 49, 17, 57, 25,
    15, 47, 7, 39, 13, 45, 5, 37,
    63, 31, 55, 23, 61, 29, 53, 21,
  ];

  const VERTEX_SHADER = `#version 300 es
void main() {
  vec2 corner = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  gl_Position = vec4(corner * 2.0 - 1.0, 0.0, 1.0);
}
`;

  // Keep the wave in sync with waveAt and pixelIsFront below.
  const FRAGMENT_SHADER = `#version 300 es
precision highp float;
precision highp int;

uniform float u_phase;
uniform vec2 u_cells;
uniform vec3 u_back;
uniform vec3 u_front;

out vec4 fragColor;

const int BAYER[64] = int[64](${BAYER_8X8.join(", ")});

void main() {
  ivec2 cell = ivec2(gl_FragCoord.xy);
  vec2 p = 4.0 * (vec2(cell) - 0.5 * u_cells) / u_cells;

  float wave = cos(0.5 * p.x - 2.0 * u_phase)
    * sin(1.5 * p.x + u_phase)
    * (0.75 + 0.25 * cos(3.0 * u_phase));
  float density = 1.0 - smoothstep(-1.0, 1.0, p.y + wave);
  float threshold = float(BAYER[(cell.y & 7) * 8 + (cell.x & 7)]) / 64.0;

  fragColor = vec4(density + threshold >= 1.0 ? u_front : u_back, 1.0);
}
`;

  function waveAt(x, phase) {
    return (
      Math.cos(0.5 * x - 2 * phase) *
      Math.sin(1.5 * x + phase) *
      (0.75 + 0.25 * Math.cos(3 * phase))
    );
  }

  function pixelIsFront(column, row, y, wave) {
    const t = Math.min(1, Math.max(0, (y + wave + 1) / 2));
    const density = 1 - t * t * (3 - 2 * t);
    return density + BAYER_8X8[(row & 7) * 8 + (column & 7)] / 64 >= 1;
  }

  function readColor(name, fallback) {
    const value = getComputedStyle(document.documentElement)
      .getPropertyValue(name)
      .trim();
    const hex = /^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(value) ||
      /^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fallback);
    return hex.slice(1).map((part) => parseInt(part, 16));
  }

  const colors = {
    back: readColor("--paper", "#f0ede6"),
    front: readColor("--accent", "#b03a39"),
  };

  /* The whole texture decision lives here. */
  function computeGrid(hostWidth, hostHeight, dpr) {
    const cssCell = CELL_CSS_PX / Math.min(dpr, MAX_CELL_DPR);
    const deviceCell = Math.max(1, Math.round(cssCell * dpr));
    const exactColumns = (hostWidth * dpr) / deviceCell;
    const exactRows = (hostHeight * dpr) / deviceCell;
    const columns = Math.ceil(exactColumns);
    const rows = Math.ceil(exactRows);
    return {
      exactColumns,
      exactRows,
      columns,
      rows,
      cssWidth: (columns * deviceCell) / dpr,
      cssHeight: (rows * deviceCell) / dpr,
    };
  }

  function compile(gl, type, source) {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
    if (!gl.isContextLost()) {
      console.error(`About dither compile error: ${gl.getShaderInfoLog(shader)}`);
    }
    gl.deleteShader(shader);
    return null;
  }

  // Everything GPU-side. Returns false when it cannot be built; called again
  // after a context restore because the context drops all of it.
  function buildGlState(gl) {
    const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    const program = vertex && fragment ? gl.createProgram() : null;
    if (program) {
      gl.attachShader(program, vertex);
      gl.attachShader(program, fragment);
      gl.linkProgram(program);
    }
    if (vertex) gl.deleteShader(vertex);
    if (fragment) gl.deleteShader(fragment);
    if (!program) return null;

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      if (!gl.isContextLost()) {
        console.error(`About dither link error: ${gl.getProgramInfoLog(program)}`);
      }
      gl.deleteProgram(program);
      return null;
    }

    gl.useProgram(program);
    gl.uniform3fv(
      gl.getUniformLocation(program, "u_back"),
      colors.back.map((channel) => channel / 255)
    );
    gl.uniform3fv(
      gl.getUniformLocation(program, "u_front"),
      colors.front.map((channel) => channel / 255)
    );
    return {
      phase: gl.getUniformLocation(program, "u_phase"),
      cells: gl.getUniformLocation(program, "u_cells"),
    };
  }

  function createGlRenderer(canvas) {
    const gl = canvas.getContext("webgl2", {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: "low-power",
    });
    if (!gl) return null;

    let uniforms = buildGlState(gl);

    return {
      canvas,
      get ready() {
        return Boolean(uniforms) && !gl.isContextLost();
      },
      rebuild() {
        uniforms = buildGlState(gl);
      },
      draw(grid, phase) {
        gl.viewport(0, 0, grid.columns, grid.rows);
        gl.uniform1f(uniforms.phase, phase);
        gl.uniform2f(uniforms.cells, grid.exactColumns, grid.exactRows);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      },
    };
  }

  function create2dRenderer() {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { alpha: false });
    let image = null;

    return {
      canvas,
      ready: Boolean(ctx),
      draw(grid, phase) {
        const { columns, rows, exactColumns, exactRows } = grid;
        if (!image || image.width !== columns || image.height !== rows) {
          image = ctx.createImageData(columns, rows);
        }
        const { data } = image;
        const { back, front } = colors;
        for (let column = 0; column < columns; column++) {
          const x = (4 * (column - 0.5 * exactColumns)) / exactColumns;
          const wave = waveAt(x, phase);
          for (let row = 0; row < rows; row++) {
            const y = (4 * (row - 0.5 * exactRows)) / exactRows;
            const color = pixelIsFront(column, row, y, wave) ? front : back;
            // ImageData runs top-down; rows count up from the bottom edge.
            const i = (rows - 1 - row) * columns * 4 + column * 4;
            data[i] = color[0];
            data[i + 1] = color[1];
            data[i + 2] = color[2];
            data[i + 3] = 255;
          }
        }
        ctx.putImageData(image, 0, 0);
      },
    };
  }

  const host = document.createElement("div");
  host.className = "about-dithering";
  host.setAttribute("aria-hidden", "true");

  const glCanvas = document.createElement("canvas");
  glCanvas.id = "about-dithering-canvas";
  host.appendChild(glCanvas);
  about.prepend(host);

  const glRenderer = createGlRenderer(glCanvas);
  let fallback = null;
  let renderer = null;
  let grid = null;
  let gridDpr = 0;
  let raf = 0;
  let onScreen = true;
  let pageActive = true;
  const startedAt = performance.now();

  function useRenderer(next) {
    renderer = next;
    if (next === glRenderer) {
      glCanvas.style.display = "";
      if (fallback) fallback.canvas.remove();
      return;
    }
    glCanvas.style.display = "none";
    host.appendChild(next.canvas);
  }

  function useFallback() {
    if (!fallback) fallback = create2dRenderer();
    useRenderer(fallback);
  }

  function pickRenderer() {
    if (glRenderer && glRenderer.ready) useRenderer(glRenderer);
    else useFallback();
  }

  function applyGrid() {
    const rect = host.getBoundingClientRect();
    // Hidden or collapsed: keep the last good grid and frame.
    if (rect.width <= 0 || rect.height <= 0) return grid !== null;

    gridDpr = window.devicePixelRatio || 1;
    grid = computeGrid(rect.width, rect.height, gridDpr);
    const { canvas } = renderer;
    if (canvas.width !== grid.columns) canvas.width = grid.columns;
    if (canvas.height !== grid.rows) canvas.height = grid.rows;
    canvas.style.width = `${grid.cssWidth}px`;
    canvas.style.height = `${grid.cssHeight}px`;
    return true;
  }

  function drawFrame() {
    if (!renderer.ready) return;
    const elapsed = (performance.now() - startedAt) / 1000;
    renderer.draw(grid, (elapsed * WAVE_SPEED) % WAVE_PERIOD);
  }

  // The only path that can clear the canvas, so a clear is never left on screen.
  function refresh() {
    if (applyGrid()) drawFrame();
  }

  function frame() {
    raf = requestAnimationFrame(frame);
    // Moving between screens changes DPR without resizing the host, and no
    // event reports that reliably. Off screen it is caught when the loop resumes.
    if ((window.devicePixelRatio || 1) !== gridDpr) refresh();
    else drawFrame();
  }

  function syncLoop() {
    const shouldRun =
      onScreen && pageActive && document.visibilityState === "visible";
    if (shouldRun && !raf) {
      // Draw now so a stale frame is not shown until the next animation frame.
      refresh();
      raf = requestAnimationFrame(frame);
    } else if (!shouldRun && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  }

  glCanvas.addEventListener("webglcontextlost", (event) => {
    // Without preventDefault the browser never restores the context.
    event.preventDefault();
    useFallback();
    refresh();
  });

  glCanvas.addEventListener("webglcontextrestored", () => {
    glRenderer.rebuild();
    pickRenderer();
    refresh();
  });

  new ResizeObserver(refresh).observe(host);

  // Wide layouts scroll inside #page, and rootMargin only applies to the
  // observer's root, so the root has to be whichever element really scrolls.
  let intersection = null;
  function observeScroller() {
    if (intersection) intersection.disconnect();
    const page = document.getElementById("page");
    const pageScrolls =
      page && getComputedStyle(page).overflowY !== "visible";
    intersection = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting;
        syncLoop();
      },
      { root: pageScrolls ? page : null, rootMargin: LOAD_MARGIN }
    );
    intersection.observe(about);
  }
  window.matchMedia(SCROLLER_MQ).addEventListener("change", observeScroller);
  observeScroller();

  document.addEventListener("visibilitychange", syncLoop);
  window.addEventListener("pagehide", () => {
    pageActive = false;
    syncLoop();
  });
  window.addEventListener("pageshow", () => {
    pageActive = true;
    syncLoop();
    // Restored pages can return with a discarded buffer even if nothing resized.
    refresh();
  });

  pickRenderer();
  refresh();
  syncLoop();
})();
