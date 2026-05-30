import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations, Language } from '../lib/translations';
import { lightColors, darkColors } from '../theme';
import { useColorScheme } from 'react-native';

type ThemeMode = 'light' | 'dark' | 'system';

interface LanguageContextProps {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: (key: string, section?: string) => string;
  fontFamily: string;
  fontFamilyBold: string;
  colors: typeof lightColors;
  isDark: boolean;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLangState] = useState<Language>('English');
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeState] = useState<ThemeMode>('system');

  // Resolve the effective theme: explicit light/dark wins, else follow system.
  const isDark = themeMode === 'dark' ? true : themeMode === 'light' ? false : systemColorScheme === 'dark';

  useEffect(() => {
    const load = async () => {
      const savedLang = await AsyncStorage.getItem('user-language');
      if (savedLang) setLangState(savedLang as Language);
      const savedTheme = await AsyncStorage.getItem('user-theme');
      if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system') {
        setThemeState(savedTheme);
      }
    };
    load();
  }, []);

  const setLanguage = async (lang: Language) => {
    setLangState(lang);
    await AsyncStorage.setItem('user-language', lang);
  };

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeState(mode);
    await AsyncStorage.setItem('user-theme', mode);
  };

  const t = (key: string) => {
    return translations[language][key] || key;
  };

  // Dynamic Font Selection
  const fontFamily = language === 'English' ? 'Inter_400Regular' : 'Mukta_400Regular';
  const fontFamilyBold = language === 'English' ? 'Inter_700Bold' : 'Mukta_700Bold';

  // Dynamic Theme Generation
  const baseColors = isDark ? darkColors : lightColors;
  
  const getLanguageTheme = () => {
    if (language === 'Hindi') {
      return { 
        ...baseColors, 
        primary: '#F97316', // Saffron
        primaryDark: '#EA580C',
        brandPrimary: '#F97316'
      };
    }
    if (language === 'Marathi') {
      return { 
        ...baseColors, 
        primary: '#16A34A', // Green
        primaryDark: '#15803D',
        brandPrimary: '#16A34A'
      };
    }
    return baseColors;
  };

  const colors = getLanguageTheme();

  return (
    <LanguageContext.Provider value={{ 
      language, 
      setLanguage, 
      t, 
      fontFamily,
      fontFamilyBold,
      colors,
      isDark,
      themeMode,
      setThemeMode,
    }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};
