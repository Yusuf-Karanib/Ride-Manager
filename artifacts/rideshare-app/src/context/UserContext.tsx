import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type UserType = "rider" | "driver" | null;

interface UserContextValue {
  userType: UserType;
  deviceId: string;
  loginAsRider: () => void;
  loginAsDriver: () => void;
  logout: () => void;
}

const UserContext = createContext<UserContextValue | undefined>(undefined);

const DEVICE_ID_KEY = "mock_device_id";

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

interface UserProviderProps {
  children: ReactNode;
}

export function UserProvider({ children }: UserProviderProps) {
  const [userType, setUserType] = useState<UserType>(null);
  const [deviceId, setDeviceId] = useState<string>("");

  useEffect(() => {
    setDeviceId(generateDeviceId());
  }, []);

  const value = useMemo<UserContextValue>(
    () => ({
      userType,
      deviceId,
      loginAsRider: () => setUserType("rider"),
      loginAsDriver: () => setUserType("driver"),
      logout: () => setUserType(null),
    }),
    [userType, deviceId],
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
