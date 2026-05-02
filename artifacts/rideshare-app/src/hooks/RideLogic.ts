import { useCallback, useReducer } from "react";

export type RideStatus =
  | "idle"
  | "searching"
  | "negotiating"
  | "active"
  | "completed";

type Transition =
  | { type: "START_SEARCH" }
  | { type: "DRIVER_FOUND" }
  | { type: "ACCEPT_BID" }
  | { type: "FINISH_RIDE" }
  | { type: "RESET" };

const NEXT_STATE: Record<RideStatus, Partial<Record<Transition["type"], RideStatus>>> = {
  idle: { START_SEARCH: "searching" },
  searching: { DRIVER_FOUND: "negotiating", RESET: "idle" },
  negotiating: { ACCEPT_BID: "active", RESET: "idle" },
  active: { FINISH_RIDE: "completed" },
  completed: { RESET: "idle" },
};

function reducer(state: RideStatus, action: Transition): RideStatus {
  if (action.type === "RESET") return "idle";
  const next = NEXT_STATE[state][action.type];
  if (!next) {
    if (typeof console !== "undefined") {
      console.warn(
        `[useRideStatus] Invalid transition "${action.type}" from "${state}" — ignored.`,
      );
    }
    return state;
  }
  return next;
}

interface UseRideStatusResult {
  status: RideStatus;
  isIdle: boolean;
  isSearching: boolean;
  isNegotiating: boolean;
  isActive: boolean;
  isCompleted: boolean;
  startSearch: () => void;
  driverFound: () => void;
  acceptBid: () => void;
  finishRide: () => void;
  reset: () => void;
}

export function useRideStatus(initial: RideStatus = "idle"): UseRideStatusResult {
  const [status, dispatch] = useReducer(reducer, initial);

  const startSearch = useCallback(() => dispatch({ type: "START_SEARCH" }), []);
  const driverFound = useCallback(() => dispatch({ type: "DRIVER_FOUND" }), []);
  const acceptBid = useCallback(() => dispatch({ type: "ACCEPT_BID" }), []);
  const finishRide = useCallback(() => dispatch({ type: "FINISH_RIDE" }), []);
  const reset = useCallback(() => dispatch({ type: "RESET" }), []);

  return {
    status,
    isIdle: status === "idle",
    isSearching: status === "searching",
    isNegotiating: status === "negotiating",
    isActive: status === "active",
    isCompleted: status === "completed",
    startSearch,
    driverFound,
    acceptBid,
    finishRide,
    reset,
  };
}
