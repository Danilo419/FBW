// src/data/squads.ts
export type SquadPlayer = { id: string; name: string; number: number };

export const SQUADS: Record<string, SquadPlayer[]> = {
  "Real Madrid": [
    { id: "vinicius", name: "Vini Jr", number: 7 },
    { id: "bellingham", name: "Bellingham", number: 5 },
    { id: "valverde", name: "Valverde", number: 15 },
    { id: "rodrygo", name: "Rodrygo", number: 11 },
    { id: "camavinga", name: "Camavinga", number: 12 },
  ],
  "FC Barcelona": [
    { id: "lewandowski", name: "Lewandowski", number: 9 },
    { id: "pedri", name: "Pedri", number: 8 },
    { id: "gundogan", name: "Gündogan", number: 22 },
    { id: "raphinha", name: "Raphinha", number: 11 },
    { id: "lamine-yamal", name: "Lamine Yamal", number: 27 },
  ],
  "SL Benfica": [
    { id: "rafa", name: "Rafa", number: 27 },
    { id: "di-maria", name: "Di María", number: 11 },
    { id: "nicolas-otamendi", name: "Nicolás Otamendi", number: 30 },
  ],
  "Sporting CP": [
    { id: "pote", name: "Pote", number: 8 },
    { id: "goncalo-inacio", name: "Gonçalo Inácio", number: 25 },
    { id: "paulinho", name: "Paulinho", number: 20 },
  ],
  "FC Porto": [
    { id: "taremi", name: "Taremi", number: 9 },
    { id: "pepe", name: "Pepe", number: 3 },
    { id: "otavio", name: "Otávio", number: 25 },
  ],
};
