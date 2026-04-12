import { readFileSync } from "node:fs";
import { join } from "node:path";
import type {
  GHLPuller, GHLRawData, DateRange, Contact, Opportunity, Conversation, Appointment,
} from "./types";

interface FixtureJson {
  niche: string;
  contactsDaysAgo: number[];
  opportunityStageMovesDaysAgo: number[];
  conversationLastInboundDaysAgo: number[];
  conversationLastOutboundDaysAgo: number[];
  avgResponseMinutes: number;
  appointmentStartDaysAgo: number[];
  reviewRequestsSent: number;
}

const daysAgoIso = (days: number): string => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
};

const FIXTURE_MAP: Record<string, string> = {
  client_acme: "acme-plumbing.json",
  client_bright: "bright-electric.json",
  client_clean: "clean-sweep.json",
  client_delta: "delta-hvac.json",
  client_eagle: "eagle-roofing.json",
};

function loadFixture(locationId: string): FixtureJson {
  const filename = FIXTURE_MAP[locationId];
  if (!filename) throw new Error(`No fixture for locationId ${locationId}`);
  const path = join(process.cwd(), "src/lib/ghl-data-puller/fixtures", filename);
  return JSON.parse(readFileSync(path, "utf8")) as FixtureJson;
}

export class MockPuller implements GHLPuller {
  async pullAll(locationId: string, dateRange: DateRange): Promise<GHLRawData> {
    const fx = loadFixture(locationId);
    const contacts: Contact[] = fx.contactsDaysAgo.map((d, i) => ({
      id: `contact_${locationId}_${i}`, dateAdded: daysAgoIso(d), tags: [],
    }));
    const opportunities: Opportunity[] = fx.opportunityStageMovesDaysAgo.map((d, i) => ({
      id: `opp_${locationId}_${i}`, pipelineId: "pipe_default",
      stageId: `stage_${(i % 4) + 1}`, stageChangedAt: daysAgoIso(d),
      status: "open" as const, monetaryValue: 500, dateAdded: daysAgoIso(d + 5),
    }));
    const convoCount = Math.max(fx.conversationLastInboundDaysAgo.length, fx.conversationLastOutboundDaysAgo.length);
    const conversations: Conversation[] = Array.from({ length: convoCount }, (_, i) => ({
      id: `conv_${locationId}_${i}`,
      contactId: contacts[i % Math.max(contacts.length, 1)]?.id ?? "c_unknown",
      lastInboundAt: fx.conversationLastInboundDaysAgo[i] != null ? daysAgoIso(fx.conversationLastInboundDaysAgo[i]) : null,
      lastOutboundAt: fx.conversationLastOutboundDaysAgo[i] != null ? daysAgoIso(fx.conversationLastOutboundDaysAgo[i]) : null,
      avgResponseMinutes: fx.avgResponseMinutes,
    }));
    const appointments: Appointment[] = fx.appointmentStartDaysAgo.map((d, i) => ({
      id: `appt_${locationId}_${i}`, startTime: daysAgoIso(d),
      status: "booked" as const,
      contactId: contacts[i % Math.max(contacts.length, 1)]?.id ?? "c_unknown",
    }));
    return {
      contacts, opportunities, conversations, appointments,
      reviewRequestsSent: fx.reviewRequestsSent,
      metadata: { locationId, pulledAt: new Date().toISOString(), dateRange },
    };
  }
}
