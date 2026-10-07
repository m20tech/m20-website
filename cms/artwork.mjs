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
