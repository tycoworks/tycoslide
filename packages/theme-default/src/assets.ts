// Default Theme Assets
// Fonts via @fontsource, icons as PNG (converted from @material-design-icons/svg)

import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const icon = (name: string) => fileURLToPath(new URL(`../assets/icons/${name}`, import.meta.url));
const tycoworks = (name: string) => fileURLToPath(new URL(`../assets/tycoworks/${name}`, import.meta.url));

export const assets = {
  fonts: {
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
  },
  icons: {
    description: icon("description.png"),
    palette: icon("palette.png"),
    shield: icon("verified_user.png"),
  },
  tycoworks: {
    tycoslide: tycoworks("tycoslide.png"),
    background: tycoworks("tycoworks background.png"),
    logo: tycoworks("tycoworks logo.png"),
  },
};

export type Assets = typeof assets;
