(() => {
  const CONTAINER_ID = "topTextParticles";
  const WORD = "DOGA CIMEN";
  const WORD_MOBILE = "DOGA\nCIMEN"; // line break on small screens
  const MOBILE_BREAKPOINT = 768;

  // Feel knobs (close to your reference sketch)
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

  /** Edge feather: distance (px) from edge over which particles fade to transparent */
  const FEATHER_PX = 80;

  /** Accent color when particle is activated (heat/sizeHeat) – matches CSS --accent #EEFF00 */
  const ACCENT = [238, 255, 0];
  /** Red while magnet-pulled (matches CSS --red #ff5959) */
  const RED = [255, 0, 0];

  // Desktop click magnet feel
  const MAGNET_PULL = 10.5; // stronger = snappier pull
  const MAGNET_SWIRL = 2.2; // tangential swirl while pulling
  const MAGNET_DECAY = 0.86; // how quickly "red/pull" fades after release

  window.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById(CONTAINER_ID);
    if (!container || typeof window.p5 === "undefined") return;

    // p5 instance mode to avoid polluting globals
    // eslint-disable-next-line no-new
    new window.p5((p) => {
      /** @type {p5.Font | null} */
      let font = null;
      /** @type {{pos: any, vel: any, home: any, heat: number, size: number, targetSize: number, sizeHeat: number, randomSize: number}[]} */
      let particles = [];
      /** @type {p5.Graphics} */
      let pg;
      let lastW = 0;
      let lastH = 0;
      let radius = 140;
      let sampleStep = 3;

      /** Touch state for magnet on mobile */
      let touchActive = false;
      let touchX = 0;
      let touchY = 0;

      p.preload = () => {
        // Load the same "AwesomeSerif" font used in CSS for reliable canvas rendering.
        font = p.loadFont("./fonts/AwesomeSerif-Regular.otf");
      };

      function getSize() {
        const rect = container.getBoundingClientRect();
        const w = Math.max(1, Math.floor(rect.width));
        const h = Math.max(1, Math.floor(rect.height));
        return { w, h };
      }

      function rebuildIfNeeded() {
        const { w, h } = getSize();
        if (w === lastW && h === lastH) return;
        if (w <= 1 || h <= 1) return; // hidden (e.g. when #home is d-none)

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

        pg.clear(); // transparent buffer
        pg.noStroke();
        pg.fill(255);
        if (font) pg.textFont(font);
        else pg.textFont("AwesomeSerif");

        // On mobile: two lines "DOGA" / "CIMEN", else one line; both centered.
        const isMobile = p.width < MOBILE_BREAKPOINT;
        const textStr = isMobile ? WORD_MOBILE : WORD;

        let fontSize = Math.min(p.width * 0.22, p.height * 0.75);
        let targetWidth = Math.min(TEXT_WIDTH_PX, p.width * 0.92);
        if (isMobile) targetWidth *= 0.62; // smaller text on mobile

        pg.textSize(fontSize);
        const measured = isMobile
          ? Math.max(pg.textWidth("DOGA"), pg.textWidth("CIMEN")) || 1
          : pg.textWidth(textStr) || 1;
        fontSize *= targetWidth / measured;
        fontSize = Math.min(fontSize, p.height * 0.9);

        pg.textSize(fontSize);
        if (isMobile) pg.textLeading(fontSize * 0.82); // tight line height
        pg.textAlign(p.CENTER, p.CENTER);
        const textY = p.height * 0.45;
        pg.text(textStr, p.width * 0.5, textY);

        pg.loadPixels();
        for (let y = 0; y < p.height; y += sampleStep) {
          for (let x = 0; x < p.width; x += sampleStep) {
            const idx = 4 * (x + y * p.width);
            const a = pg.pixels[idx + 3];
            if (a > 10) particles.push(new Particle(x, y));
          }
        }
      }

      class Particle {
        constructor(x, y) {
          this.home = p.createVector(x, y);
          this.pos = p.createVector(x, y);
          this.vel = p.createVector(0, 0);
          this.heat = 0;
          this.magnet = 0; // 0..1: how strongly this particle is being pulled
          this.size = POINT_SIZE;
          this.targetSize = POINT_SIZE;
          this.sizeHeat = 0;
          this.randomSize = p.random(SIZE_MIN, SIZE_MAX);
        }

        update() {
          // Use touch position on mobile, mouse on desktop.
          const mx = touchActive ? touchX : p.mouseX;
          const my = touchActive ? touchY : p.mouseY;
          const pressed = touchActive || p.mouseIsPressed;
          const mouseInside =
            mx >= 0 && mx <= p.width && my >= 0 && my <= p.height;

          let hoverT = 0;
          let mouseForce = p.createVector(0, 0);

          // Stronger swirl on mobile
          const isMobile = p.width < MOBILE_BREAKPOINT;
          const magnetSwirlAmt = isMobile ? MAGNET_SWIRL * 1.8 : MAGNET_SWIRL;
          const hoverSwirlAmt = isMobile ? SWIRL * 1.8 : SWIRL;

          const magnetActive = mouseInside && pressed;

          if (magnetActive) {
            const m = p.createVector(mx, my);
            const d = p5.Vector.dist(this.pos, m);
            const magnetRadius = Math.max(p.width, p.height) * 1.25;

            let t = 1 - p.constrain(d / magnetRadius, 0, 1);
            // smoothstep-ish easing
            t = t * t * (3 - 2 * t);

            const toMouse = p5.Vector.sub(m, this.pos);
            if (toMouse.magSq() > 0.0001) toMouse.normalize();

            const wobble =
              1 +
              0.18 *
                Math.sin(
                  p.frameCount * 0.06 +
                    this.home.x * 0.02 +
                    this.home.y * 0.02
                );

            const pull = toMouse.copy().mult(MAGNET_PULL * t * wobble);
            const swirl = p.createVector(-toMouse.y, toMouse.x).mult(
              magnetSwirlAmt * t * wobble
            );

            mouseForce.add(pull).add(swirl);
            this.magnet = p.lerp(this.magnet, t, 0.28);
          } else {
            this.magnet *= MAGNET_DECAY;
            if (this.magnet < 0.001) this.magnet = 0;
          }

          if (!magnetActive && mouseInside) {
            const m = p.createVector(mx, my);
            const d = p5.Vector.dist(this.pos, m);
            if (d < radius) {
              // smoothstep falloff
              let t = 1 - d / radius;
              t = t * t * (3 - 2 * t);
              hoverT = t;

              this.heat = Math.min(1, this.heat + HEAT_UP * t);

              const awayDir = p5.Vector.sub(this.pos, m);
              if (awayDir.magSq() > 0.0001) awayDir.normalize();
              const amp = t * (1 + 2.4 * this.heat);
              const away = awayDir.mult(REPEL * amp);

              const wobble =
                1 +
                0.25 *
                  Math.sin(
                    p.frameCount * 0.06 +
                      this.home.x * 0.03 +
                      this.home.y * 0.03
                  );
              const swirl = p.createVector(-away.y, away.x).mult(
                hoverSwirlAmt * amp * wobble
              );

              mouseForce.add(away).add(swirl);
            } else {
              this.heat *= HEAT_DECAY;
            }
          } else {
            this.heat *= HEAT_DECAY;
          }

          const springK =
            SPRING * (HOT_SPRING_MIN + (1 - HOT_SPRING_MIN) * (1 - this.heat));
          const toHome = p5.Vector.sub(this.home, this.pos).mult(springK);

          this.vel.add(toHome);
          this.vel.add(mouseForce);
          let damp = DAMPING + (HOT_DAMP_MAX - DAMPING) * this.heat;
          let maxSpd = MAX_SPEED;
          if (magnetActive) {
            damp = 0.88; // less damping so pull accumulates fast
            maxSpd = 48;  // higher cap so particles snap in ~1s
          }
          this.vel.mult(damp);
          this.vel.limit(maxSpd);
          this.pos.add(this.vel);

          if (hoverT > 0) {
            if (this.sizeHeat === 0) this.randomSize = p.random(SIZE_MIN, SIZE_MAX);
            this.sizeHeat = Math.min(1, this.sizeHeat + SIZE_HEAT_UP * hoverT);
          } else {
            this.sizeHeat *= SIZE_HEAT_DECAY;
            if (this.sizeHeat < 0.001) this.sizeHeat = 0;
          }

          this.targetSize = p.lerp(POINT_SIZE, this.randomSize, this.sizeHeat);
          this.size = p.lerp(this.size, this.targetSize, SIZE_LERP);
        }

        draw() {
          const distToEdge = Math.min(
            this.pos.x,
            this.pos.y,
            p.width - this.pos.x,
            p.height - this.pos.y
          );
          const alpha = p.constrain(
            p.map(distToEdge, 0, FEATHER_PX, 0, 255),
            0,
            255
          );
          // Base color: blend accent <-> white by activation
          const t = Math.max(this.heat, this.sizeHeat);
          let r = p.lerp(255, ACCENT[0], t);
          let g = p.lerp(255, ACCENT[1], t);
          let b = p.lerp(255, ACCENT[2], t);

          // Magnet pull (desktop click): blend towards red, then fade back on release
          if (this.magnet > 0) {
            r = p.lerp(r, RED[0], this.magnet);
            g = p.lerp(g, RED[1], this.magnet);
            b = p.lerp(b, RED[2], this.magnet);
          }
          p.noStroke();
          p.fill(r, g, b, alpha);
          p.circle(this.pos.x, this.pos.y, this.size);
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

        // Touch support for magnet pull on mobile
        const el = p.canvas;
        if (el) {
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
        // Transparent canvas, no background.
        p.clear();

        // Handle hash/view changes that toggle #home visibility.
        // (When it becomes visible again, its bounding box changes.)
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

