export interface DateRange {
  from: string;
  to: string;
}

export interface Contact {
  id: string;
  dateAdded: string;
  tags: string[];
  source?: string;
}

export interface Opportunity {
  id: string;
  pipelineId: string;
  stageId: string;
  stageChangedAt: string;
  status: "open" | "won" | "lost" | "abandoned";
  monetaryValue: number;
  dateAdded: string;
}

export interface Conversation {
  id: string;
  contactId: string;
  lastInboundAt: string | null;
  lastOutboundAt: string | null;
  avgResponseMinutes: number | null;
}

export interface Appointment {
  id: string;
  startTime: string;
  status: "booked" | "showed" | "no-show" | "cancelled";
  contactId: string;
}

export interface GHLRawData {
  contacts: Contact[];
  opportunities: Opportunity[];
  conversations: Conversation[];
  appointments: Appointment[];
  reviewRequestsSent: number;
  metadata: {
    locationId: string;
    pulledAt: string;
    dateRange: DateRange;
  };
}

export interface GHLPuller {
  pullAll(locationId: string, dateRange: DateRange): Promise<GHLRawData>;
}
