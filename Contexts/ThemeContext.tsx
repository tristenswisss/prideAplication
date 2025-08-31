import React, { createContext, useContext, useEffect, useState } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ThemeColors {
  // Background colors
  background: string;
  surface: string;
  card: string;
  modal: string;

  // Text colors
  text: string;
  textSecondary: string;
  textTertiary: string;

  // Primary colors
  primary: string;
  primaryVariant: string;
  secondary: string;

  // Status colors
  success: string;
  warning: string;
  error: string;
  info: string;

  // Border and divider
  border: string;
  divider: string;

  // Special colors for the app
  accent: string;
  lgbtqFriendly: string;
  transFriendly: string;
  verified: string;

  // Tab bar colors
  tabBarBackground: string;
  tabBarActive: string;
  tabBarInactive: string;

  // Header colors
  headerBackground: string;
  headerText: string;

  // Input colors
  inputBackground: string;
  inputBorder: string;
  inputText: string;
  placeholder: string;

  // Shadow colors
  shadow: string;
}

export interface Theme {
  isDark: boolean;
  colors: ThemeColors;
}

const lightTheme: Theme = {
  isDark: false,
  colors: {
    // Background colors
    background: '#f5f5f5',
    surface: '#ffffff',
    card: '#ffffff',
    modal: '#ffffff',

    // Text colors
    text: '#333333',
    textSecondary: '#666666',
    textTertiary: '#999999',

    // Primary colors
    primary: '#FF6B6B',
    primaryVariant: '#E55A5A',
    secondary: '#4ECDC4',

    // Status colors
    success: '#4CAF50',
    warning: '#FF9800',
    error: '#F44336',
    info: '#2196F3',

    // Border and divider
    border: '#E0E0E0',
    divider: '#F0F0F0',

    // Special colors for the app
    accent: '#FFD700',
    lgbtqFriendly: '#FF6B6B',
    transFriendly: '#4ECDC4',
    verified: '#4CAF50',

    // Tab bar colors
    tabBarBackground: '#ffffff',
    tabBarActive: '#FF6B6B',
    tabBarInactive: '#666666',

    // Header colors
    headerBackground: '#000000',
    headerText: '#ffffff',

    // Input colors
    inputBackground: '#ffffff',
    inputBorder: '#E0E0E0',
    inputText: '#333333',
    placeholder: '#999999',

    // Shadow colors
    shadow: 'rgba(0, 0, 0, 0.1)',
  },
};

const darkTheme: Theme = {
  isDark: true,
  colors: {
    // Background colors
    background: '#121212',
    surface: '#1E1E1E',
    card: '#2A2A2A',
    modal: '#2A2A2A',

    // Text colors
    text: '#FFFFFF',
    textSecondary: '#B3B3B3',
    textTertiary: '#808080',

    // Primary colors
    primary: '#FF6B6B',
    primaryVariant: '#E55A5A',
    secondary: '#4ECDC4',

    // Status colors
    success: '#4CAF50',
    warning: '#FF9800',
    error: '#F44336',
    info: '#2196F3',

    // Border and divider
    border: '#404040',
    divider: '#333333',

    // Special colors for the app
    accent: '#FFD700',
    lgbtqFriendly: '#FF6B6B',
    transFriendly: '#4ECDC4',
    verified: '#4CAF50',

    // Tab bar colors
    tabBarBackground: '#1E1E1E',
    tabBarActive: '#FF6B6B',
    tabBarInactive: '#B3B3B3',

    // Header colors
    headerBackground: '#000000',
    headerText: '#FFFFFF',

    // Input colors
    inputBackground: '#2A2A2A',
    inputBorder: '#404040',
    inputText: '#FFFFFF',
    placeholder: '#808080',

    // Shadow colors
    shadow: 'rgba(0, 0, 0, 0.3)',
  },
};

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setSystemTheme: () => void;
  setThemePreference: (isDark: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(lightTheme);
  const [colorScheme, setColorScheme] = useState<ColorSchemeName>(Appearance.getColorScheme());
  const [userPreference, setUserPreference] = useState<'light' | 'dark' | 'system'>('system');

  useEffect(() => {
    // Load saved theme preference
    const loadThemePreference = async () => {
      try {
        const savedPreference = await AsyncStorage.getItem('themePreference');
        if (savedPreference) {
          setUserPreference(savedPreference as 'light' | 'dark' | 'system');
        }
      } catch (error) {
        console.error('Error loading theme preference:', error);
      }
    };

    loadThemePreference();
  }, []);

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setColorScheme(colorScheme);
      if (userPreference === 'system') {
        setTheme(colorScheme === 'dark' ? darkTheme : lightTheme);
      }
    });

    // Set initial theme based on preference
    if (userPreference === 'system') {
      setTheme(colorScheme === 'dark' ? darkTheme : lightTheme);
    } else {
      setTheme(userPreference === 'dark' ? darkTheme : lightTheme);
    }

    return () => subscription?.remove();
  }, [colorScheme, userPreference]);

  const toggleTheme = () => {
    const newTheme = theme.isDark ? lightTheme : darkTheme;
    setTheme(newTheme);
    setUserPreference(newTheme.isDark ? 'dark' : 'light');
    AsyncStorage.setItem('themePreference', newTheme.isDark ? 'dark' : 'light');
  };

  const setSystemTheme = () => {
    setUserPreference('system');
    AsyncStorage.setItem('themePreference', 'system');
    setTheme(colorScheme === 'dark' ? darkTheme : lightTheme);
  };

  const setThemePreference = async (isDark: boolean) => {
    const newTheme = isDark ? darkTheme : lightTheme;
    setTheme(newTheme);
    setUserPreference(isDark ? 'dark' : 'light');
    await AsyncStorage.setItem('themePreference', isDark ? 'dark' : 'light');
  };

  const value: ThemeContextType = {
    theme,
    toggleTheme,
    setSystemTheme,
    setThemePreference,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export { lightTheme, darkTheme };