// The shared artwork library: one folder per artwork type under
// assets/artwork/. Each type is its own PagesCMS media folder, so an image
// field scoped to a type (artwork() in cms/fields.mjs) only offers artwork of
// that type. Sizes are the SVG canvas; `pngScale` sets the PNG export
// (npm run artwork:png). See "Illustrations" in design.md.

export const ARTWORK = {
  covers: {
    label: "Artwork: covers",
    width: 1200,
    height: 630,
    pngScale: 1,
    description: "1200×630 cover art. Use the .svg on pages; the .png is the social share image.",
  },
  heroes: {
    label: "Artwork: heroes",
    width: 2400,
    height: 1350,
    pngScale: 1,
    description: "2400×1350 dark network hero, faded in from the right of the hero. Decorative. Pick the .jpg.",
  },
  illustrations: {
    label: "Artwork: illustrations",
    width: 1200,
    height: 800,
    pngScale: 2,
    description: "1200×800 explanatory illustration.",
  },
  spots: {
    label: "Artwork: spots",
    width: 240,
    height: 240,
    pngScale: 2,
    description: "240×240 spot illustration, shown at about 104px. Decorative.",
  },
  "app-icons": {
    label: "Artwork: app icons",
    width: 512,
    height: 512,
    pngScale: 2,
    description: "512×512 app icon: one per M20 app, agent, or plugin.",
  },
};

export const ARTWORK_EXTENSIONS = ["svg", "png", "jpg", "jpeg", "webp"];

// PagesCMS media folders, one per artwork type.
export const artworkMedia = Object.entries(ARTWORK).map(([name, a]) => ({
  name,
  label: a.label,
  input: `assets/artwork/${name}`,
  output: `/assets/artwork/${name}`,
  extensions: ARTWORK_EXTENSIONS,
}));
