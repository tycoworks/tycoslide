// Default Theme Assets
// Icons from @material-symbols/svg-400 (outlined variant), brand images.

import { createRequire } from "node:module";
import { AssetCatalog } from "@tycoslide/sdk";

const require = createRequire(import.meta.url);

export const assets = new AssetCatalog(import.meta.url, {
  icons: {
    edit_document: {
      path: require.resolve("@material-symbols/svg-400/outlined/edit_document.svg"),
      documentation: { description: "Pencil on document — editable output, content authoring" },
    },
    code: {
      path: require.resolve("@material-symbols/svg-400/outlined/code.svg"),
      documentation: { description: "Angle brackets — code, developer tools, design as code" },
    },
    verified: {
      path: require.resolve("@material-symbols/svg-400/outlined/verified.svg"),
      documentation: { description: "Checkmark badge — build safety, validation, trust" },
    },
  },
  tycoslide: {
    logo: {
      path: "assets/tycoslide/logo.png",
      documentation: {
        description: "Full tycoslide wordmark, dark variant",
        whenToUse: "Title slides and footers on light backgrounds",
      },
    },
    logoWhite: {
      path: "assets/tycoslide/logoWhite.png",
      documentation: {
        description: "Full tycoslide wordmark, white variant",
        whenToUse: "Footers and branding on dark backgrounds",
      },
    },
    logomark: {
      path: "assets/tycoslide/logomark.png",
      documentation: { description: "tycoslide icon mark (no text), dark variant" },
    },
    logomarkWhite: {
      path: "assets/tycoslide/logomarkWhite.png",
      documentation: { description: "tycoslide icon mark (no text), white variant" },
    },
    background: {
      path: "assets/tycoslide/background.png",
      documentation: {
        description: "Full-bleed branded background image",
        whenToUse: "Title slides for visual impact",
      },
    },
  },
});
