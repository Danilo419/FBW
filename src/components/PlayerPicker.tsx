"use client";

type Player = { id: string; name: string; number: number };
type Props = {
  players: Player[];
  onPick: (p: Player | null) => void;
  value?: string; // id do jogador selecionado
};

export default function PlayerPicker({ players, onPick, value }: Props) {
  return (
    <label className="block">
      <span className="text-sm text-gray-700">Escolher jogador</span>
      <select
        className="mt-1 w-full rounded-2xl border px-3 py-2 outline-none"
        value={value ?? ""}
        onChange={(e) => {
          const p = players.find((x) => x.id === e.target.value) ?? null;
          onPick(p);
        }}
      >
        <option value="">— Selecionar —</option>
        {players.map((p) => (
          <option key={p.id} value={p.id}>
            {p.number} — {p.name}
          </option>
        ))}
      </select>
    </label>
  );
}
