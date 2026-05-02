import { useEffect, useRef, useState } from "react";

type Status = "online" | "offline" | "restored";

const RESTORED_DURATION_MS = 3000;

function getInitialOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine;
}

export default function ConnectivityMonitor() {
  const [status, setStatus] = useState<Status>(
    getInitialOnline() ? "online" : "offline",
  );
  const restoredTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const clearRestoredTimer = () => {
      if (restoredTimerRef.current !== null) {
        window.clearTimeout(restoredTimerRef.current);
        restoredTimerRef.current = null;
      }
    };

    const handleOffline = () => {
      clearRestoredTimer();
      setStatus("offline");
    };

    const handleOnline = () => {
      clearRestoredTimer();
      setStatus("restored");
      restoredTimerRef.current = window.setTimeout(() => {
        setStatus("online");
        restoredTimerRef.current = null;
      }, RESTORED_DURATION_MS);
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
      clearRestoredTimer();
    };
  }, []);

  if (status === "online") return null;

  const isOffline = status === "offline";

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed top-0 left-0 right-0 z-[2500] border-b-2 border-black px-4 py-2 text-center text-sm font-bold uppercase tracking-wider ${
        isOffline ? "bg-red-600 text-white" : "bg-green-600 text-white"
      }`}
    >
      {isOffline ? "No Connection — Check Data" : "Connected"}
    </div>
  );
}
