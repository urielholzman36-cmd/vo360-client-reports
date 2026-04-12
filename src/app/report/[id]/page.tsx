"use client";

import { useEffect, useState, use } from "react";
import { NarrativeEditor } from "@/components/narrative-editor";
import { PdfPreview } from "@/components/pdf-preview";
import { SendModal } from "@/components/send-modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface NarrativeSection {
  headline: string;
  narrative: string;
  highlight_metric: string;
}

interface NarrativeOutput {
  executive_summary: string;
  sections: {
    leads: NarrativeSection;
    appointments: NarrativeSection;
    pipeline: NarrativeSection;
    conversations: NarrativeSection;
    reviews: NarrativeSection;
  };
  recommendations: string[];
  closing_message: string;
}

interface ReportData {
  id: string;
  business_name: string;
  client_name: string;
  report_month: string;
  blob_url: string | null;
  narrative_json: string | null;
  raw_data_json: string | null;
  sent: number;
  sent_at: string | null;
  sent_to: string | null;
}

export default function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [report, setReport] = useState<ReportData | null>(null);
  const [narrative, setNarrative] = useState<NarrativeOutput | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [building, setBuilding] = useState(false);
  const [showSend, setShowSend] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    fetch(`/api/reports/${id}`)
      .then((r) => r.json())
      .then((data: ReportData) => {
        setReport(data);
        setBlobUrl(data.blob_url);
        setSent(data.sent === 1);
        if (data.narrative_json) {
          setNarrative(JSON.parse(data.narrative_json));
        }
      });
  }, [id]);

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const res = await fetch(`/api/reports/${id}/regenerate`, { method: "POST" });
      const data = await res.json();
      setNarrative(data.narrative);
      setBlobUrl(null);
    } finally {
      setRegenerating(false);
    }
  };

  const handleBuildPdf = async () => {
    if (!narrative) return;
    setBuilding(true);
    try {
      const res = await fetch("/api/reports/build-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report_id: id, narrative }),
      });
      const data = await res.json();
      setBlobUrl(data.blob_url);
    } finally {
      setBuilding(false);
    }
  };

  if (!report || !narrative) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading report...</p>
      </div>
    );
  }

  const rawData = report.raw_data_json ? JSON.parse(report.raw_data_json) : {};

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{report.business_name}</h1>
          <p className="text-muted-foreground">{rawData.period_label ?? report.report_month}</p>
        </div>
        <div className="flex items-center gap-3">
          {sent ? (
            <Badge className="bg-green-600 text-white">
              Sent {report.sent_at ? new Date(report.sent_at).toLocaleDateString() : ""}
            </Badge>
          ) : blobUrl ? (
            <>
              <Button variant="outline" className="border-white/20 text-white hover:bg-white/10" asChild>
                <a href={`/api/reports/${id}/download`}>Download PDF</a>
              </Button>
              <Button onClick={() => setShowSend(true)} className="bg-vo360-orange hover:bg-vo360-orange/90 text-white">
                Send via Email
              </Button>
            </>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <NarrativeEditor
            narrative={narrative}
            onChange={setNarrative}
            onRegenerate={handleRegenerate}
            onBuildPdf={handleBuildPdf}
            regenerating={regenerating}
            building={building}
          />
        </div>
        <div className="lg:sticky lg:top-20 lg:self-start">
          <PdfPreview blobUrl={blobUrl} />
        </div>
      </div>

      <SendModal
        open={showSend}
        onClose={() => setShowSend(false)}
        reportId={id}
        defaultEmail=""
        defaultSubject={`Your ${rawData.period_label ?? report.report_month} Growth Report — ${report.business_name}`}
        defaultMessage={`Hi ${report.client_name},\n\nHere's your monthly growth report for ${rawData.period_label ?? report.report_month}. Great progress!\n\nBest,\nVO360 Team`}
        onSent={() => setSent(true)}
      />
    </div>
  );
}
