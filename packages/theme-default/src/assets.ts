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
      light: {
        name: 'Inter Light',
        path: require.resolve('@fontsource/inter/files/inter-latin-300-normal.woff2'),
      },
      normal: {
        name: 'Inter',
        path: require.resolve('@fontsource/inter/files/inter-latin-400-normal.woff2'),
      },
      bold: {
        name: 'Inter Bold',
        path: require.resolve('@fontsource/inter/files/inter-latin-700-normal.woff2'),
      },
    },
    firaCode: {
      normal: {
        name: 'Fira Code',
        path: require.resolve('@fontsource/fira-code/files/fira-code-latin-400-normal.woff2'),
      },
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
