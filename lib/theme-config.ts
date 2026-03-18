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
      surface: '#1e2849',
      surfaceHover: '#253260',
      text: '#cdd6f4',
      textSecondary: '#8892b0',
      accent: '#8d9ef7',
      accentSecondary: '#74c7ec',
      accentLight: '#1c2145',
      border: '#364070',
      borderLight: '#445083',
      success: '#a6da95',
      error: '#ed8796',
      warning: '#eed49f',
      shadow: 'rgba(0, 0, 20, 0.6)',
      surfaceGlass: 'rgba(30, 40, 73, 0.82)',
      surfaceElevated: '#253260',
    },
  },

  vampire: {
    name: 'vampire',
    displayName: 'Vampire',
    colors: {
      bg: '#0d0917',
      bgSecondary: '#140d22',
      surface: '#1a1130',
      surfaceHover: '#221443',
      text: '#e8e0ff',
      textSecondary: '#a892c8',
      accent: '#ff3d71',
      accentSecondary: '#a855f7',
      accentLight: '#1a0a2e',
      border: '#312050',
      borderLight: '#3e2a65',
      success: '#5bead4',
      error: '#ff3d71',
      warning: '#fcd34d',
      shadow: 'rgba(0, 0, 10, 0.7)',
      surfaceGlass: 'rgba(26, 17, 48, 0.85)',
      surfaceElevated: '#221443',
    },
  },

  oceanic: {
    name: 'oceanic',
    displayName: 'Oceanic',
    colors: {
      bg: '#0a2535',
      bgSecondary: '#0f3347',
      surface: '#14405a',
      surfaceHover: '#1a5070',
      text: '#c8e8f0',
      textSecondary: '#6ea8b8',
      accent: '#00c4e8',
      accentSecondary: '#ff8c69',
      accentLight: '#082030',
      border: '#1e546a',
      borderLight: '#2a6a82',
      success: '#5eead4',
      error: '#fb7185',
      warning: '#fbbf24',
      shadow: 'rgba(0, 20, 35, 0.6)',
      surfaceGlass: 'rgba(20, 64, 90, 0.82)',
      surfaceElevated: '#1a5070',
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
      border: '#45475a',
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
      bgSecondary: '#12101e',
      surface: '#26233a',
      surfaceHover: '#403d52',
      text: '#e0def4',
      textSecondary: '#908caa',
      accent: '#ebbcba',
      accentSecondary: '#9ccfd8',
      accentLight: '#2d1f2d',
      border: '#403d52',
      borderLight: '#524f67',
      success: '#31748f',
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
