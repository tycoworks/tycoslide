import { DASH_TYPE, HALIGN, VALIGN } from "@tycoslide/core";

/**
 * Structural defaults for optional token fields.
 * Applied by component render functions when the field is omitted.
 */
export const DEFAULTS = {
  hAlign: HALIGN.LEFT,
  vAlign: VALIGN.MIDDLE,
  fillOpacity: 100,
  cornerRadius: 0,
  linkUnderline: true,
  dashType: DASH_TYPE.SOLID,
} as const;
