"use client";

import { useEffect, useState } from "react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface Client {
  id: string;
  business_name: string;
  niche: string;
  contact_name: string;
  months_active: number;
  start_month: string;
}

interface Props {
  onSelect: (client: Client | null) => void;
}

export function ClientSelector({ onSelect }: Props) {
  const [clients, setClients] = useState<Client[]>([]);

  useEffect(() => {
    fetch("/api/clients").then((r) => r.json()).then(setClients);
  }, []);

  return (
    <Select
      onValueChange={(val) => {
        const client = clients.find((c) => c.id === val) ?? null;
        onSelect(client);
      }}
    >
      <SelectTrigger className="w-full glass-card border-white/10 text-white">
        <SelectValue placeholder="Select a client..." />
      </SelectTrigger>
      <SelectContent>
        {clients.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            {c.business_name} — {c.niche}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
