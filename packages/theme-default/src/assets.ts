// Default Theme Assets
// Icons as PNG (converted from @material-design-icons/svg), brand images.

import { AssetCatalog } from "@tycoslide/sdk";

export const assets = new AssetCatalog(import.meta.url, {
  icons: {
    description: {
      path: "assets/icons/description.png",
      documentation: { description: "Document/page icon for content-heavy slides" },
    },
    palette: {
      path: "assets/icons/palette.png",
      documentation: { description: "Color palette icon for design/branding topics" },
    },
    shield: {
      path: "assets/icons/shield.png",
      documentation: {
        description: "Shield/checkmark icon for security or trust topics",
        whenToUse: "Security features, compliance, trust signals",
      },
    },
    redo: {
      path: "assets/icons/redo.png",
      documentation: { description: "Circular arrow icon for iteration or refresh concepts" },
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
