"use client";

import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

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

const SECTION_LABELS: Record<string, string> = {
  leads: "Lead Generation",
  appointments: "Appointments",
  pipeline: "Sales Pipeline",
  conversations: "Conversations",
  reviews: "Reviews & Reputation",
};

interface Props {
  narrative: NarrativeOutput;
  onChange: (updated: NarrativeOutput) => void;
  onRegenerate: () => void;
  onBuildPdf: () => void;
  regenerating: boolean;
  building: boolean;
}

export function NarrativeEditor({ narrative, onChange, onRegenerate, onBuildPdf, regenerating, building }: Props) {
  const updateSection = (
    key: keyof NarrativeOutput["sections"],
    field: "headline" | "narrative" | "highlight_metric",
    value: string
  ) => {
    onChange({
      ...narrative,
      sections: { ...narrative.sections, [key]: { ...narrative.sections[key], [field]: value } },
    });
  };

  const updateRecommendation = (index: number, value: string) => {
    const recs = [...narrative.recommendations];
    recs[index] = value;
    onChange({ ...narrative, recommendations: recs });
  };

  return (
    <div className="space-y-6">
      <div>
        <Label className="text-white text-sm font-medium">Executive Summary</Label>
        <Textarea
          value={narrative.executive_summary}
          onChange={(e) => onChange({ ...narrative, executive_summary: e.target.value })}
          className="mt-1 glass-card border-white/10 text-white min-h-[100px]"
        />
      </div>

      {(Object.keys(SECTION_LABELS) as Array<keyof NarrativeOutput["sections"]>).map((key) => (
        <div key={key} className="space-y-2 border-t border-white/10 pt-4">
          <Label className="text-vo360-orange text-sm font-medium">{SECTION_LABELS[key]}</Label>
          <Input
            value={narrative.sections[key].headline}
            onChange={(e) => updateSection(key, "headline", e.target.value)}
            placeholder="Headline"
            className="glass-card border-white/10 text-white"
          />
          <Textarea
            value={narrative.sections[key].narrative}
            onChange={(e) => updateSection(key, "narrative", e.target.value)}
            placeholder="Narrative"
            className="glass-card border-white/10 text-white min-h-[80px]"
          />
          <Input
            value={narrative.sections[key].highlight_metric}
            onChange={(e) => updateSection(key, "highlight_metric", e.target.value)}
            placeholder="Highlight metric"
            className="glass-card border-white/10 text-white"
          />
        </div>
      ))}

      <div className="border-t border-white/10 pt-4">
        <Label className="text-white text-sm font-medium">Recommendations</Label>
        {narrative.recommendations.map((rec, i) => (
          <Textarea
            key={i}
            value={rec}
            onChange={(e) => updateRecommendation(i, e.target.value)}
            className="mt-2 glass-card border-white/10 text-white min-h-[60px]"
          />
        ))}
      </div>

      <div className="border-t border-white/10 pt-4">
        <Label className="text-white text-sm font-medium">Closing Message</Label>
        <Textarea
          value={narrative.closing_message}
          onChange={(e) => onChange({ ...narrative, closing_message: e.target.value })}
          className="mt-1 glass-card border-white/10 text-white min-h-[80px]"
        />
      </div>

      <div className="flex gap-3 pt-4">
        <Button
          onClick={onRegenerate}
          disabled={regenerating || building}
          variant="outline"
          className="border-white/20 text-white hover:bg-white/10"
        >
          {regenerating ? "Regenerating..." : "Regenerate"}
        </Button>
        <Button
          onClick={onBuildPdf}
          disabled={regenerating || building}
          className="bg-vo360-orange hover:bg-vo360-orange/90 text-white font-bold flex-1"
        >
          {building ? "Building PDF..." : "Build PDF"}
        </Button>
      </div>
    </div>
  );
}
