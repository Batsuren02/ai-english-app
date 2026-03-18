/**
 * Multi-theme color palette system
 * 7 themes: light, dark, palenight, vampire, oceanic, catppuccin, rosepine
 */

export type ThemeName = 'light' | 'dark' | 'palenight' | 'vampire' | 'oceanic' | 'catppuccin' | 'rosepine'

export interface Theme {
  name: ThemeName
  displayName: string
  colors: {
    // Main backgrounds
    bg: string
    bgSecondary: string

    // Surface/Card backgrounds
    surface: string
    surfaceHover: string

    // Text colors
    text: string
    textSecondary: string

    // Accent colors
    accent: string
    accentSecondary: string
    accentLight: string

    // Borders
    border: string
    borderLight: string

    // Semantic colors
    success: string
    error: string
    warning: string

    // Shadows
    shadow: string

    // V3.0: Glass & elevated surfaces
    surfaceGlass?: string
    surfaceElevated?: string
  }
}

const themes: Record<ThemeName, Theme> = {
  light: {
    name: 'light',
    displayName: 'Light',
    colors: {
      bg: '#f4f0e6',
      bgSecondary: '#ece7d9',
      surface: '#fffefb',
      surfaceHover: '#f8f4ec',
      text: '#1a1208',
      textSecondary: '#6e6355',
      accent: '#c2650a',
      accentSecondary: '#3d6b5e',
      accentLight: '#fdebd6',
      border: '#dbd5c8',
      borderLight: '#ede9e2',
      success: '#15803d',
      error: '#dc2626',
      warning: '#d97706',
      shadow: 'rgba(26, 18, 8, 0.08)',
    },
  },

  dark: {
    name: 'dark',
    displayName: 'Dark',
    colors: {
      bg: '#111009',
      bgSecondary: '#1b1810',
      surface: '#242019',
      surfaceHover: '#2d2a22',
      text: '#ede9e0',
      textSecondary: '#9b9285',
      accent: '#f0970a',
      accentSecondary: '#5bb8a8',
      accentLight: '#3d2408',
      border: '#302c24',
      borderLight: '#3f3b31',
      success: '#22c55e',
      error: '#f87171',
      warning: '#fbbf24',
      shadow: 'rgba(0, 0, 0, 0.5)',
      surfaceGlass: 'rgba(36, 32, 25, 0.82)',
      surfaceElevated: '#2d2a22',
    },
  },

  palenight: {
    name: 'palenight',
    displayName: 'Pale Night',
    colors: {
      bg: '#151b35',
      bgSecondary: '#1b2245',
      surface: '#202c56',        // was #1e2849 — more visible separation from bg
      surfaceHover: '#2a3868',   // was #253260
      text: '#cdd6f4',
      textSecondary: '#a0afd4',  // was #8892b0 — brighter, easier to read
      accent: '#7c91ff',         // was #8d9ef7 — more vibrant pop on navy bg
      accentSecondary: '#74c7ec',
      accentLight: '#1c2145',
      border: '#3e4d84',         // was #364070 — more visible
      borderLight: '#4f609a',    // was #445083
      success: '#a6da95',
      error: '#ed8796',
      warning: '#eed49f',
      shadow: 'rgba(0, 0, 20, 0.6)',
      surfaceGlass: 'rgba(32, 44, 86, 0.82)',
      surfaceElevated: '#2a3868',
    },
  },

  vampire: {
    name: 'vampire',
    displayName: 'Vampire',
    colors: {
      bg: '#0d0917',
      bgSecondary: '#140d22',
      surface: '#1e1438',        // was #1a1130 — more separation from bg
      surfaceHover: '#271848',   // was #221443
      text: '#e8e0ff',
      textSecondary: '#c4aee0',  // was #a892c8 — brighter, clearly secondary
      accent: '#f472b6',         // was #ff3d71 — FIXED: pink, not red (≠ error)
      accentSecondary: '#a855f7',
      accentLight: '#1a0a2e',
      border: '#3d2860',         // was #312050 — more visible
      borderLight: '#4e3678',    // was #3e2a65
      success: '#5bead4',
      error: '#ff5370',          // was #ff3d71 — now distinct from accent
      warning: '#fcd34d',
      shadow: 'rgba(0, 0, 10, 0.7)',
      surfaceGlass: 'rgba(30, 20, 56, 0.85)',
      surfaceElevated: '#271848',
    },
  },

  oceanic: {
    name: 'oceanic',
    displayName: 'Oceanic',
    colors: {
      bg: '#0a2535',
      bgSecondary: '#0f3347',
      surface: '#164a6a',        // was #14405a — more separation from bg
      surfaceHover: '#1d5c80',   // was #1a5070
      text: '#c8e8f0',
      textSecondary: '#93c5d4',  // was #6ea8b8 — lighter, distinct from accent hue
      accent: '#22d3ee',         // was #00c4e8 — brighter, higher contrast
      accentSecondary: '#ff8c69',
      accentLight: '#082030',
      border: '#245f78',         // was #1e546a — more visible
      borderLight: '#2e7690',    // was #2a6a82
      success: '#5eead4',
      error: '#fb7185',
      warning: '#fbbf24',
      shadow: 'rgba(0, 20, 35, 0.6)',
      surfaceGlass: 'rgba(22, 74, 106, 0.82)',
      surfaceElevated: '#1d5c80',
    },
  },

  catppuccin: {
    name: 'catppuccin',
    displayName: 'Catppuccin',
    colors: {
      bg: '#1e1e2e',
      bgSecondary: '#181825',
      surface: '#313244',
      surfaceHover: '#45475a',
      text: '#cdd6f4',
      textSecondary: '#a6adc8',
      accent: '#cba6f7',
      accentSecondary: '#89b4fa',
      accentLight: '#2a2240',
      border: '#4a4c62',         // was #45475a — was identical to surfaceHover
      borderLight: '#585b70',
      success: '#a6e3a1',
      error: '#f38ba8',
      warning: '#fab387',
      shadow: 'rgba(0, 0, 0, 0.5)',
      surfaceGlass: 'rgba(49, 50, 68, 0.82)',
      surfaceElevated: '#45475a',
    },
  },

  rosepine: {
    name: 'rosepine',
    displayName: 'Rosé Pine',
    colors: {
      bg: '#191724',
      bgSecondary: '#1f1d2e',    // was #12101e — FIXED: was darker than bg!
      surface: '#26233a',
      surfaceHover: '#403d52',
      text: '#e0def4',
      textSecondary: '#b0abc6',  // was #908caa — brighter, more readable
      accent: '#ebbcba',
      accentSecondary: '#9ccfd8',
      accentLight: '#2d1f2d',
      border: '#4a475e',         // was #403d52 — slightly more visible
      borderLight: '#524f67',
      success: '#56c99b',        // was #31748f — now clearly green
      error: '#eb6f92',
      warning: '#f6c177',
      shadow: 'rgba(0, 0, 0, 0.5)',
      surfaceGlass: 'rgba(38, 35, 58, 0.82)',
      surfaceElevated: '#403d52',
    },
  },
}

export function getAllThemes(): Theme[] {
  return Object.values(themes)
}

export function getTheme(name: ThemeName): Theme {
  return themes[name]
}

export function isValidThemeName(name: string): name is ThemeName {
  return name in themes
}

export function getThemeNames(): ThemeName[] {
  return Object.keys(themes) as ThemeName[]
}

export function themeToCSSVariables(theme: Theme): string {
  return `
    --bg: ${theme.colors.bg};
    --bg-secondary: ${theme.colors.bgSecondary};
    --surface: ${theme.colors.surface};
    --surface-hover: ${theme.colors.surfaceHover};
    --text: ${theme.colors.text};
    --text-secondary: ${theme.colors.textSecondary};
    --accent: ${theme.colors.accent};
    --accent-secondary: ${theme.colors.accentSecondary};
    --accent-light: ${theme.colors.accentLight};
    --border: ${theme.colors.border};
    --border-light: ${theme.colors.borderLight};
    --success: ${theme.colors.success};
    --error: ${theme.colors.error};
    --warning: ${theme.colors.warning};
    --shadow: ${theme.colors.shadow};
  `
}

export default themes
