export type CountryConfig = {
  code: string;
  name: string;
  currencyCode: string;
  currencySymbol: string;
  /** BCP 47 locale used for number/currency formatting. */
  locale: string;
  measurementSystem: 'metric' | 'imperial';
};

/**
 * Single source of truth for supported markets. To add a country (e.g. US),
 * add an entry here; types, validation and UI choices follow automatically.
 */
export const COUNTRIES = {
  IE: {
    code: 'IE',
    name: 'Ireland',
    currencyCode: 'EUR',
    currencySymbol: '€',
    locale: 'en-IE',
    measurementSystem: 'metric',
  },
  GB: {
    code: 'GB',
    name: 'United Kingdom',
    currencyCode: 'GBP',
    currencySymbol: '£',
    locale: 'en-GB',
    measurementSystem: 'metric',
  },
} as const satisfies Record<string, CountryConfig>;

export type CountryCode = keyof typeof COUNTRIES;
export type CurrencyCode = (typeof COUNTRIES)[CountryCode]['currencyCode'];

export const COUNTRY_CODES = Object.keys(COUNTRIES) as [CountryCode, ...CountryCode[]];
export const COUNTRY_LIST: readonly CountryConfig[] = COUNTRY_CODES.map((code) => COUNTRIES[code]);

export function getCountry(code: CountryCode): CountryConfig {
  return COUNTRIES[code];
}

export function formatMoney(amount: number, code: CountryCode): string {
  const { locale, currencyCode } = COUNTRIES[code];
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount);
}
