// ==========================================
// CINEMATIC CASE STUDY SYSTEM
// Scroll reveal, progress bar, page marker
// ==========================================
(function () {
  document.addEventListener("DOMContentLoaded", () => {
    const progressLine = document.getElementById("csProgressLine");
    const pageMarker = document.getElementById("csPageMarker");
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    // --- Progress bar (1px accent line at top) ---
    function updateProgress() {
      if (!document.body.classList.contains("is-project-view") || !progressLine)
        return;
      const h = document.documentElement.scrollHeight - window.innerHeight;
      progressLine.style.width = (h > 0 ? (window.scrollY / h) * 100 : 0) + "%";
    }

    // --- Page marker (top-right, fades in after scroll) ---
    function updateMarker() {
      if (!pageMarker) return;
      if (
        !document.body.classList.contains("is-project-view") ||
        window.scrollY < 300
      ) {
        pageMarker.classList.remove("visible");
      } else {
        pageMarker.classList.add("visible");
      }
    }

    window.addEventListener(
      "scroll",
      () => {
        updateProgress();
        updateMarker();
      },
      { passive: true }
    );

    // --- IntersectionObserver for .cs-reveal ---
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("cs-revealed");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -80px 0px" }
    );

    function observeReveals(root) {
      root.querySelectorAll(".cs-reveal").forEach((el) => {
        if (prefersReduced) {
          el.classList.add("cs-revealed");
        } else {
          revealObserver.observe(el);
        }
      });
    }

    // Initial observe (for direct-link loads)
    document.querySelectorAll(".project-page").forEach((p) => observeReveals(p));

    // --- projectShown event (dispatched by showProject) ---
    document.addEventListener("projectShown", (e) => {
      const sec = document.getElementById(e.detail.id);
      if (!sec) return;

      // Reset progress
      if (progressLine) progressLine.style.width = "0%";

      // Update page marker
      if (pageMarker) {
        pageMarker.textContent = sec.dataset.projectName || "";
        pageMarker.classList.remove("visible");
      }

      // Re-trigger cover entrance animation
      const cover = sec.querySelector(".cs-cover");
      if (cover) {
        cover.classList.remove("cs-animate");
        void cover.offsetWidth; // force reflow
        cover.classList.add("cs-animate");
      }

      // Reset + re-observe reveals
      sec.querySelectorAll(".cs-reveal").forEach((el) =>
        el.classList.remove("cs-revealed")
      );
      requestAnimationFrame(() => observeReveals(sec));
    });

    // --- homeShown event ---
    document.addEventListener("homeShown", () => {
      if (progressLine) progressLine.style.width = "0%";
      if (pageMarker) pageMarker.classList.remove("visible");
    });
  });
})();
