import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { createContext, useContext, useMemo, useState } from 'react';

const THEME_STORAGE_KEY = 'attendance_theme_mode';
const LANGUAGE_STORAGE_KEY = 'attendance_language';

const AppPreferencesContext = createContext(null);

const getStoredValue = (key, fallback) => {
  try {
    return window.localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
};

const createAppTheme = (mode) =>
  createTheme({
    palette: {
      mode,
      primary: {
        main: '#2563eb',
      },
      secondary: {
        main: '#0f766e',
      },
      background: {
        default: mode === 'dark' ? '#101624' : '#f6f8fb',
        paper: mode === 'dark' ? '#172033' : '#ffffff',
      },
      text: {
        primary: mode === 'dark' ? '#e5edf7' : '#172033',
        secondary: mode === 'dark' ? '#9fb0c7' : '#64748b',
      },
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h4: {
        fontWeight: 700,
      },
      h6: {
        fontWeight: 700,
      },
      button: {
        fontWeight: 700,
        textTransform: 'none',
      },
    },
    shape: {
      borderRadius: 8,
    },
    components: {
      MuiCard: {
        styleOverrides: {
          root: {
            boxShadow:
              mode === 'dark'
                ? '0 12px 30px rgba(0, 0, 0, 0.28)'
                : '0 12px 30px rgba(15, 23, 42, 0.08)',
          },
        },
      },
      MuiButtonBase: {
        defaultProps: {
          disableRipple: true,
        },
      },
    },
  });

function AppPreferencesProvider({ children }) {
  const [themeMode, setThemeModeState] = useState(() => getStoredValue(THEME_STORAGE_KEY, 'light'));
  const [language, setLanguageState] = useState(() => getStoredValue(LANGUAGE_STORAGE_KEY, 'en'));
  const theme = useMemo(() => createAppTheme(themeMode), [themeMode]);

  const setThemeMode = (nextMode) => {
    setThemeModeState(nextMode);
    window.localStorage.setItem(THEME_STORAGE_KEY, nextMode);
  };

  const toggleThemeMode = () => {
    setThemeMode(themeMode === 'dark' ? 'light' : 'dark');
  };

  const setLanguage = (nextLanguage) => {
    setLanguageState(nextLanguage);
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
  };

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      setThemeMode,
      themeMode,
      toggleThemeMode,
    }),
    [language, themeMode],
  );

  return (
    <AppPreferencesContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </AppPreferencesContext.Provider>
  );
}

export const useAppPreferences = () => useContext(AppPreferencesContext);

export default AppPreferencesProvider;
