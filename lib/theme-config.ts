/**
 * Multi-theme color palette system
 * Inspired by Monkeytype's theme options
 */

export type ThemeName = 'light' | 'dark' | 'palenight' | 'vampire' | 'oceanic'

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
  }
}

const themes: Record<ThemeName, Theme> = {
  light: {
    name: 'light',
    displayName: 'Light',
    colors: {
      bg: '#f5f4ef',
      bgSecondary: '#f0efe8',
      surface: '#faf9f5',
      surfaceHover: '#f0efe8',
      text: '#2c2820',
      textSecondary: '#7d7560',
      accent: '#d97706',
      accentLight: '#fde68a',
      border: '#d4d0c0',
      borderLight: '#e5e1d0',
      success: '#16a34a',
      error: '#dc2626',
      warning: '#f59e0b',
      shadow: 'rgba(0, 0, 0, 0.1)',
    },
  },

  dark: {
    name: 'dark',
    displayName: 'Dark',
    colors: {
      bg: '#1a1710',
      bgSecondary: '#22201a',
      surface: '#22201a',
      surfaceHover: '#2d2a23',
      text: '#e8e6dc',
      textSecondary: '#9a9278',
      accent: '#f59e0b',
      accentLight: '#78350f',
      border: '#3d3930',
      borderLight: '#4d4940',
      success: '#22c55e',
      error: '#ef4444',
      warning: '#eab308',
      shadow: 'rgba(0, 0, 0, 0.4)',
    },
  },

  palenight: {
    name: 'palenight',
    displayName: 'Pale Night',
    colors: {
      bg: '#1a1f3a',
      bgSecondary: '#232d52',
      surface: '#252d4a',
      surfaceHover: '#2d3559',
      text: '#c4d1ed',
      textSecondary: '#8a92b2',
      accent: '#7e8cf7',
      accentLight: '#1e2343',
      border: '#3d4563',
      borderLight: '#4a5073',
      success: '#4ade80',
      error: '#f87171',
      warning: '#facc15',
      shadow: 'rgba(0, 0, 20, 0.5)',
    },
  },

  vampire: {
    name: 'vampire',
    displayName: 'Vampire',
    colors: {
      bg: '#0a0e27',
      bgSecondary: '#161a40',
      surface: '#16213e',
      surfaceHover: '#1d2a4f',
      text: '#e0e0ff',
      textSecondary: '#a0a0d2',
      accent: '#ff006e',
      accentLight: '#0f1729',
      border: '#2d3561',
      borderLight: '#3d4575',
      success: '#34d399',
      error: '#ff6b9d',
      warning: '#fcd34d',
      shadow: 'rgba(0, 0, 10, 0.6)',
    },
  },

  oceanic: {
    name: 'oceanic',
    displayName: 'Oceanic',
    colors: {
      bg: '#0f3d4d',
      bgSecondary: '#1a525f',
      surface: '#1a4f5f',
      surfaceHover: '#235a6f',
      text: '#d4f1f4',
      textSecondary: '#7fa3a8',
      accent: '#00d9ff',
      accentLight: '#0a2a38',
      border: '#2d6073',
      borderLight: '#3d7590',
      success: '#5eead4',
      error: '#fb7185',
      warning: '#fbbf24',
      shadow: 'rgba(0, 30, 40, 0.5)',
    },
  },
}

/**
 * Get all available themes
 */
export function getAllThemes(): Theme[] {
  return Object.values(themes)
}

/**
 * Get a specific theme by name
 */
export function getTheme(name: ThemeName): Theme {
  return themes[name]
}

/**
 * Validate if a theme name is valid
 */
export function isValidThemeName(name: string): name is ThemeName {
  return name in themes
}

/**
 * Get theme names as array
 */
export function getThemeNames(): ThemeName[] {
  return Object.keys(themes) as ThemeName[]
}

/**
 * Convert theme colors to CSS variables
 * Used in globals.css to apply theme
 */
export function themeToCSSVariables(theme: Theme): string {
  return `
    --bg: ${theme.colors.bg};
    --bg-secondary: ${theme.colors.bgSecondary};
    --surface: ${theme.colors.surface};
    --surface-hover: ${theme.colors.surfaceHover};
    --text: ${theme.colors.text};
    --text-secondary: ${theme.colors.textSecondary};
    --accent: ${theme.colors.accent};
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
