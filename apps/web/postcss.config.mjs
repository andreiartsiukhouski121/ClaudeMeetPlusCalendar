/**
 * Tailwind v4 reaches Next through PostCSS — HeroUI v3 requires v4 and does not work with v3
 * (`ADR-0023`). One plugin and nothing else: v4 needs no `tailwind.config.js`, the theme lives in
 * `globals.css` behind `@import "tailwindcss"`.
 */
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};

export default config;
