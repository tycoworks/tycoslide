// Default Theme Assets
// Icons as PNG (converted from @material-design-icons/svg), brand images.

import { fileURLToPath } from "node:url";

const icon = (name: string) => fileURLToPath(new URL(`../assets/icons/${name}`, import.meta.url));
const tycoslide = (name: string) => fileURLToPath(new URL(`../assets/tycoslide/${name}`, import.meta.url));

import type { AssetCatalog } from "@tycoslide/sdk";

/** Documented asset catalog for the skill compiler (manifest.json). */
export const assetCatalog: AssetCatalog = {
  icons: {
    description: {
      path: icon("description.png"),
      documentation: { description: "Document/page icon for content-heavy slides" },
    },
    palette: {
      path: icon("palette.png"),
      documentation: { description: "Color palette icon for design/branding topics" },
    },
    shield: {
      path: icon("verified_user.png"),
      documentation: {
        description: "Shield/checkmark icon for security or trust topics",
        whenToUse: "Security features, compliance, trust signals",
      },
    },
    redo: {
      path: icon("redo.png"),
      documentation: { description: "Circular arrow icon for iteration or refresh concepts" },
    },
  },
  tycoslide: {
    logo: {
      path: tycoslide("logo.png"),
      documentation: {
        description: "Full tycoslide wordmark, dark variant",
        whenToUse: "Title slides and footers on light backgrounds",
      },
    },
    logoWhite: {
      path: tycoslide("logo-white.png"),
      documentation: {
        description: "Full tycoslide wordmark, white variant",
        whenToUse: "Footers and branding on dark backgrounds",
      },
    },
    logomark: {
      path: tycoslide("logomark.png"),
      documentation: { description: "tycoslide icon mark (no text), dark variant" },
    },
    logomarkWhite: {
      path: tycoslide("logomark-white.png"),
      documentation: { description: "tycoslide icon mark (no text), white variant" },
    },
    background: {
      path: tycoslide("background.png"),
      documentation: {
        description: "Full-bleed branded background image",
        whenToUse: "Title slides for visual impact",
      },
    },
  },
};

/** Extract plain paths from a catalog category. */
function extractPaths(entries: Record<string, { path: string }>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [name, entry] of Object.entries(entries)) {
    out[name] = entry.path;
  }
  return out;
}

/** Runtime asset paths — derived from catalog for consumption by format files and chrome. */
export const assetPaths = {
  icons: extractPaths(assetCatalog.icons),
  tycoslide: extractPaths(assetCatalog.tycoslide),
};
