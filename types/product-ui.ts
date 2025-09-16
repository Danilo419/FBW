// src/types/product-ui.ts

export type SizeUI = {
  id: string;      // cuid (string) vindo do Prisma
  size: string;
  stock: number;
};

export type OptionValueUI = {
  id: string;      // cuid (string)
  value: string;
  label: string;
  priceDelta: number; // preço extra em cêntimos
};

export type OptionGroupUI = {
  id: string;      // cuid (string)
  key: string;
  label: string;
  type: 'SIZE' | 'RADIO' | 'ADDON';
  required: boolean;
  values: OptionValueUI[];
};

export type ProductUI = {
  id: string;      // cuid (string)
  slug: string;
  name: string;
  team: string;
  basePrice: number;   // preço base em cêntimos
  images: string[];
  description: string;
  sizes: SizeUI[];
  optionGroups: OptionGroupUI[];
};
