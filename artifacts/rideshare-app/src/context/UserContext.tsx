import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type UserType = "rider" | "driver" | null;

export interface Vehicle {
  carModel: string;
  color: string;
  licensePlate: string;
}

interface UserContextValue {
  userType: UserType;
  deviceId: string;
  vehicle: Vehicle | null;
  setVehicle: (vehicle: Vehicle) => void;
  clearVehicle: () => void;
  loginAsRider: () => void;
  loginAsDriver: () => void;
  logout: () => void;
}

const UserContext = createContext<UserContextValue | undefined>(undefined);

const DEVICE_ID_KEY = "mock_device_id";
const VEHICLE_KEY = "driver_vehicle";

function generateDeviceId(): string {
  if (typeof window === "undefined") return "";
  const existing = localStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `dev-${Math.random().toString(36).slice(2)}-${Date.now()}`;
  localStorage.setItem(DEVICE_ID_KEY, id);
  return id;
}

function loadStoredVehicle(): Vehicle | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(VEHICLE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Vehicle>;
    if (
      typeof parsed.carModel === "string" &&
      typeof parsed.color === "string" &&
      typeof parsed.licensePlate === "string"
    ) {
      return {
        carModel: parsed.carModel,
        color: parsed.color,
        licensePlate: parsed.licensePlate,
      };
    }
    return null;
  } catch {
    return null;
  }
}

interface UserProviderProps {
  children: ReactNode;
}

export function UserProvider({ children }: UserProviderProps) {
  const [userType, setUserType] = useState<UserType>(null);
  const [deviceId, setDeviceId] = useState<string>("");
  const [vehicle, setVehicleState] = useState<Vehicle | null>(null);

  useEffect(() => {
    setDeviceId(generateDeviceId());
    setVehicleState(loadStoredVehicle());
  }, []);

  const setVehicle = useCallback((v: Vehicle) => {
    setVehicleState(v);
    try {
      localStorage.setItem(VEHICLE_KEY, JSON.stringify(v));
    } catch {
      // ignore quota / private mode failures
    }
  }, []);

  const clearVehicle = useCallback(() => {
    setVehicleState(null);
    try {
      localStorage.removeItem(VEHICLE_KEY);
    } catch {
      // ignore
    }
  }, []);

  const value = useMemo<UserContextValue>(
    () => ({
      userType,
      deviceId,
      vehicle,
      setVehicle,
      clearVehicle,
      loginAsRider: () => setUserType("rider"),
      loginAsDriver: () => setUserType("driver"),
      logout: () => setUserType(null),
    }),
    [userType, deviceId, vehicle, setVehicle, clearVehicle],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return ctx;
}
