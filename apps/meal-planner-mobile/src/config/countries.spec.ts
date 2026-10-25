import { COUNTRIES, COUNTRY_CODES, formatMoney, getCountry } from './countries';

describe('countries config', () => {
  it('derives currency from country', () => {
    expect(getCountry('IE')).toMatchObject({ currencyCode: 'EUR', currencySymbol: '€' });
    expect(getCountry('GB')).toMatchObject({ currencyCode: 'GBP', currencySymbol: '£' });
  });

  it('keys every entry by its own code', () => {
    for (const code of COUNTRY_CODES) expect(COUNTRIES[code].code).toBe(code);
  });

  it('formats money in the country currency', () => {
    expect(formatMoney(85, 'IE')).toBe('€85');
    expect(formatMoney(85.5, 'GB')).toBe('£85.50');
  });
});
