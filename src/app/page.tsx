"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClientSelector } from "@/components/client-selector";
import { MonthPicker } from "@/components/month-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Client {
  id: string;
  business_name: string;
  niche: string;
  contact_name: string;
  months_active: number;
  start_month: string;
}

export default function GeneratePage() {
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [month, setMonth] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const handleGenerate = async () => {
    if (!client || !month) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: client.id, month }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Generation failed");
      }
      const data = await res.json();
      router.push(`/report/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white">Generate Client Report</h1>

      <Card className="glass-card border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Select Client</CardTitle>
        </CardHeader>
        <CardContent>
          <ClientSelector onSelect={setClient} />
        </CardContent>
      </Card>

      {client && (
        <>
          <Card className="glass-card border-white/10">
            <CardContent className="pt-6">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Business</span>
                  <p className="text-white font-medium">{client.business_name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Niche</span>
                  <p className="text-white font-medium capitalize">{client.niche}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Contact</span>
                  <p className="text-white font-medium">{client.contact_name}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Select Month</CardTitle>
            </CardHeader>
            <CardContent>
              <MonthPicker startMonth={client.start_month} onSelect={setMonth} />
            </CardContent>
          </Card>
        </>
      )}

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <Button
        onClick={handleGenerate}
        disabled={!client || !month || loading}
        className="w-full bg-vo360-orange hover:bg-vo360-orange/90 text-white font-bold py-6 text-lg"
      >
        {loading ? "Generating Report..." : "Generate Report"}
      </Button>
    </div>
  );
}
