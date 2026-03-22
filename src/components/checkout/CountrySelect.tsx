'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';

type Props = {
  name?: string;
  value?: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
};

const ISO_ALPHA2 = [
  'AD','AE','AF','AG','AI','AL','AM','AO','AQ','AR','AS','AT','AU','AW','AX','AZ','BA','BB','BD','BE','BF','BG','BH','BI','BJ','BL','BM','BN','BO','BQ','BR','BS','BT','BV','BW','BY','BZ','CA','CC','CD','CF','CG','CH','CI','CK','CL','CM','CN','CO','CR','CU','CV','CW','CX','CY','CZ','DE','DJ','DK','DM','DO','DZ','EC','EE','EG','EH','ER','ES','ET','FI','FJ','FK','FM','FO','FR','GA','GB','GD','GE','GF','GG','GH','GI','GL','GM','GN','GP','GQ','GR','GS','GT','GU','GW','GY','HK','HM','HN','HR','HT','HU','ID','IE','IL','IM','IN','IO','IQ','IR','IS','IT','JE','JM','JO','JP','KE','KG','KH','KI','KM','KN','KP','KR','KW','KY','KZ','LA','LB','LC','LI','LK','LR','LS','LT','LU','LV','LY','MA','MC','MD','ME','MF','MG','MH','MK','ML','MM','MN','MO','MP','MQ','MR','MS','MT','MU','MV','MW','MX','MY','MZ','NA','NC','NE','NF','NG','NI','NL','NO','NP','NR','NU','NZ','OM','PA','PE','PF','PG','PH','PK','PL','PM','PN','PR','PS','PT','PW','PY','QA','RE','RO','RS','RU','RW','SA','SB','SC','SD','SE','SG','SH','SI','SJ','SK','SL','SM','SN','SO','SR','SS','ST','SV','SX','SY','SZ','TC','TD','TF','TG','TH','TJ','TK','TL','TM','TN','TO','TR','TT','TV','TW','TZ','UA','UG','UM','US','UY','UZ','VA','VC','VE','VG','VI','VN','VU','WF','WS','YE','YT','ZA','ZM','ZW'
];

function buildCountries(locale: string) {
  const dnOk = typeof (Intl as any).DisplayNames === 'function';
  const dn = dnOk ? new (Intl as any).DisplayNames([locale], { type: 'region' }) : null;

  const arr = ISO_ALPHA2.map((code) => {
    const name = dn ? dn.of(code) : code;
    return { code, name: String(name) };
  });

  arr.sort((a, b) => a.name.localeCompare(b.name, locale));
  return arr;
}

function strip(s: string) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export default function CountrySelect({
  name = 'country',
  value = '',
  onChange,
  placeholder,
  required,
  className = 'w-full rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500',
}: Props) {
  const t = useTranslations('countrySelect');
  const locale = useLocale();

  const countries = useMemo(() => buildCountries(locale), [locale]);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(value);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (value) setSelected(value);
  }, [value]);

  const items = useMemo(() => {
    if (!query) return countries;
    const q = strip(query);
    return countries.filter(
      (c) => strip(c.name).includes(q) || strip(c.code).includes(q)
    );
  }, [query, countries]);

  useEffect(() => {
    function onDoc(ev: MouseEvent) {
      if (!containerRef.current?.contains(ev.target as Node)) setOpen(false);
    }

    if (open) document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const openPanel = () => {
    setOpen(true);
    setTimeout(() => searchRef.current?.focus(), 0);
  };

  const selectCountry = (countryName: string) => {
    setSelected(countryName);
    onChange?.(countryName);
    setOpen(false);
    setQuery('');
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openPanel();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      openPanel();
    } else if (e.key === 'Backspace') {
      if (!open && selected) {
        setSelected('');
        onChange?.('');
      }
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <input
        readOnly
        value={selected}
        onClick={openPanel}
        onFocus={openPanel}
        onKeyDown={onKeyDown}
        placeholder={placeholder ?? t('placeholder')}
        className={className}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls="country-listbox"
        aria-label={t('selectCountry')}
        role="combobox"
      />

      <input type="hidden" name={name} value={selected} required={required} />

      {open && (
        <div
          className="absolute left-0 right-0 z-30 mt-2 rounded-xl border bg-white shadow-xl"
          role="dialog"
          aria-label={t('selectCountry')}
        >
          <div className="border-b p-2">
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <ul
            id="country-listbox"
            role="listbox"
            className="max-h-64 overflow-y-auto py-2"
          >
            {items.length === 0 && (
              <li className="px-3 py-2 text-sm text-gray-500">
                {t('noResults')}
              </li>
            )}

            {items.map((c) => {
              const active = c.name === selected;

              return (
                <li
                  key={c.code}
                  role="option"
                  aria-selected={active}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectCountry(c.name);
                  }}
                  className={`cursor-pointer px-3 py-2 hover:bg-gray-100 ${active ? 'bg-blue-50' : ''}`}
                >
                  {c.name}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}