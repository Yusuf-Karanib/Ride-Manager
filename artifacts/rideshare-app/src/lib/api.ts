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

export interface Promotion {
  code: string;
  description: string | null;
  discount_amount: number;
  min_offer: number;
  max_uses: number | null;
  uses_count: number;
  active: boolean;
  valid_from: string | null;
  valid_to: string | null;
}

export type PromoValidation =
  | {
      valid: true;
      promotion: Promotion;
      discountAmount: number;
      adjustedOffer: number;
    }
  | { valid: false; reason: string };

/**
 * Look up a promo code and check it against the rider's current base offer.
 *
 * Note (cash-only architecture): the discount is applied to the rider's
 * *initial offer* — drivers may still counter. There is no platform
 * reimbursement mechanism, so this is a starting-price nudge, not a
 * guaranteed price cut. See PromoCode.tsx for the UI disclosure.
 */
export async function validatePromoCode(
  rawCode: string,
  baseOffer: number,
): Promise<PromoValidation> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { valid: false, reason: "Enter a code." };
  if (!Number.isFinite(baseOffer) || baseOffer <= 0)
    return { valid: false, reason: "Enter your offer first." };

  const { data, error } = await supabase
    .from("promotions")
    .select("*")
    .eq("code", code)
    .maybeSingle();

  if (error) return { valid: false, reason: error.message };
  if (!data) return { valid: false, reason: "Code not found." };

  const promo = data as Promotion;

  if (!promo.active)
    return { valid: false, reason: "This code is no longer active." };

  const now = Date.now();
  if (promo.valid_from && new Date(promo.valid_from).getTime() > now)
    return { valid: false, reason: "This code isn't active yet." };
  if (promo.valid_to && new Date(promo.valid_to).getTime() < now)
    return { valid: false, reason: "This code has expired." };

  if (
    typeof promo.max_uses === "number" &&
    promo.uses_count >= promo.max_uses
  )
    return { valid: false, reason: "This code has been fully redeemed." };

  if (baseOffer < promo.min_offer)
    return {
      valid: false,
      reason: `Minimum offer for this code is ${promo.min_offer.toLocaleString("en-US")} SYP.`,
    };

  // Don't let the discount drive the offer to zero or negative.
  const discountAmount = Math.min(promo.discount_amount, baseOffer - 500);
  if (discountAmount <= 0)
    return { valid: false, reason: "Offer is too low for this code." };

  return {
    valid: true,
    promotion: promo,
    discountAmount,
    adjustedOffer: baseOffer - discountAmount,
  };
}

/**
 * Carpool / shared-ride limits.
 *
 * Enforcement note: this constant is the source of truth, but the actual
 * cap must be checked at the bid-acceptance call site (count active shared
 * rides via `countDriverActiveSharedRides`, refuse acceptance if >= MAX).
 * Putting the check inside the toggle UI would only stop honest clients.
 */
export const MAX_CONCURRENT_SHARED_RIDES = 3;

/**
 * Count the rides that a given driver currently has accepted AND that are
 * shared AND still in flight. Used by the accept flow to enforce
 * `MAX_CONCURRENT_SHARED_RIDES`.
 *
 * Implementation: a ride is "owned" by a driver via an accepted bid.
 * "In flight" means the ride status is 'matched' or 'active'.
 */
export async function countDriverActiveSharedRides(
  driverId: string,
): Promise<number> {
  const { data, error } = await supabase
    .from("bids")
    .select("ride:rides!inner(id, is_shared, status)", { count: "exact" })
    .eq("driver_id", driverId)
    .eq("status", "accepted")
    .eq("ride.is_shared", true)
    .in("ride.status", ["matched", "active"]);

  if (error) throw new Error(error.message);
  return data?.length ?? 0;
}

/* -------------------------------------------------------------------------- */
/* Driver onboarding                                                          */
/* -------------------------------------------------------------------------- */

export const DRIVER_DOCS_BUCKET = "driver-docs";

export type DriverDocType =
  | "national_id"
  | "drivers_license"
  | "vehicle_photo";

export interface DriverProfile {
  user_id: string;
  full_name: string;
  phone: string;
  national_id_url: string | null;
  drivers_license_url: string | null;
  vehicle_photo_url: string | null;
  status: "pending_review" | "approved" | "rejected";
  review_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface NewDriverApplicationInput {
  user_id: string;
  full_name: string;
  phone: string;
  national_id_url: string;
  drivers_license_url: string;
  vehicle_photo_url: string;
}

function fileExtensionFor(file: File): string {
  const parts = file.name.split(".");
  if (parts.length > 1) {
    const ext = parts.pop();
    if (ext && /^[a-zA-Z0-9]{1,8}$/.test(ext)) return ext.toLowerCase();
  }
  // Fallback from MIME.
  const mime = file.type.toLowerCase();
  if (mime.includes("png")) return "png";
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("pdf")) return "pdf";
  return "bin";
}

/** Upload a single driver document. Returns the storage path (not a URL). */
export async function uploadDriverDoc(
  userId: string,
  docType: DriverDocType,
  file: File,
): Promise<string> {
  const ext = fileExtensionFor(file);
  const path = `${userId}/${docType}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from(DRIVER_DOCS_BUCKET)
    .upload(path, file, {
      contentType: file.type || undefined,
      upsert: true,
      cacheControl: "3600",
    });
  if (error) throw new Error(error.message);
  return path;
}

/**
 * Insert (or update) the driver_profiles row for a user with the uploaded
 * document paths. Status is set to 'pending_review' on every submission so
 * re-submitting after a rejection puts the application back in review.
 */
export async function submitDriverApplication(
  input: NewDriverApplicationInput,
): Promise<DriverProfile> {
  const { data, error } = await supabase
    .from("driver_profiles")
    .upsert(
      {
        ...input,
        status: "pending_review",
        review_notes: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    )
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as DriverProfile;
}

export async function fetchDriverProfile(
  userId: string,
): Promise<DriverProfile | null> {
  const { data, error } = await supabase
    .from("driver_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data ?? null) as DriverProfile | null;
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
