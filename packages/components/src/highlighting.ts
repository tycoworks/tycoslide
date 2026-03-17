// Syntax Highlighting — Languages and Themes
// Complete enumeration of supported languages and highlight themes for code blocks.
// Theme names align with Shiki's bundled themes; remap if switching highlighters.

// ============================================
// LANGUAGES
// ============================================

export const LANGUAGE = {
  // Web
  HTML: "html",
  CSS: "css",
  JAVASCRIPT: "javascript",
  JS: "js",
  JSX: "jsx",
  TYPESCRIPT: "typescript",
  TS: "ts",
  TSX: "tsx",
  JSON: "json",
  JSON5: "json5",
  JSONC: "jsonc",
  JSONL: "jsonl",
  JSONNET: "jsonnet",
  YAML: "yaml",
  YML: "yml",
  TOML: "toml",
  XML: "xml",
  XSL: "xsl",
  SVG: "svg",
  MARKDOWN: "markdown",
  MD: "md",
  MDX: "mdx",
  MDC: "mdc",

  // Web frameworks
  VUE: "vue",
  VUE_HTML: "vue-html",
  VUE_VINE: "vue-vine",
  SVELTE: "svelte",
  ASTRO: "astro",
  ANGULAR_HTML: "angular-html",
  ANGULAR_TS: "angular-ts",
  IMBA: "imba",

  // CSS preprocessors
  SCSS: "scss",
  SASS: "sass",
  LESS: "less",
  STYLUS: "stylus",
  STYL: "styl",
  POSTCSS: "postcss",

  // Templating
  PUG: "pug",
  JADE: "jade",
  HAML: "haml",
  HANDLEBARS: "handlebars",
  HBS: "hbs",
  ERB: "erb",
  TWIG: "twig",
  BLADE: "blade",
  LIQUID: "liquid",
  EDGE: "edge",
  MARKO: "marko",
  JINJA: "jinja",

  // Systems programming
  C: "c",
  CPP: "cpp",
  CSHARP: "csharp",
  CS: "cs",
  GO: "go",
  RUST: "rust",
  RS: "rs",
  SWIFT: "swift",
  KOTLIN: "kotlin",
  KT: "kt",
  KTS: "kts",
  JAVA: "java",
  SCALA: "scala",
  D: "d",
  ZIG: "zig",
  NIM: "nim",
  ODIN: "odin",
  C3: "c3",
  V: "v",
  VALA: "vala",
  HAXE: "haxe",
  MOVE: "move",

  // Scripting
  PYTHON: "python",
  PY: "py",
  RUBY: "ruby",
  RB: "rb",
  PERL: "perl",
  PERL6: "perl6",
  RAKU: "raku",
  PHP: "php",
  LUA: "lua",
  LUAU: "luau",
  R: "r",
  JULIA: "julia",
  JL: "jl",
  ELIXIR: "elixir",
  ERLANG: "erlang",
  ERL: "erl",
  DART: "dart",
  CRYSTAL: "crystal",
  HACK: "hack",
  GROOVY: "groovy",
  MOJO: "mojo",

  // Functional
  HASKELL: "haskell",
  HS: "hs",
  OCAML: "ocaml",
  FSHARP: "fsharp",
  FS: "fs",
  CLOJURE: "clojure",
  CLJ: "clj",
  ELM: "elm",
  PURESCRIPT: "purescript",
  SCHEME: "scheme",
  RACKET: "racket",
  COMMON_LISP: "common-lisp",
  LISP: "lisp",
  FENNEL: "fennel",
  LEAN: "lean",
  LEAN4: "lean4",
  COQ: "coq",
  PROLOG: "prolog",

  // Shell
  BASH: "bash",
  SH: "sh",
  ZSH: "zsh",
  FISH: "fish",
  SHELL: "shell",
  SHELLSCRIPT: "shellscript",
  SHELLSESSION: "shellsession",
  CONSOLE: "console",
  POWERSHELL: "powershell",
  PS1: "ps1",
  BAT: "bat",
  BATCH: "batch",
  CMD: "cmd",
  NUSHELL: "nushell",
  NU: "nu",

  // Database & query
  SQL: "sql",
  PLSQL: "plsql",
  GRAPHQL: "graphql",
  GQL: "gql",
  CYPHER: "cypher",
  CQL: "cql",
  KUSTO: "kusto",
  KQL: "kql",
  DAX: "dax",
  SPARQL: "sparql",

  // Config & infrastructure
  DOCKER: "docker",
  DOCKERFILE: "dockerfile",
  TERRAFORM: "terraform",
  TF: "tf",
  TFVARS: "tfvars",
  HCL: "hcl",
  NGINX: "nginx",
  APACHE: "apache",
  DOTENV: "dotenv",
  INI: "ini",
  PROPERTIES: "properties",
  SSH_CONFIG: "ssh-config",
  BICEP: "bicep",
  CUE: "cue",
  PKL: "pkl",

  // Diagrams & data
  MERMAID: "mermaid",
  MMD: "mmd",
  CSV: "csv",
  TSV: "tsv",
  REGEX: "regex",
  REGEXP: "regexp",
  DIFF: "diff",
  LOG: "log",
  HTTP: "http",
  HURL: "hurl",

  // Smart contracts
  SOLIDITY: "solidity",
  VYPER: "vyper",
  VY: "vy",
  CLARITY: "clarity",
  CADENCE: "cadence",
  CDC: "cdc",
  CAIRO: "cairo",

  // Mobile & platform
  OBJECTIVE_C: "objective-c",
  OBJC: "objc",
  OBJECTIVE_CPP: "objective-cpp",

  // .NET
  VB: "vb",
  RAZOR: "razor",
  BSL: "bsl",

  // Typesetting & documentation
  LATEX: "latex",
  TEX: "tex",
  TYPST: "typst",
  TYP: "typ",
  BIBTEX: "bibtex",
  RST: "rst",
  ASCIIDOC: "asciidoc",
  ADOC: "adoc",
  MEDIAWIKI: "mediawiki",
  WIKITEXT: "wikitext",

  // Game & graphics
  GLSL: "glsl",
  HLSL: "hlsl",
  WGSL: "wgsl",
  SHADER: "shader",
  SHADERLAB: "shaderlab",
  GDSCRIPT: "gdscript",
  GD: "gd",
  GDRESOURCE: "gdresource",
  GDSHADER: "gdshader",
  DREAM_MAKER: "dream-maker",

  // Build tools
  MAKE: "make",
  MAKEFILE: "makefile",
  CMAKE: "cmake",
  JUST: "just",
  GN: "gn",
  GNUPLOT: "gnuplot",

  // Lisp family & Emacs
  EMACS_LISP: "emacs-lisp",
  ELISP: "elisp",
  HY: "hy",
  VIML: "viml",
  VIM: "vim",
  VIMSCRIPT: "vimscript",

  // Assembly & low-level
  ASM: "asm",
  WASM: "wasm",
  RISCV: "riscv",
  MIPS: "mips",
  MIPSASM: "mipsasm",
  LLVM: "llvm",

  // Other
  ABAP: "abap",
  ACTIONSCRIPT_3: "actionscript-3",
  ADA: "ada",
  APL: "apl",
  APPLESCRIPT: "applescript",
  ARA: "ara",
  AWK: "awk",
  BALLERINA: "ballerina",
  BEANCOUNT: "beancount",
  BERRY: "berry",
  BE: "be",
  BIRD: "bird",
  BIRD2: "bird2",
  CLOSURE_TEMPLATES: "closure-templates",
  COBOL: "cobol",
  CODEOWNERS: "codeowners",
  CODEQL: "codeql",
  QL: "ql",
  COFFEESCRIPT: "coffeescript",
  COFFEE: "coffee",
  DESKTOP: "desktop",
  FLUENT: "fluent",
  FTL: "ftl",
  FORTRAN_FIXED_FORM: "fortran-fixed-form",
  FORTRAN_FREE_FORM: "fortran-free-form",
  GENIE: "genie",
  GHERKIN: "gherkin",
  GIT_COMMIT: "git-commit",
  GIT_REBASE: "git-rebase",
  GLEAM: "gleam",
  GLIMMER_JS: "glimmer-js",
  GJS: "gjs",
  GLIMMER_TS: "glimmer-ts",
  GTS: "gts",
  HJSON: "hjson",
  HTML_DERIVATIVE: "html-derivative",
  HXML: "hxml",
  JISON: "jison",
  JSSM: "jssm",
  FSL: "fsl",
  KDL: "kdl",
  LIT: "lit",
  LOGO: "logo",
  MATLAB: "matlab",
  MOONBIT: "moonbit",
  MBT: "mbt",
  NARRAT: "narrat",
  NAR: "nar",
  NEXTFLOW: "nextflow",
  NEXTFLOW_GROOVY: "nextflow-groovy",
  NIX: "nix",
  OPENSCAD: "openscad",
  SCAD: "scad",
  PASCAL: "pascal",
  POLAR: "polar",
  POWERQUERY: "powerquery",
  PRISMA: "prisma",
  PROTO: "proto",
  PROTOBUF: "protobuf",
  PUPPET: "puppet",
  QML: "qml",
  QMLDIR: "qmldir",
  QSS: "qss",
  REG: "reg",
  REL: "rel",
  RON: "ron",
  ROSMSG: "rosmsg",
  SAS: "sas",
  SDBL: "sdbl",
  SMALLTALK: "smalltalk",
  SOY: "soy",
  SPLUNK: "splunk",
  SPL: "spl",
  STATA: "stata",
  SURREALQL: "surrealql",
  SURQL: "surql",
  SYSTEMD: "systemd",
  SYSTEM_VERILOG: "system-verilog",
  VERILOG: "verilog",
  VHDL: "vhdl",
  TALON: "talon",
  TALONSCRIPT: "talonscript",
  TASL: "tasl",
  TCL: "tcl",
  TEMPL: "templ",
  TRES: "tres",
  TSCN: "tscn",
  TS_TAGS: "ts-tags",
  TYPESPEC: "typespec",
  TSP: "tsp",
  TURTLE: "turtle",
  WENYAN: "wenyan",
  WIT: "wit",
  WOLFRAM: "wolfram",
  WL: "wl",
  ZENSCRIPT: "zenscript",

  // Module variants (CJS/MJS/CTS/MTS)
  CJS: "cjs",
  MJS: "mjs",
  CTS: "cts",
  MTS: "mts",

  // Misc query & config
  APEX: "apex",
  PO: "po",
  POT: "pot",
  POTX: "potx",

  // Fortran aliases
  F: "f",
  F03: "f03",
  F08: "f08",
  F18: "f18",
  F77: "f77",
  F90: "f90",
  F95: "f95",
  FOR: "for",

  // Text (no highlighting)
  TEXT: "text",
} as const;

