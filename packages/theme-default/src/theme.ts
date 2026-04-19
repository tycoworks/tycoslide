import { defineTheme } from "@tycoslide/sdk";
import { assets } from "./assets.js";
import * as base from "./base.js";
import { buildFormat } from "./buildFormat.js";
import { factsheetFormat } from "./formats/factsheet.js";
import { presentationFormat } from "./formats/presentation.js";

export const theme = defineTheme({
  fonts: [assets.fonts.inter, assets.fonts.interLight, assets.fonts.firaCode],
  formats: {
    presentation: buildFormat(base, presentationFormat),
    factsheet: buildFormat(base, factsheetFormat),
  },
});
