import { useEffect, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

export interface Ride {
  id: string;
  rider_id: string;
  pickup: string;
  dropoff: string;
  initial_offer: number;
  status: string;
  created_at: string;
}

interface UseRealtimeRidesResult {
  rides: Ride[];
  loading: boolean;
  error: Error | null;
}

export function useRealtimeRides(): UseRealtimeRidesResult {
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    let channel: RealtimeChannel | null = null;

    const load = async () => {
      const { data, error: fetchError } = await supabase
        .from("rides")
        .select("*")
        .eq("status", "open")
        .order("created_at", { ascending: false });

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
            if (next.status === "open") {
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
  }, []);

  return { rides, loading, error };
}
