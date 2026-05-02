import { useState, useEffect } from "react";
import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AuthScreen from "@/pages/AuthScreen";
import RiderScreen from "@/pages/RiderScreen";
import DriverScreen from "@/pages/DriverScreen";
import ActiveRideScreen from "@/pages/ActiveRideScreen";
import BannedScreen from "@/pages/BannedScreen";

const queryClient = new QueryClient();

const BANNED_DEVICE_IDS: Set<string> = new Set([
  "banned-device-000-demo",
]);

function generateDeviceId(): string {
  const stored = localStorage.getItem("mock_device_id");
  if (stored) return stored;
  const id = "device-" + crypto.randomUUID();
  localStorage.setItem("mock_device_id", id);
  return id;
}

type Role = "rider" | "driver" | null;
type Screen = "auth" | "rider" | "driver" | "active-ride";

function AppContent() {
  const [deviceId, setDeviceId] = useState<string>("");
  const [isBanned, setIsBanned] = useState<boolean>(false);
  const [role, setRole] = useState<Role>(null);
  const [screen, setScreen] = useState<Screen>("auth");

  useEffect(() => {
    const id = generateDeviceId();
    setDeviceId(id);
    if (BANNED_DEVICE_IDS.has(id)) {
      setIsBanned(true);
    }
  }, []);

  if (isBanned) {
    return <BannedScreen deviceId={deviceId} />;
  }

  const handleSelectRole = (selectedRole: "rider" | "driver") => {
    setRole(selectedRole);
    setScreen(selectedRole);
  };

  const handleRequestRide = () => {
    setScreen("active-ride");
  };

  const handleGoOnline = () => {
    setScreen("active-ride");
  };

  const handleEndRide = () => {
    setScreen(role === "rider" ? "rider" : "driver");
  };

  const handleSignOut = () => {
    setRole(null);
    setScreen("auth");
  };

  return (
    <Switch>
      <Route path="/">
        {screen === "auth" && (
          <AuthScreen onSelectRole={handleSelectRole} deviceId={deviceId} />
        )}
        {screen === "rider" && (
          <RiderScreen onRequestRide={handleRequestRide} onSignOut={handleSignOut} />
        )}
        {screen === "driver" && (
          <DriverScreen onGoOnline={handleGoOnline} onSignOut={handleSignOut} />
        )}
        {screen === "active-ride" && (
          <ActiveRideScreen role={role} onEndRide={handleEndRide} />
        )}
      </Route>
      <Route path="/auth">
        <AuthScreen onSelectRole={handleSelectRole} deviceId={deviceId} />
      </Route>
      <Route path="/rider">
        {role === "rider" ? (
          <RiderScreen onRequestRide={handleRequestRide} onSignOut={handleSignOut} />
        ) : (
          <Redirect to="/" />
        )}
      </Route>
      <Route path="/driver">
        {role === "driver" ? (
          <DriverScreen onGoOnline={handleGoOnline} onSignOut={handleSignOut} />
        ) : (
          <Redirect to="/" />
        )}
      </Route>
      <Route path="/active-ride">
        {screen === "active-ride" ? (
          <ActiveRideScreen role={role} onEndRide={handleEndRide} />
        ) : (
          <Redirect to="/" />
        )}
      </Route>
      <Route path="/banned">
        <BannedScreen deviceId={deviceId} />
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AppContent />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
