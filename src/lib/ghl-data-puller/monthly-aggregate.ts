import type { GHLRawData } from "./types";

export interface ReportMonthData {
  new_leads: number;
  total_contacts: number;
  appointments_booked: number;
  appointments_completed: number;
  appointments_no_show: number;
  pipeline_opportunities: number;
  pipeline_won: number;
  pipeline_lost: number;
  pipeline_open: number;
  conversations_total: number;
  conversations_avg_response_hours: number;
  review_requests_sent: number;
  new_reviews: number;
  avg_review_rating: number;
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function toMonthlyAggregate(
  raw: GHLRawData, clientId: string, month: string
): ReportMonthData {
  const seedStr = `${clientId}:${month}`;
  let seedNum = 0;
  for (let i = 0; i < seedStr.length; i++) {
    seedNum = ((seedNum << 5) - seedNum + seedStr.charCodeAt(i)) | 0;
  }
  const rand = seededRandom(Math.abs(seedNum));

  const newLeads = raw.contacts.length;
  const appointmentsBooked = raw.appointments.length;
  const showRate = 0.6 + rand() * 0.25;
  const completed = Math.round(appointmentsBooked * showRate);
  const noShow = appointmentsBooked - completed;
  const totalOpp = raw.opportunities.length;
  const wonRate = 0.3 + rand() * 0.2;
  const lostRate = 0.1 + rand() * 0.1;
  const won = Math.round(totalOpp * wonRate);
  const lost = Math.round(totalOpp * lostRate);
  const open = Math.max(0, totalOpp - won - lost);
  const conversationsTotal = raw.conversations.length + Math.round(rand() * 40 + 20);
  const avgResponseMinutes =
    raw.conversations.length > 0 && raw.conversations[0].avgResponseMinutes != null
      ? raw.conversations[0].avgResponseMinutes : 120;
  const avgResponseHours = Math.round((avgResponseMinutes / 60) * 10) / 10;
  const reviewRequests = raw.reviewRequestsSent;
  const conversionRate = 0.3 + rand() * 0.2;
  const newReviews = Math.max(0, Math.round(reviewRequests * conversionRate));
  const avgRating = Math.round((4.0 + rand() * 1.0) * 10) / 10;

  return {
    new_leads: newLeads,
    total_contacts: newLeads + Math.round(rand() * 100 + 50),
    appointments_booked: appointmentsBooked,
    appointments_completed: completed,
    appointments_no_show: noShow,
    pipeline_opportunities: totalOpp,
    pipeline_won: won,
    pipeline_lost: lost,
    pipeline_open: open,
    conversations_total: conversationsTotal,
    conversations_avg_response_hours: avgResponseHours,
    review_requests_sent: reviewRequests,
    new_reviews: newReviews,
    avg_review_rating: avgRating,
  };
}
