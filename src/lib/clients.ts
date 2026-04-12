export interface ClientProfile {
  id: string;
  business_name: string;
  location_id: string;
  niche: string;
  contact_name: string;
  contact_email: string;
  months_active: number;
  start_month: string;
}

export const MOCK_CLIENTS: ClientProfile[] = [
  { id: "client_acme", business_name: "Acme Plumbing", location_id: "client_acme", niche: "plumbing", contact_name: "John Smith", contact_email: "john@acmeplumbing.com", months_active: 3, start_month: "2026-01" },
  { id: "client_bright", business_name: "Bright Electric", location_id: "client_bright", niche: "electrical", contact_name: "Sarah Chen", contact_email: "sarah@brightelectric.com", months_active: 2, start_month: "2026-02" },
  { id: "client_clean", business_name: "Clean Sweep Services", location_id: "client_clean", niche: "cleaning", contact_name: "Maria Garcia", contact_email: "maria@cleansweep.com", months_active: 1, start_month: "2026-03" },
  { id: "client_delta", business_name: "Delta HVAC", location_id: "client_delta", niche: "hvac", contact_name: "Mike Johnson", contact_email: "mike@deltahvac.com", months_active: 4, start_month: "2025-12" },
  { id: "client_eagle", business_name: "Eagle Roofing", location_id: "client_eagle", niche: "roofing", contact_name: "Tom Williams", contact_email: "tom@eagleroofing.com", months_active: 2, start_month: "2026-02" },
];

export function getClients(): ClientProfile[] {
  return MOCK_CLIENTS;
}

export function getClientById(id: string): ClientProfile | undefined {
  return MOCK_CLIENTS.find((c) => c.id === id);
}