export type LanguageName = (typeof LANGUAGE)[keyof typeof LANGUAGE];

/** All LANGUAGE values as a tuple — useful for Zod enum schemas */
export const LANGUAGE_VALUES = Object.values(LANGUAGE) as [LanguageName, ...LanguageName[]];

// ============================================
// HIGHLIGHT THEMES
// ============================================

export const HIGHLIGHT_THEME = {
  // GitHub
  GITHUB_DARK: "github-dark",
  GITHUB_DARK_DEFAULT: "github-dark-default",
  GITHUB_DARK_DIMMED: "github-dark-dimmed",
  GITHUB_DARK_HIGH_CONTRAST: "github-dark-high-contrast",
  GITHUB_LIGHT: "github-light",
  GITHUB_LIGHT_DEFAULT: "github-light-default",
  GITHUB_LIGHT_HIGH_CONTRAST: "github-light-high-contrast",

  // Catppuccin
  CATPPUCCIN_FRAPPE: "catppuccin-frappe",
  CATPPUCCIN_LATTE: "catppuccin-latte",
  CATPPUCCIN_MACCHIATO: "catppuccin-macchiato",
  CATPPUCCIN_MOCHA: "catppuccin-mocha",

  // Gruvbox
  GRUVBOX_DARK_HARD: "gruvbox-dark-hard",
  GRUVBOX_DARK_MEDIUM: "gruvbox-dark-medium",
  GRUVBOX_DARK_SOFT: "gruvbox-dark-soft",
  GRUVBOX_LIGHT_HARD: "gruvbox-light-hard",
  GRUVBOX_LIGHT_MEDIUM: "gruvbox-light-medium",
  GRUVBOX_LIGHT_SOFT: "gruvbox-light-soft",

  // Material
  MATERIAL_THEME: "material-theme",
  MATERIAL_THEME_DARKER: "material-theme-darker",
  MATERIAL_THEME_LIGHTER: "material-theme-lighter",
  MATERIAL_THEME_OCEAN: "material-theme-ocean",
  MATERIAL_THEME_PALENIGHT: "material-theme-palenight",

  // Rose Pine
  ROSE_PINE: "rose-pine",
  ROSE_PINE_DAWN: "rose-pine-dawn",
  ROSE_PINE_MOON: "rose-pine-moon",

  // Vitesse
  VITESSE_BLACK: "vitesse-black",
  VITESSE_DARK: "vitesse-dark",
  VITESSE_LIGHT: "vitesse-light",

  // Kanagawa
  KANAGAWA_DRAGON: "kanagawa-dragon",
  KANAGAWA_LOTUS: "kanagawa-lotus",
  KANAGAWA_WAVE: "kanagawa-wave",

  // Ayu
  AYU_DARK: "ayu-dark",
  AYU_LIGHT: "ayu-light",
  AYU_MIRAGE: "ayu-mirage",

  // Everforest
  EVERFOREST_DARK: "everforest-dark",
  EVERFOREST_LIGHT: "everforest-light",

  // Solarized
  SOLARIZED_DARK: "solarized-dark",
  SOLARIZED_LIGHT: "solarized-light",

  // VS Code
  DARK_PLUS: "dark-plus",
  LIGHT_PLUS: "light-plus",
  MIN_DARK: "min-dark",
  MIN_LIGHT: "min-light",

  // Dracula
  DRACULA: "dracula",
  DRACULA_SOFT: "dracula-soft",

  // Night Owl
  NIGHT_OWL: "night-owl",
  NIGHT_OWL_LIGHT: "night-owl-light",

  // One
  ONE_DARK_PRO: "one-dark-pro",
  ONE_LIGHT: "one-light",

  // Slack
  SLACK_DARK: "slack-dark",
  SLACK_OCHIN: "slack-ochin",

  // Horizon
  HORIZON: "horizon",
  HORIZON_BRIGHT: "horizon-bright",

  // Standalone themes
  ANDROMEEDA: "andromeeda",
  AURORA_X: "aurora-x",
  HOUSTON: "houston",
  LASERWAVE: "laserwave",
  MONOKAI: "monokai",
  NORD: "nord",
  PLASTIC: "plastic",
  POIMANDRES: "poimandres",
  RED: "red",
  SNAZZY_LIGHT: "snazzy-light",
  SYNTHWAVE_84: "synthwave-84",
  TOKYO_NIGHT: "tokyo-night",
  VESPER: "vesper",
} as const;

export type HighlightThemeName = (typeof HIGHLIGHT_THEME)[keyof typeof HIGHLIGHT_THEME];

/** All HIGHLIGHT_THEME values as a tuple — useful for validation */
export const HIGHLIGHT_THEME_VALUES = Object.values(HIGHLIGHT_THEME) as [HighlightThemeName, ...HighlightThemeName[]];
