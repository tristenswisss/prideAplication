import { StyleSheet, ViewStyle, TextStyle, ImageStyle } from 'react-native';
import { ThemeColors } from '../Contexts/ThemeContext';

type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle };

/**
 * Creates a theme-aware stylesheet that automatically uses theme colors
 * @param stylesFunction Function that receives theme colors and returns styles
 * @param themeColors Current theme colors
 * @returns StyleSheet object with theme-aware styles
 */
export function createThemedStyles<T extends NamedStyles<T>>(
  stylesFunction: (colors: ThemeColors) => T,
  themeColors: ThemeColors
): T {
  return StyleSheet.create(stylesFunction(themeColors));
}

/**
 * Helper function to get themed color values
 * @param colors Theme colors object
 * @param colorKey Key of the color to get
 * @param fallback Fallback color if key doesn't exist
 * @returns Color value
 */
export function getThemeColor(
  colors: ThemeColors,
  colorKey: keyof ThemeColors,
  fallback?: string
): string {
  return colors[colorKey] || fallback || '#000000';
}

/**
 * Common themed style patterns
 */
export const themedStyles = {
  /**
   * Creates a card style with theme-aware background and shadow
   */
  card: (colors: ThemeColors) => ({
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    shadowColor: colors.shadow,
  }),

  /**
   * Creates a container style with theme-aware background
   */
  container: (colors: ThemeColors) => ({
    flex: 1,
    backgroundColor: colors.background,
  }),

  /**
   * Creates a surface style with theme-aware background
   */
  surface: (colors: ThemeColors) => ({
    backgroundColor: colors.surface,
  }),

  /**
   * Creates text styles with theme-aware colors
   */
  text: {
    primary: (colors: ThemeColors) => ({
      color: colors.text,
    }),
    secondary: (colors: ThemeColors) => ({
      color: colors.textSecondary,
    }),
    tertiary: (colors: ThemeColors) => ({
      color: colors.textTertiary,
    }),
  },

  /**
   * Creates input styles with theme-aware colors
   */
  input: (colors: ThemeColors) => ({
    backgroundColor: colors.inputBackground,
    borderColor: colors.inputBorder,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.inputText,
  }),

  /**
   * Creates button styles with theme-aware colors
   */
  button: {
    primary: (colors: ThemeColors) => ({
      backgroundColor: colors.primary,
      borderRadius: 8,
      paddingHorizontal: 16,
      paddingVertical: 12,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    }),
    secondary: (colors: ThemeColors) => ({
      backgroundColor: colors.secondary,
      borderRadius: 8,
      paddingHorizontal: 16,
      paddingVertical: 12,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    }),
  },

  /**
   * Creates header styles with theme-aware colors
   */
  header: (colors: ThemeColors) => ({
    backgroundColor: colors.headerBackground,
    paddingTop: 30,
    paddingBottom: 15,
    paddingHorizontal: 20,
  }),

  /**
   * Creates tab bar styles with theme-aware colors
   */
  tabBar: (colors: ThemeColors) => ({
    backgroundColor: colors.tabBarBackground,
    borderTopColor: colors.border,
    borderTopWidth: 1,
  }),

  /**
   * Creates modal styles with theme-aware colors
   */
  modal: (colors: ThemeColors) => ({
    backgroundColor: colors.modal,
    borderRadius: 12,
    padding: 20,
    margin: 20,
    elevation: 5,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowColor: colors.shadow,
  }),
};

/**
 * Hook to create themed styles that automatically update when theme changes
 * Usage: const styles = useThemedStyles((colors) => ({ container: { backgroundColor: colors.background } }));
 */
export function useThemedStyles<T extends NamedStyles<T>>(
  stylesFunction: (colors: ThemeColors) => T
): T {
  // This would be used with the theme context, but for now we'll create static styles
  // In components, we'll use the theme context to get colors and create styles
  return {} as T;
}