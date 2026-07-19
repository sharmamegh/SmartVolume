export type SupportedLocale = 'en' | 'en-XA';

const messages = {
  en: {
    dashboard: 'Dashboard',
    history: 'History',
    calibration: 'Calibration',
    settings: 'Settings',
    privacy: 'Privacy',
  },
  'en-XA': {
    dashboard: '[Ðåšhƀøåŕð]',
    history: '[Ħîšţøŕý]',
    calibration: '[Çåļîƀŕåţîøñ]',
    settings: '[Šëţţîñĝš]',
    privacy: '[Þŕîṽåçý]',
  },
} as const;

export type MessageKey = keyof typeof messages.en;

export function translate(key: MessageKey, locale: SupportedLocale = 'en'): string {
  return messages[locale][key];
}

export function isRtl(locale: string): boolean {
  return /^(ar|fa|he|ur)(-|$)/i.test(locale);
}
