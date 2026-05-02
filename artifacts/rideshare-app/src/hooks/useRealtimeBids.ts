import { useEffect, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

export interface Bid {
  id: string;
  ride_id: string;
  driver_id: string;
  amount: number;
  status: string;
  created_at: string;
}

interface UseRealtimeBidsResult {
  bids: Bid[];
  loading: boolean;
  error: Error | null;
}

export function useRealtimeBids(rideId: string | null | undefined): UseRealtimeBidsResult {
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState<boolean>(Boolean(rideId));
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!rideId) {
      setBids([]);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    let channel: RealtimeChannel | null = null;

    setLoading(true);
    setError(null);

    const load = async () => {
      const { data, error: fetchError } = await supabase
        .from("bids")
        .select("*")
        .eq("ride_id", rideId)
        .order("created_at", { ascending: true });

      if (cancelled) return;

      if (fetchError) {
        setError(new Error(fetchError.message));
        setLoading(false);
        return;
      }

      setBids((data ?? []) as Bid[]);
      setLoading(false);
    };

    load();

    channel = supabase
      .channel(`bids-ride-${rideId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "bids",
          filter: `ride_id=eq.${rideId}`,
        },
        (payload) => {
          const next = payload.new as Bid;
          setBids((prev) => {
            if (prev.some((b) => b.id === next.id)) return prev;
            return [...prev, next];
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
  }, [rideId]);

  return { bids, loading, error };
}
