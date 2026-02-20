// Default Theme Assets
// Fonts via @fontsource, icons via @material-design-icons/svg

import { createRequire } from 'module';

const require = createRequire(import.meta.url);

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
  },
  icons: {
    barChart: require.resolve('@material-design-icons/svg/filled/bar_chart.svg'),
    group: require.resolve('@material-design-icons/svg/filled/group.svg'),
    lightbulb: require.resolve('@material-design-icons/svg/filled/lightbulb.svg'),
    rocket: require.resolve('@material-design-icons/svg/filled/rocket_launch.svg'),
    shield: require.resolve('@material-design-icons/svg/filled/verified_user.svg'),
  },
};

export type Assets = typeof assets;
