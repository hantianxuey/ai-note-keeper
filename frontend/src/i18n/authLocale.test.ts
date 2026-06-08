import { describe, expect, it } from 'vitest';
import enAuth from './locales/en/auth.json';
import zhAuth from './locales/zh-CN/auth.json';

const resetPasswordKeys = [
  'heroSubtitle',
  'heroBadge',
  'heroTitle',
  'heroDescription',
  'featureWriteTitle',
  'featureWriteDesc',
  'featureAskTitle',
  'featureAskDesc',
  'featureControlTitle',
  'featureControlDesc',
  'mobileSubtitle',
  'welcomeBack',
  'resetPasswordTitle',
  'resetPasswordDescription',
  'loginDescription',
  'newPasswordPlaceholder',
  'verificationCode',
  'verificationCodeRequired',
  'sendCode',
  'sendingCode',
  'resetCodeSent',
  'resetCodeFailed',
  'noAccountForEmail',
  'resetPasswordButton',
  'resettingPassword',
  'passwordResetFailed',
  'backToLogin',
  'forgotPassword',
] as const;

describe('auth locale resources', () => {
  it('keeps reset password strings translated in English and Chinese', () => {
    for (const key of resetPasswordKeys) {
      expect(enAuth).toHaveProperty(key);
      expect(zhAuth).toHaveProperty(key);
    }
  });
});
