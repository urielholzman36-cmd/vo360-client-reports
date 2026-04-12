"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Report {
  id: string;
  business_name: string;
  report_month: string;
  blob_url: string | null;
  sent: number;
  sent_at: string | null;
  created_at: string;
}

export function HistoryTable() {
  const [reports, setReports] = useState<Report[]>([]);
  const [filterClient, setFilterClient] = useState<string>("all");
  const [filterSent, setFilterSent] = useState<string>("all");

  useEffect(() => {
    fetch("/api/reports/history").then((r) => r.json()).then(setReports);
  }, []);

  const uniqueClients = [...new Set(reports.map((r) => r.business_name))];

  const filtered = reports.filter((r) => {
    if (filterClient !== "all" && r.business_name !== filterClient) return false;
    if (filterSent === "sent" && r.sent !== 1) return false;
    if (filterSent === "unsent" && r.sent !== 0) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <Select value={filterClient} onValueChange={(v: string | null) => setFilterClient(v ?? "all")}>
          <SelectTrigger className="w-[200px] glass-card border-white/10 text-white">
            <SelectValue placeholder="All clients" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All clients</SelectItem>
            {uniqueClients.map((name) => (
              <SelectItem key={name} value={name}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterSent} onValueChange={(v: string | null) => setFilterSent(v ?? "all")}>
          <SelectTrigger className="w-[150px] glass-card border-white/10 text-white">
            <SelectValue placeholder="All status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="unsent">Not sent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="glass-card border-white/10 rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-white/10">
              <TableHead className="text-white">Business</TableHead>
              <TableHead className="text-white">Month</TableHead>
              <TableHead className="text-white">Generated</TableHead>
              <TableHead className="text-white">Status</TableHead>
              <TableHead className="text-white">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No reports yet
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => (
                <TableRow key={r.id} className="border-white/10">
                  <TableCell className="text-white font-medium">{r.business_name}</TableCell>
                  <TableCell className="text-muted-foreground">{r.report_month}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {r.sent ? (
                      <Badge className="bg-green-600 text-white">Sent</Badge>
                    ) : r.blob_url ? (
                      <Badge variant="outline" className="border-vo360-orange text-vo360-orange">Ready</Badge>
                    ) : (
                      <Badge variant="outline" className="border-white/20 text-muted-foreground">Draft</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Link href={`/report/${r.id}`} className="text-vo360-orange hover:underline text-sm">View</Link>
                      {r.blob_url && (
                        <a href={`/api/reports/${r.id}/download`} className="text-muted-foreground hover:text-white text-sm">Download</a>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
