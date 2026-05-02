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

export interface ScheduledRide {
  id: string;
  rider_id: string;
  pickup: string;
  dropoff: string;
  initial_offer: number;
  scheduled_at: string;
  notes: string | null;
  status: "pending" | "promoted" | "cancelled" | "expired";
  promoted_ride_id: string | null;
  created_at: string;
}

export interface NewScheduledRideInput {
  rider_id: string;
  pickup: string;
  dropoff: string;
  initial_offer: number;
  scheduled_at: string; // ISO timestamp
  notes?: string;
}

export async function scheduleRide(
  input: NewScheduledRideInput,
): Promise<ScheduledRide> {
  const { data, error } = await supabase
    .from("scheduled_rides")
    .insert(input)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as ScheduledRide;
}

export async function fetchMyScheduledRides(
  riderId: string,
): Promise<ScheduledRide[]> {
  const { data, error } = await supabase
    .from("scheduled_rides")
    .select("*")
    .eq("rider_id", riderId)
    .in("status", ["pending", "promoted"])
    .order("scheduled_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as ScheduledRide[];
}

export async function cancelScheduledRide(id: string): Promise<void> {
  const { error } = await supabase
    .from("scheduled_rides")
    .update({ status: "cancelled" })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

/**
 * Driver-side helper. When pg_cron isn't installed, the driver feed should
 * merge these into the open-rides list itself — they represent rides whose
 * scheduled time is within the next 30 minutes.
 */
export async function fetchUpcomingScheduledRides(
  windowMinutes: number = 30,
): Promise<ScheduledRide[]> {
  const horizon = new Date(Date.now() + windowMinutes * 60_000).toISOString();
  const { data, error } = await supabase
    .from("scheduled_rides")
    .select("*")
    .eq("status", "pending")
    .lte("scheduled_at", horizon)
    .gte("scheduled_at", new Date(Date.now() - 5 * 60_000).toISOString())
    .order("scheduled_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as ScheduledRide[];
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
