import type { ReportMonthData } from "../ghl-data-puller/monthly-aggregate";

export interface NarrativeInput {
  client: {
    business_name: string;
    niche: string;
    contact_name: string;
  };
  period: {
    month: string;
    year: number;
    label: string;
  };
  current_month: ReportMonthData;
  previous_month: ReportMonthData | null;
  is_first_month: boolean;
}

export interface NarrativeSection {
  headline: string;
  narrative: string;
  highlight_metric: string;
}

export interface NarrativeOutput {
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
