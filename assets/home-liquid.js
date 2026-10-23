import { initLiquidEther } from "./liquid-ether.js";

const mount = document.getElementById("liquid-bg");

if (mount) {
  initLiquidEther(mount, {
    colors: ["#5eb0ff", "#ff9f5a", "#2ed4c4", "#f0c840"],
    mouseForce: 18,
    cursorSize: 110,
    resolution: 0.45,
    autoDemo: true,
    autoSpeed: 0.35,
    autoIntensity: 1.8,
    BFECC: true,
    onHoldChange: (holding) => {
      if (!window.matchMedia("(max-width: 960px)").matches) return;
      window.csMobileNav?.setInteractionHidden?.(holding);
    },
  });
}
