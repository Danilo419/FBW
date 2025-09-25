'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type Props = {
  name?: string;                 // name do input para submissão do form
  value?: string;                // valor inicial (ex.: "Portugal")
  onChange?: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;            // classes do input “visível” (para combinar com o teu design)
};

// Lista ISO 3166-1 alpha-2 (países e territórios) — geramos os nomes via Intl.DisplayNames.
const ISO_ALPHA2 = [
  'AD','AE','AF','AG','AI','AL','AM','AO','AQ','AR','AS','AT','AU','AW','AX','AZ','BA','BB','BD','BE','BF','BG','BH','BI','BJ','BL','BM','BN','BO','BQ','BR','BS','BT','BV','BW','BY','BZ','CA','CC','CD','CF','CG','CH','CI','CK','CL','CM','CN','CO','CR','CU','CV','CW','CX','CY','CZ','DE','DJ','DK','DM','DO','DZ','EC','EE','EG','EH','ER','ES','ET','FI','FJ','FK','FM','FO','FR','GA','GB','GD','GE','GF','GG','GH','GI','GL','GM','GN','GP','GQ','GR','GS','GT','GU','GW','GY','HK','HM','HN','HR','HT','HU','ID','IE','IL','IM','IN','IO','IQ','IR','IS','IT','JE','JM','JO','JP','KE','KG','KH','KI','KM','KN','KP','KR','KW','KY','KZ','LA','LB','LC','LI','LK','LR','LS','LT','LU','LV','LY','MA','MC','MD','ME','MF','MG','MH','MK','ML','MM','MN','MO','MP','MQ','MR','MS','MT','MU','MV','MW','MX','MY','MZ','NA','NC','NE','NF','NG','NI','NL','NO','NP','NR','NU','NZ','OM','PA','PE','PF','PG','PH','PK','PL','PM','PN','PR','PS','PT','PW','PY','QA','RE','RO','RS','RU','RW','SA','SB','SC','SD','SE','SG','SH','SI','SJ','SK','SL','SM','SN','SO','SR','SS','ST','SV','SX','SY','SZ','TC','TD','TF','TG','TH','TJ','TK','TL','TM','TN','TO','TR','TT','TV','TW','TZ','UA','UG','UM','US','UY','UZ','VA','VC','VE','VG','VI','VN','VU','WF','WS','YE','YT','ZA','ZM','ZW'
];

// Gera nomes legíveis na língua do checkout (aqui uso EN para consistência do teu UI)
function buildCountries() {
  const dnOk = typeof (Intl as any).DisplayNames === 'function';
  const dn = dnOk ? new (Intl as any).DisplayNames(['en'], { type: 'region' }) : null;
  const arr = ISO_ALPHA2.map(code => {
    const name = dn ? dn.of(code) : code;
    return { code, name: String(name) };
  });
  arr.sort((a, b) => a.name.localeCompare(b.name, 'en'));
  return arr;
}
const COUNTRIES = buildCountries();

function strip(s: string) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export default function CountrySelect({
  name = 'country',
  value = '',
  onChange,
  placeholder = 'Country',
  required,
  className = 'w-full rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500',
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(value);
  const [query, setQuery] = useState('');

  // Preseleciona caso value venha de fora
  useEffect(() => { if (value) setSelected(value); }, [value]);

  // Lista filtrada
  const items = useMemo(() => {
    if (!query) return COUNTRIES;
    const q = strip(query);
    return COUNTRIES.filter(c => strip(c.name).includes(q) || strip(c.code).includes(q));
  }, [query]);

  // Fechar ao clicar fora
  useEffect(() => {
    function onDoc(ev: MouseEvent) {
      if (!containerRef.current?.contains(ev.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  // Abrir e focar pesquisa
  const openPanel = () => {
    setOpen(true);
    setTimeout(() => searchRef.current?.focus(), 0);
  };

  const selectCountry = (name: string) => {
    setSelected(name);
    onChange?.(name);
    setOpen(false);
    setQuery('');
  };

  // Teclas no input “display”
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openPanel();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      openPanel();
    } else if (e.key === 'Backspace') {
      // permitir limpar rapidamente
      if (!open && selected) {
        setSelected('');
        onChange?.('');
      }
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Input “display” (readOnly para manter estilo de input) */}
      <input
        readOnly
        value={selected}
        onClick={openPanel}
        onFocus={openPanel}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className={className}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls="country-listbox"
        role="combobox"
      />
      {/* Input real para o formulário */}
      <input type="hidden" name={name} value={selected} required={required} />

      {open && (
        <div
          className="absolute left-0 right-0 z-30 mt-2 rounded-xl border bg-white shadow-xl"
          role="dialog"
          aria-label="Select country"
        >
          {/* Barra de pesquisa dentro do painel */}
          <div className="p-2 border-b">
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search country..."
              className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <ul
            id="country-listbox"
            role="listbox"
            className="max-h-64 overflow-y-auto py-2"
          >
            {items.length === 0 && (
              <li className="px-3 py-2 text-sm text-gray-500">No results</li>
            )}
            {items.map((c) => {
              const active = c.name === selected;
              return (
                <li
                  key={c.code}
                  role="option"
                  aria-selected={active}
                  onMouseDown={(e) => {
                    // usar mousedown para selecionar mesmo antes do blur
                    e.preventDefault();
                    selectCountry(c.name);
                  }}
                  className={`px-3 py-2 cursor-pointer hover:bg-gray-100 ${active ? 'bg-blue-50' : ''}`}
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
