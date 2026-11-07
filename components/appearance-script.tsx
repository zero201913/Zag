import { APPEARANCE_STORAGE_KEY, BACKGROUND_URL_PREFIX } from "@/lib/appearance";

const appearanceScript = `
(function () {
  try {
    if (location.pathname.indexOf("/admin") === 0) return;
    var raw = localStorage.getItem("${APPEARANCE_STORAGE_KEY}");
    if (!raw) return;
    var s = JSON.parse(raw) || {};
    var root = document.documentElement;

    var allowedPalettes = ["default", "ocean", "sunset", "forest", "rose", "custom"];
    var palette = allowedPalettes.indexOf(s.palette) >= 0 ? s.palette : "default";
    root.setAttribute("data-palette", palette);

    if (palette === "custom" && s.colors) {
      var hex = /^#[0-9a-f]{6}$/i;
      if (hex.test(s.colors.accent || "") && hex.test(s.colors.accent2 || "") && hex.test(s.colors.accent3 || "")) {
        root.style.setProperty("--accent", s.colors.accent);
        root.style.setProperty("--accent-2", s.colors.accent2);
        root.style.setProperty("--accent-3", s.colors.accent3);
        root.style.setProperty("--accent-soft", "color-mix(in srgb, " + s.colors.accent + " 12%, transparent)");
        root.style.setProperty("--ring", "color-mix(in srgb, " + s.colors.accent + " 30%, transparent)");
      }
    }

    var bg = s.background;
    if (typeof bg === "string" && bg.indexOf("${BACKGROUND_URL_PREFIX}") === 0) {
      root.setAttribute("data-custom-bg", "true");
      root.style.setProperty("--custom-bg-image", 'url("' + bg.replace(/"/g, "%22") + '")');
      var blur = typeof s.blur === "number" ? Math.max(0, Math.min(40, s.blur)) : 24;
      root.style.setProperty("--custom-bg-blur", blur + "px");
      root.style.setProperty("--custom-bg-mist", (0.22 + (blur / 40) * 0.33).toFixed(2));
    } else {
      root.setAttribute("data-custom-bg", "false");
    }
  } catch (e) {}
})();
`;

export function AppearanceScript() {
  return <script dangerouslySetInnerHTML={{ __html: appearanceScript }} />;
}