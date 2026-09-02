/**
 * The file names of a packaged theme (Agent Skill), in one place so the layout
 * of a skill reads on one screen. The engine's TEMPLATE_DIR is not here: it is
 * an engine concern, and the engine stays product-generic.
 */

export const THEME_CONFIG = "theme.json";

/** The layouts document: read whole, so it carries no open-ended list. */
export const MANIFEST_FILE = "manifest.json";

/** The searchable asset catalog, named by the manifest that points at it. */
export const ASSETS_FILE = "assets.json";

/**
 * The one archive a packaged theme's declared assets ship inside. Entries are
 * stored at theme-relative POSIX paths and never rewritten: packaging writes
 * them, building expands them.
 */
export const ASSETS_ARCHIVE = "assets.zip";

// SKILL.md, uppercase: the Agent Skills format requires that exact filename at
// the root of a skill folder, and a case-sensitive filesystem will not find any
// other.
export const SKILL_FILE = "SKILL.md";

export const SYNTAX_FILE = "syntax.md";

/** The manifest a packaged skill installs from, authored rather than copied. */
export const PACKAGE_JSON = "package.json";
