import { describe, expect, it } from 'vitest';
import { isRtl, translate } from './i18n';

describe('localization scaffolding', () => {
  it('provides a visibly expanded pseudolocale', () => {
    expect(translate('settings', 'en-XA')).not.toBe(translate('settings', 'en'));
  });

  it('detects right-to-left locales', () => {
    expect(isRtl('ar-SA')).toBe(true);
    expect(isRtl('en-US')).toBe(false);
  });
});
