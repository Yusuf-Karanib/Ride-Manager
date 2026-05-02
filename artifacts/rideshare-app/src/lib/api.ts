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

export interface BannedDevice {
  device_id: string;
  reason: string | null;
  created_at: string;
}

export async function fetchActiveReports(): Promise<Report[]> {
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as Report[];
}

export async function fetchBannedDevices(): Promise<BannedDevice[]> {
  const { data, error } = await supabase
    .from("banned_devices")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as BannedDevice[];
}

export async function banDevice(
  deviceId: string,
  reason?: string,
): Promise<BannedDevice> {
  const { data, error } = await supabase
    .from("banned_devices")
    .upsert(
      { device_id: deviceId, reason: reason ?? null },
      { onConflict: "device_id" },
    )
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as BannedDevice;
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

export type RatingTarget = "rider" | "driver";

export interface RatingInput {
  ride_id: string;
  rated_user_id: string;
  rater_role: RatingTarget;
  stars: number;
  comment?: string;
}

export interface RatingResult {
  ride_id: string;
  rated_user_id: string;
  stars: number;
  comment: string;
  submitted_at: string;
}

export async function submitRating(input: RatingInput): Promise<RatingResult> {
  const stars = Math.max(1, Math.min(5, Math.round(input.stars)));
  const comment = (input.comment ?? "").trim();
  const column =
    input.rater_role === "rider" ? "driver_rating" : "rider_rating";

  console.log("[submitRating] mock update", {
    ride_id: input.ride_id,
    rated_user_id: input.rated_user_id,
    column,
    stars,
    comment,
  });

  try {
    await supabase
      .from("rides")
      .update({ [column]: stars })
      .eq("id", input.ride_id);
  } catch (err) {
    console.warn("[submitRating] supabase update skipped:", err);
  }

  return {
    ride_id: input.ride_id,
    rated_user_id: input.rated_user_id,
    stars,
    comment,
    submitted_at: new Date().toISOString(),
  };
}
