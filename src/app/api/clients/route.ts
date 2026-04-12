import { NextResponse } from "next/server";
import { getClients } from "@/lib/clients";

export async function GET() {
  const clients = getClients();
  return NextResponse.json(clients);
}
