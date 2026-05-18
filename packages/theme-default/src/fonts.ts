// Default Theme Fonts
// Resolved from @fontsource packages at build time.

import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

export const fonts = {
  inter: {
    name: "Inter",
    regular: { path: require.resolve("@fontsource/inter/files/inter-latin-400-normal.woff2"), weight: 400 },
    italic: { path: require.resolve("@fontsource/inter/files/inter-latin-400-italic.woff2"), weight: 400 },
    bold: { path: require.resolve("@fontsource/inter/files/inter-latin-700-normal.woff2"), weight: 700 },
    boldItalic: { path: require.resolve("@fontsource/inter/files/inter-latin-700-italic.woff2"), weight: 700 },
  },
  interLight: {
    name: "Inter Light",
    regular: { path: require.resolve("@fontsource/inter/files/inter-latin-300-normal.woff2"), weight: 300 },
    italic: { path: require.resolve("@fontsource/inter/files/inter-latin-300-italic.woff2"), weight: 300 },
    bold: {
      path: require.resolve("@fontsource/inter/files/inter-latin-700-normal.woff2"),
      weight: 700,
      name: "Inter",
    },
    boldItalic: {
      path: require.resolve("@fontsource/inter/files/inter-latin-700-italic.woff2"),
      weight: 700,
      name: "Inter",
    },
  },
  firaCode: {
    name: "Fira Code",
    regular: { path: require.resolve("@fontsource/fira-code/files/fira-code-latin-400-normal.woff2"), weight: 400 },
    bold: { path: require.resolve("@fontsource/fira-code/files/fira-code-latin-700-normal.woff2"), weight: 700 },
  },
};
