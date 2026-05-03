import { useEffect, useMemo, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import type { ServiceType } from "@/lib/api";

export interface Ride {
  id: string;
  rider_id: string;
  pickup: string;
  dropoff: string;
  initial_offer: number;
  service_type: ServiceType;
  status: string;
  created_at: string;
}

interface UseRealtimeRidesOptions {
  /**
   * Restrict the feed to rides whose `service_type` is in this set.
   * Pass the categories the driver's vehicle can serve. Omit / pass an
   * empty array to receive all categories (default behaviour).
   *
   * Note: filtering happens both in the initial fetch (server-side via
   * `.in()`) AND in the realtime stream (client-side, since postgres_changes
   * can't bind a column-value filter without RLS gymnastics). Both paths
   * apply the same predicate for consistency.
   */
  serviceTypes?: ServiceType[];
}

interface UseRealtimeRidesResult {
  rides: Ride[];
  loading: boolean;
  error: Error | null;
}

export function useRealtimeRides(
  options: UseRealtimeRidesOptions = {},
): UseRealtimeRidesResult {
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // Stabilise the filter array so a parent passing a new literal each
  // render doesn't tear down the realtime channel every time.
  const serviceTypesKey = useMemo(
    () => (options.serviceTypes ?? []).slice().sort().join(","),
    [options.serviceTypes],
  );

  useEffect(() => {
    let cancelled = false;
    let channel: RealtimeChannel | null = null;

    const filter = serviceTypesKey
      ? (serviceTypesKey.split(",") as ServiceType[])
      : null;

    const matchesFilter = (r: Ride): boolean =>
      filter === null || filter.includes(r.service_type);

    const load = async () => {
      let query = supabase
        .from("rides")
        .select("*")
        .eq("status", "open")
        .order("created_at", { ascending: false });

      if (filter !== null) {
        query = query.in("service_type", filter);
      }

      const { data, error: fetchError } = await query;

      if (cancelled) return;

      if (fetchError) {
        setError(new Error(fetchError.message));
        setLoading(false);
        return;
      }

      setRides((data ?? []) as Ride[]);
      setLoading(false);
    };

    load();

    channel = supabase
      .channel("rides-open-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "rides" },
        (payload) => {
          const next = payload.new as Ride;
          if (next.status !== "open") return;
          if (!matchesFilter(next)) return;
          setRides((prev) => {
            if (prev.some((r) => r.id === next.id)) return prev;
            return [next, ...prev];
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rides" },
        (payload) => {
          const next = payload.new as Ride;
          setRides((prev) => {
            const without = prev.filter((r) => r.id !== next.id);
            if (next.status === "open" && matchesFilter(next)) {
              return [next, ...without];
            }
            return without;
          });
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [serviceTypesKey]);

  return { rides, loading, error };
}
