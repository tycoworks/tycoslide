// Default Theme Assets
// Fonts via @fontsource, icons as PNG (converted from @material-design-icons/svg)

import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const icon = (name: string) => fileURLToPath(new URL(`../assets/icons/${name}`, import.meta.url));
const tycoworks = (name: string) => fileURLToPath(new URL(`../assets/tycoworks/${name}`, import.meta.url));

export const assets = {
  fonts: {
    inter: {
      name: 'Inter',
      regular: { path: require.resolve('@fontsource/inter/files/inter-latin-400-normal.woff'), weight: 400 },
      italic: { path: require.resolve('@fontsource/inter/files/inter-latin-400-italic.woff'), weight: 400 },
      bold: { path: require.resolve('@fontsource/inter/files/inter-latin-700-normal.woff'), weight: 700 },
      boldItalic: { path: require.resolve('@fontsource/inter/files/inter-latin-700-italic.woff'), weight: 700 },
    },
    interLight: {
      name: 'Inter Light',
      regular: { path: require.resolve('@fontsource/inter/files/inter-latin-300-normal.woff'), weight: 300 },
      italic: { path: require.resolve('@fontsource/inter/files/inter-latin-300-italic.woff'), weight: 300 },
      bold: { path: require.resolve('@fontsource/inter/files/inter-latin-700-normal.woff'), weight: 700, name: 'Inter' },
      boldItalic: { path: require.resolve('@fontsource/inter/files/inter-latin-700-italic.woff'), weight: 700, name: 'Inter' },
    },
    firaCode: {
      name: 'Fira Code',
      regular: { path: require.resolve('@fontsource/fira-code/files/fira-code-latin-400-normal.woff'), weight: 400 },
      bold: { path: require.resolve('@fontsource/fira-code/files/fira-code-latin-700-normal.woff'), weight: 700 },
    },
  },
  icons: {
    barChart: icon('bar_chart.png'),
    group: icon('group.png'),
    lightbulb: icon('lightbulb.png'),
    rocket: icon('rocket_launch.png'),
    shield: icon('verified_user.png'),
    editNote: icon('edit_note.png'),
    build: icon('build.png'),
    trendingUp: icon('trending_up.png'),
    palette: icon('palette.png'),
    dashboard: icon('dashboard.png'),
    accountTree: icon('account_tree.png'),
    eventRepeat: icon('event_repeat.png'),
    howToVote: icon('how_to_vote.png'),
  },
  tycoworks: {
    website: tycoworks('website.png'),
    tycoslide: tycoworks('tycoslide.png'),
    background: tycoworks('tycoworks background.png'),
    logo: tycoworks('tycoworks logo.png'),
  },
};

export type Assets = typeof assets;
