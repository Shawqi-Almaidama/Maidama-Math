import { arTranslations, enTranslations } from '../localization/translations.ts';

function getKeys(obj: any, prefix = ''): string[] {
  let keys: string[] = [];
  for (const k in obj) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (typeof obj[k] === 'object' && obj[k] !== null) {
      keys = keys.concat(getKeys(obj[k], p));
    } else {
      keys.push(p);
    }
  }
  return keys;
}

const arKeys = new Set(getKeys(arTranslations));
const enKeys = new Set(getKeys(enTranslations));

const missingInEn = [...arKeys].filter((k) => !enKeys.has(k));
const missingInAr = [...enKeys].filter((k) => !arKeys.has(k));

console.log(
  JSON.stringify(
    {
      arTotal: arKeys.size,
      enTotal: enKeys.size,
      missingInEn,
      missingInAr,
    },
    null,
    2
  )
);
