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

export interface UserProfile {
  name: string;
  phone: string;
  email: string;
  /** Base64 data URL. Downscaled client-side; see `UserProfile.tsx`. */
  avatarDataUrl: string | null;
  /** ISO timestamp of the last `saveProfile` call. */
  updatedAt: string | null;
}

interface UserContextValue {
  userType: UserType;
  deviceId: string;
  vehicle: Vehicle | null;
  isAdmin: boolean;
  profile: UserProfile;
  setVehicle: (vehicle: Vehicle) => void;
  clearVehicle: () => void;
  setAdmin: (value: boolean) => void;
  /**
   * Mock Supabase-shaped update. Returns a Promise (with simulated latency
   * and a small failure chance disabled by default) so the UI exercises its
   * loading/error paths. Swap the body for `supabase.from('user_profiles')
   * .update(...).eq('id', deviceId)` once a profiles table exists.
   */
  saveProfile: (updates: Partial<UserProfile>) => Promise<UserProfile>;
  loginAsRider: () => void;
  loginAsDriver: () => void;
  logout: () => void;
}

const UserContext = createContext<UserContextValue | undefined>(undefined);

const DEVICE_ID_KEY = "mock_device_id";
const VEHICLE_KEY = "driver_vehicle";
const ADMIN_KEY = "is_admin";
const PROFILE_KEY = "user_profile";

const EMPTY_PROFILE: UserProfile = {
  name: "",
  phone: "",
  email: "",
  avatarDataUrl: null,
  updatedAt: null,
};

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

function loadStoredProfile(): UserProfile {
  if (typeof window === "undefined") return EMPTY_PROFILE;
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return EMPTY_PROFILE;
    const parsed = JSON.parse(raw) as Partial<UserProfile>;
    return {
      name: typeof parsed.name === "string" ? parsed.name : "",
      phone: typeof parsed.phone === "string" ? parsed.phone : "",
      email: typeof parsed.email === "string" ? parsed.email : "",
      avatarDataUrl:
        typeof parsed.avatarDataUrl === "string" ? parsed.avatarDataUrl : null,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : null,
    };
  } catch {
    return EMPTY_PROFILE;
  }
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
  const [isAdmin, setIsAdminState] = useState<boolean>(false);
  const [profile, setProfileState] = useState<UserProfile>(EMPTY_PROFILE);

  useEffect(() => {
    setDeviceId(generateDeviceId());
    setVehicleState(loadStoredVehicle());
    setProfileState(loadStoredProfile());
    try {
      setIsAdminState(localStorage.getItem(ADMIN_KEY) === "true");
    } catch {
      // ignore
    }
  }, []);

  const setAdmin = useCallback((value: boolean) => {
    setIsAdminState(value);
    try {
      if (value) localStorage.setItem(ADMIN_KEY, "true");
      else localStorage.removeItem(ADMIN_KEY);
    } catch {
      // ignore
    }
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

  const saveProfile = useCallback(
    async (updates: Partial<UserProfile>): Promise<UserProfile> => {
      // Simulate Supabase round-trip so loading/disabled states get exercised.
      await new Promise((r) => setTimeout(r, 400));

      // Functional updater: avoids stale-closure bugs when two saves race
      // (e.g. user mashes Save twice before the first promise resolves).
      let next: UserProfile = EMPTY_PROFILE;
      setProfileState((prev) => {
        next = {
          ...prev,
          ...updates,
          updatedAt: new Date().toISOString(),
        };
        return next;
      });

      try {
        localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
      } catch {
        // localStorage quota — most likely a too-big avatar slipped past
        // the downscale guard. Surface as a thrown error so the form
        // shows it instead of silently dropping the change.
        throw new Error(
          "Couldn't save profile — storage is full. Try a smaller avatar.",
        );
      }
      return next;
    },
    [],
  );

  const value = useMemo<UserContextValue>(
    () => ({
      userType,
      deviceId,
      vehicle,
      isAdmin,
      profile,
      setVehicle,
      clearVehicle,
      setAdmin,
      saveProfile,
      loginAsRider: () => setUserType("rider"),
      loginAsDriver: () => setUserType("driver"),
      logout: () => setUserType(null),
    }),
    [
      userType,
      deviceId,
      vehicle,
      isAdmin,
      profile,
      setVehicle,
      clearVehicle,
      setAdmin,
      saveProfile,
    ],
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
