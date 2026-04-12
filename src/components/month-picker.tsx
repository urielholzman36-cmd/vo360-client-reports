"use client";

import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface Props {
  startMonth: string;
  onSelect: (month: string) => void;
}

export function MonthPicker({ startMonth, onSelect }: Props) {
  const now = new Date();
  const [startY, startM] = startMonth.split("-").map(Number);
  const months: { value: string; label: string }[] = [];

  let y = startY;
  let m = startM;
  while (y < now.getFullYear() || (y === now.getFullYear() && m <= now.getMonth() + 1)) {
    const val = `${y}-${String(m).padStart(2, "0")}`;
    const label = `${MONTH_NAMES[m - 1]} ${y}`;
    months.push({ value: val, label });
    m++;
    if (m > 12) { m = 1; y++; }
  }

  return (
    <Select onValueChange={(v: string | null) => { if (v) onSelect(v); }}>
      <SelectTrigger className="w-full glass-card border-white/10 text-white">
        <SelectValue placeholder="Select month..." />
      </SelectTrigger>
      <SelectContent>
        {months.map((m) => (
          <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
