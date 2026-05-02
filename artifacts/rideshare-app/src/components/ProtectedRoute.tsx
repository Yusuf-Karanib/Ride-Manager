import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useUser } from "@/context/UserContext";

const BANNED_DEVICE_IDS = new Set<string>(["banned-device-000-demo"]);

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { userType, deviceId } = useUser();

  if (deviceId && BANNED_DEVICE_IDS.has(deviceId)) {
    return <Navigate to="/banned" replace />;
  }

  if (userType === null) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}
