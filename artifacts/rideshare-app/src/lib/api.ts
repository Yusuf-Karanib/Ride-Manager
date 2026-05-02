import { supabase } from "@/lib/supabaseClient";
import type { Ride } from "@/hooks/useRealtimeRides";
import type { Bid } from "@/hooks/useRealtimeBids";

export interface Report {
  id: string;
  ride_id: string;
  reporter_id: string;
  reported_id: string;
  reason: string;
  created_at: string;
}

export interface NewRideInput {
  rider_id: string;
  pickup: string;
  dropoff: string;
  initial_offer: number;
  status?: string;
}

export interface NewBidInput {
  ride_id: string;
  driver_id: string;
  amount: number;
  status?: string;
}

export interface NewReportInput {
  ride_id: string;
  reporter_id: string;
  reported_id: string;
  reason: string;
}

export async function createRide(input: NewRideInput): Promise<Ride> {
  const { data, error } = await supabase
    .from("rides")
    .insert({ status: "open", ...input })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Ride;
}

export async function createBid(input: NewBidInput): Promise<Bid> {
  const { data, error } = await supabase
    .from("bids")
    .insert({ status: "pending", ...input })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Bid;
}

export async function acceptBid(bidId: string): Promise<Bid> {
  const { data, error } = await supabase
    .from("bids")
    .update({ status: "accepted" })
    .eq("id", bidId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Bid;
}

export async function createReport(input: NewReportInput): Promise<Report> {
  const { data, error } = await supabase
    .from("reports")
    .insert(input)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Report;
}
