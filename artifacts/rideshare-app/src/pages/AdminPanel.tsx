import { useCallback, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useUser } from "@/context/UserContext";
import {
  banDevice,
  fetchActiveReports,
  fetchBannedDevices,
  type BannedDevice,
  type Report,
} from "@/lib/api";

type RowStatus =
  | { kind: "idle" }
  | { kind: "banning" }
  | { kind: "banned" }
  | { kind: "error"; message: string };

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function AdminPanel() {
  const { isAdmin, setAdmin } = useUser();
  const navigate = useNavigate();

  const [reports, setReports] = useState<Report[]>([]);
  const [bannedSet, setBannedSet] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rowStatus, setRowStatus] = useState<Record<string, RowStatus>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [reportRows, bannedRows] = await Promise.all([
        fetchActiveReports(),
        fetchBannedDevices(),
      ]);
      setReports(reportRows);
      setBannedSet(new Set(bannedRows.map((b: BannedDevice) => b.device_id)));
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    void load();
  }, [isAdmin, load]);

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const handleBan = async (report: Report) => {
    const offenderId = report.reported_id;
    setRowStatus((s) => ({ ...s, [report.id]: { kind: "banning" } }));
    try {
      await banDevice(offenderId, `report:${report.id}`);
      setBannedSet((prev) => {
        const next = new Set(prev);
        next.add(offenderId);
        return next;
      });
      setRowStatus((s) => ({ ...s, [report.id]: { kind: "banned" } }));
    } catch (err) {
      setRowStatus((s) => ({
        ...s,
        [report.id]: {
          kind: "error",
          message: err instanceof Error ? err.message : "Ban failed.",
        },
      }));
    }
  };

  return (
    <div className="min-h-screen bg-white text-black">
      <header className="border-b-2 border-black bg-black text-white px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <span className="bg-red-600 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border-2 border-white">
            Admin
          </span>
          <h1 className="text-lg font-bold uppercase tracking-wider">
            Reports Dashboard
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="px-3 py-1 text-xs font-bold uppercase tracking-wider bg-yellow-400 text-black border-2 border-yellow-400 hover:bg-yellow-300 disabled:opacity-60"
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
          <button
            type="button"
            onClick={() => {
              setAdmin(false);
              navigate("/", { replace: true });
            }}
            className="px-3 py-1 text-xs font-bold uppercase tracking-wider bg-white text-black border-2 border-white hover:bg-gray-200"
          >
            Exit Admin
          </button>
        </div>
      </header>

      <main className="p-4 max-w-5xl mx-auto">
        {loadError && (
          <div
            role="alert"
            className="mb-4 border-2 border-black bg-red-600 text-white px-3 py-2 text-sm font-bold"
          >
            {loadError}
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center text-sm font-bold uppercase tracking-wider text-black/60">
            Loading reports…
          </div>
        ) : reports.length === 0 ? (
          <div className="py-12 text-center border-2 border-black bg-yellow-100">
            <p className="text-sm font-bold uppercase tracking-wider text-black">
              No active reports
            </p>
          </div>
        ) : (
          <div className="border-2 border-black overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-black text-white">
                <tr>
                  <Th>When</Th>
                  <Th>Ride</Th>
                  <Th>Reporter</Th>
                  <Th>Offender</Th>
                  <Th>Reason</Th>
                  <Th>Action</Th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-black">
                {reports.map((r) => {
                  const isBanned =
                    bannedSet.has(r.reported_id) ||
                    rowStatus[r.id]?.kind === "banned";
                  const status = rowStatus[r.id] ?? { kind: "idle" as const };
                  return (
                    <tr key={r.id} className="hover:bg-yellow-100">
                      <Td className="whitespace-nowrap text-xs font-mono">
                        {formatTimestamp(r.created_at)}
                      </Td>
                      <Td className="font-mono text-xs">
                        {r.ride_id.slice(0, 8)}…
                      </Td>
                      <Td className="font-mono text-xs">
                        {r.reporter_id.slice(0, 8)}…
                      </Td>
                      <Td className="font-mono text-xs font-bold">
                        {r.reported_id.slice(0, 8)}…
                      </Td>
                      <Td>{r.reason}</Td>
                      <Td>
                        {isBanned ? (
                          <span className="inline-block px-2 py-1 text-[11px] font-bold uppercase tracking-wider bg-red-600 text-white border-2 border-red-700">
                            Banned
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void handleBan(r)}
                            disabled={status.kind === "banning"}
                            className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider bg-red-600 text-white border-2 border-black hover:bg-red-700 disabled:opacity-60"
                          >
                            {status.kind === "banning"
                              ? "Banning…"
                              : "Ban Device"}
                          </button>
                        )}
                        {status.kind === "error" && (
                          <p className="mt-1 text-[10px] font-bold text-red-700">
                            {status.message}
                          </p>
                        )}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-6 text-[11px] text-black/50 font-mono">
          Banning writes to <code>banned_devices</code> with{" "}
          <code>device_id = reported_id</code>.
        </p>
      </main>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-left px-3 py-2 text-[11px] font-bold uppercase tracking-wider border-r-2 border-white last:border-r-0">
      {children}
    </th>
  );
}

function Td({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <td
      className={`px-3 py-2 align-top border-r-2 border-black last:border-r-0 ${
        className ?? ""
      }`}
    >
      {children}
    </td>
  );
}
