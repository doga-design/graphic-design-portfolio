(() => {
  const CONTAINER_ID = "topTextParticles";
  const WORD = "DOGA CIMEN";
  const WORD_MOBILE = "DOGA\nCIMEN";
  const MOBILE_BREAKPOINT = 768;

  // Feel knobs
  const SPRING = 0.01;
  const DAMPING = 0.78;
  const REPEL = 6;
  const SWIRL = 2.2;
  const MAX_SPEED = 20;

  // Size / density knobs
  const TEXT_WIDTH_PX = 980;
  const POINT_SIZE = 2.5;
  const SIZE_MIN = 1.5;
  const SIZE_MAX = 5.5;
  const SIZE_HEAT_UP = 0.05;
  const SIZE_HEAT_DECAY = 0.285;
  const SIZE_LERP = 0.12;

  const HEAT_UP = 0.18;
  const HEAT_DECAY = 1;
  const HOT_SPRING_MIN = 0.05;
  const HOT_DAMP_MAX = 0.89;

  const FEATHER_PX = 80;

  const ACCENT = [255, 230, 109];
  const RED = [197, 34, 51];

  // Desktop click magnet feel
  const MAGNET_PULL = 10.5;
  const MAGNET_SWIRL = 2.2;
  const MAGNET_DECAY = 0.86;

  // ── Flag-wave idle animation ──────────────────────────────────
  // Two sine layers for organic cloth motion. Displacement is in px.
  // Runs continuously but particles blend back to home when interacted.
  const WAVE_AMP_X = 7.5;       // horizontal sway amplitude
  const WAVE_AMP_Y = 4.2;       // vertical ripple amplitude
  const WAVE_FREQ_X = 0.005;    // spatial freq along x-axis
  const WAVE_FREQ_Y = 0.007;    // spatial freq along y-axis
  const WAVE_SPEED_1 = 0.026;   // primary wave speed (radians/frame)
  const WAVE_SPEED_2 = 0.019;   // secondary wave speed (slightly offset)
  const WAVE_PHASE_Y = 2.3;     // phase offset for y-layer variety

  window.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById(CONTAINER_ID);
    if (!container || typeof window.p5 === "undefined") return;

    new window.p5((p) => {
      let font = null;
      let particles = [];
      let pg;
      let lastW = 0;
      let lastH = 0;
      let radius = 140;
      let sampleStep = 3;

      // Cached wave time – avoids recalculating per-particle
      let waveT = 0;

      let touchActive = false;
      let touchX = 0;
      let touchY = 0;

      p.preload = () => {
        font = p.loadFont("/fonts/AwesomeSerif-Regular.otf");
      };

      function getSize() {
        const rect = container.getBoundingClientRect();
        return {
          w: Math.max(1, Math.floor(rect.width)),
          h: Math.max(1, Math.floor(rect.height)),
        };
      }

      function rebuildIfNeeded() {
        const { w, h } = getSize();
        if (w === lastW && h === lastH) return;
        if (w <= 1 || h <= 1) return;

        lastW = w;
        lastH = h;
        sampleStep = w > 1100 ? 4 : 3;
        radius = Math.max(90, Math.min(170, h * 0.9));

        p.resizeCanvas(w, h);
        pg = p.createGraphics(w, h);
        pg.pixelDensity(1);
        buildParticles();
      }

      function buildParticles() {
        particles = [];

        pg.clear();
        pg.noStroke();
        pg.fill(255);
        if (font) pg.textFont(font);
        else pg.textFont("AwesomeSerif");

        const isMobile = p.width < MOBILE_BREAKPOINT;
        const textStr = isMobile ? WORD_MOBILE : WORD;

        let fontSize = Math.min(p.width * 0.22, p.height * 0.75);
        let targetWidth = Math.min(TEXT_WIDTH_PX, p.width * 0.92);
        if (isMobile) targetWidth = p.width * 0.9;

        pg.textSize(fontSize);
        const measured = isMobile
          ? Math.max(pg.textWidth("DOGA"), pg.textWidth("CIMEN")) || 1
          : pg.textWidth(textStr) || 1;
        fontSize *= targetWidth / measured;
        fontSize = Math.min(fontSize, p.height * 0.9);

        pg.textSize(fontSize);
        if (isMobile) pg.textLeading(fontSize * 0.82);
        pg.textAlign(p.CENTER, p.CENTER);
        const textY = isMobile ? p.height * 0.5 : p.height * 0.45;
        pg.text(textStr, p.width * 0.5, textY);

        pg.loadPixels();
        const w = p.width;
        for (let y = 0; y < p.height; y += sampleStep) {
          for (let x = 0; x < w; x += sampleStep) {
            if (pg.pixels[4 * (x + y * w) + 3] > 10) {
              particles.push(new Particle(x, y));
            }
          }
        }
      }

      // ── Precompute sin/cos for wave (called once per frame) ───
      // We store two time-varying values so particles just do
      // simple multiply-add instead of calling Math.sin each.
      let _wS1 = 0;
      let _wS2 = 0;

      function tickWave() {
        waveT++;
        _wS1 = waveT * WAVE_SPEED_1;
        _wS2 = waveT * WAVE_SPEED_2;
      }

      class Particle {
        constructor(x, y) {
          this.home = p.createVector(x, y);
          this.pos = p.createVector(x, y);
          this.vel = p.createVector(0, 0);
          this.heat = 0;
          this.magnet = 0;
          this.size = POINT_SIZE;
          this.targetSize = POINT_SIZE;
          this.sizeHeat = 0;
          this.randomSize = p.random(SIZE_MIN, SIZE_MAX);
          // Cache per-particle spatial phase (avoids recomputing)
          this._px = x * WAVE_FREQ_X;
          this._py = y * WAVE_FREQ_Y;
        }

        update() {
          const mx = touchActive ? touchX : p.mouseX;
          const my = touchActive ? touchY : p.mouseY;
          const pressed = touchActive || p.mouseIsPressed;
          const mouseInside =
            mx >= 0 && mx <= p.width && my >= 0 && my <= p.height;

          let hoverT = 0;
          let mfx = 0;
          let mfy = 0;

          const isMobile = p.width < MOBILE_BREAKPOINT;
          const magnetSwirlAmt = isMobile ? MAGNET_SWIRL * 1.8 : MAGNET_SWIRL;
          const hoverSwirlAmt = isMobile ? SWIRL * 1.8 : SWIRL;

          const magnetActive = mouseInside && pressed;

          if (magnetActive) {
            const dx = mx - this.pos.x;
            const dy = my - this.pos.y;
            const d = Math.sqrt(dx * dx + dy * dy);
            const magnetRadius = Math.max(p.width, p.height) * 1.25;

            let t = 1 - Math.min(Math.max(d / magnetRadius, 0), 1);
            t = t * t * (3 - 2 * t);

            let nx = 0, ny = 0;
            if (d > 0.01) { nx = dx / d; ny = dy / d; }

            const wobble =
              1 + 0.18 * Math.sin(
                p.frameCount * 0.06 + this.home.x * 0.02 + this.home.y * 0.02
              );

            const pull = MAGNET_PULL * t * wobble;
            mfx += nx * pull + (-ny) * magnetSwirlAmt * t * wobble;
            mfy += ny * pull + nx * magnetSwirlAmt * t * wobble;
            this.magnet += (t - this.magnet) * 0.28;
          } else {
            this.magnet *= MAGNET_DECAY;
            if (this.magnet < 0.001) this.magnet = 0;
          }

          if (!magnetActive && mouseInside) {
            const dx = this.pos.x - mx;
            const dy = this.pos.y - my;
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d < radius) {
              let t = 1 - d / radius;
              t = t * t * (3 - 2 * t);
              hoverT = t;

              this.heat = Math.min(1, this.heat + HEAT_UP * t);

              let nx = 0, ny = 0;
              if (d > 0.01) { nx = dx / d; ny = dy / d; }
              const amp = t * (1 + 2.4 * this.heat);

              const wobble =
                1 + 0.25 * Math.sin(
                  p.frameCount * 0.06 + this.home.x * 0.03 + this.home.y * 0.03
                );
              const repelAmt = REPEL * amp;
              const swirlAmt = hoverSwirlAmt * amp * wobble;

              mfx += nx * repelAmt + (-ny) * swirlAmt;
              mfy += ny * repelAmt + nx * swirlAmt;
            } else {
              this.heat *= HEAT_DECAY;
            }
          } else {
            this.heat *= HEAT_DECAY;
          }

          // ── Flag-wave: offset home target ─────────────────────
          // Blend wave strength inversely with interaction intensity.
          // When hovered/magnet-pulled, wave fades out smoothly.
          const interactionT = Math.min(1, hoverT + this.magnet + this.heat);
          const waveFade = 1 - interactionT;

          let homeX = this.home.x;
          let homeY = this.home.y;

          if (waveFade > 0.01) {
            // Two overlapping sine waves for organic, flag-like undulation
            const phase1 = this._px + this._py * 0.5 + _wS1;
            const phase2 = this._py + this._px * 0.4 + _wS2 + WAVE_PHASE_Y;
            const waveX = Math.sin(phase1) * WAVE_AMP_X + Math.sin(phase2 * 1.3) * WAVE_AMP_X * 0.4;
            const waveY = Math.sin(phase2) * WAVE_AMP_Y + Math.cos(phase1 * 0.7) * WAVE_AMP_Y * 0.3;
            homeX += waveX * waveFade;
            homeY += waveY * waveFade;
          }

          // Spring to (possibly wave-offset) home
          const springK =
            SPRING * (HOT_SPRING_MIN + (1 - HOT_SPRING_MIN) * (1 - this.heat));
          const thx = (homeX - this.pos.x) * springK;
          const thy = (homeY - this.pos.y) * springK;

          this.vel.x += thx + mfx;
          this.vel.y += thy + mfy;

          let damp = DAMPING + (HOT_DAMP_MAX - DAMPING) * this.heat;
          let maxSpd = MAX_SPEED;
          if (magnetActive) { damp = 0.88; maxSpd = 48; }
          this.vel.x *= damp;
          this.vel.y *= damp;

          // Inline speed limit (avoids p5.Vector overhead)
          const spd = this.vel.x * this.vel.x + this.vel.y * this.vel.y;
          if (spd > maxSpd * maxSpd) {
            const s = maxSpd / Math.sqrt(spd);
            this.vel.x *= s;
            this.vel.y *= s;
          }
          this.pos.x += this.vel.x;
          this.pos.y += this.vel.y;

          // Size heat
          if (hoverT > 0) {
            if (this.sizeHeat === 0) this.randomSize = p.random(SIZE_MIN, SIZE_MAX);
            this.sizeHeat = Math.min(1, this.sizeHeat + SIZE_HEAT_UP * hoverT);
          } else {
            this.sizeHeat *= SIZE_HEAT_DECAY;
            if (this.sizeHeat < 0.001) this.sizeHeat = 0;
          }

          this.targetSize = POINT_SIZE + (this.randomSize - POINT_SIZE) * this.sizeHeat;
          this.size += (this.targetSize - this.size) * SIZE_LERP;
        }

        draw() {
          const px = this.pos.x;
          const py = this.pos.y;
          const distToEdge = Math.min(px, py, p.width - px, p.height - py);
          const alpha = distToEdge >= FEATHER_PX
            ? 255
            : Math.max(0, (distToEdge / FEATHER_PX) * 255);

          const t = Math.max(this.heat, this.sizeHeat);
          let r = 255 + (ACCENT[0] - 255) * t;
          let g = 255 + (ACCENT[1] - 255) * t;
          let b = 255 + (ACCENT[2] - 255) * t;

          if (this.magnet > 0) {
            r += (RED[0] - r) * this.magnet;
            g += (RED[1] - g) * this.magnet;
            b += (RED[2] - b) * this.magnet;
          }
          p.noStroke();
          p.fill(r, g, b, alpha);
          p.circle(px, py, this.size);
        }
      }

      p.setup = () => {
        const { w, h } = getSize();

        const cnv = p.createCanvas(w, h);
        cnv.parent(container);
        cnv.style.position = "relative";
        cnv.style.top = "";
        cnv.style.left = "";

        p.pixelDensity(1);
        pg = p.createGraphics(w, h);
        pg.pixelDensity(1);

        lastW = w;
        lastH = h;
        sampleStep = w > 1100 ? 4 : 3;
        radius = Math.max(90, Math.min(170, h * 0.9));

        buildParticles();

        const el = p.canvas;
        if (el) {
          el.addEventListener("contextmenu", (e) => e.preventDefault(), { passive: false });
          function touchToCanvas(e) {
            if (!e.touches.length) return;
            const rect = el.getBoundingClientRect();
            touchX = ((e.touches[0].clientX - rect.left) / rect.width) * p.width;
            touchY = ((e.touches[0].clientY - rect.top) / rect.height) * p.height;
          }
          el.addEventListener("touchstart", (e) => {
            touchActive = true;
            touchToCanvas(e);
            e.preventDefault();
          }, { passive: false });
          el.addEventListener("touchmove", (e) => {
            touchToCanvas(e);
            e.preventDefault();
          }, { passive: false });
          el.addEventListener("touchend", () => { touchActive = false; });
          el.addEventListener("touchcancel", () => { touchActive = false; });
        }
      };

      p.draw = () => {
        p.clear();

        // Advance wave clock once per frame (lightweight)
        tickWave();

        if (p.frameCount % 10 === 0) rebuildIfNeeded();

        for (const particle of particles) {
          particle.update();
          particle.draw();
        }
      };

      p.windowResized = () => {
        rebuildIfNeeded();
      };
    }, container);
  });
})();