import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enCommon from './locales/en/common.json';
import enAuth from './locales/en/auth.json';
import enNotes from './locales/en/notes.json';
import enChat from './locales/en/chat.json';
import enSettings from './locales/en/settings.json';

import zhCNCommon from './locales/zh-CN/common.json';
import zhCNAuth from './locales/zh-CN/auth.json';
import zhCNNotes from './locales/zh-CN/notes.json';
import zhCNChat from './locales/zh-CN/chat.json';
import zhCNSettings from './locales/zh-CN/settings.json';

export const defaultNS = 'common';
export const resources = {
  en: {
    common: enCommon,
    auth: enAuth,
    notes: enNotes,
    chat: enChat,
    settings: enSettings,
  },
  'zh-CN': {
    common: zhCNCommon,
    auth: zhCNAuth,
    notes: zhCNNotes,
    chat: zhCNChat,
    settings: zhCNSettings,
  },
} as const;

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS,
    debug: false,
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

export default i18n;
