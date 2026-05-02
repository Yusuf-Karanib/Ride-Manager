import { useState, useEffect } from "react";
import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AuthScreen from "@/pages/AuthScreen";
import RoleSelectScreen from "@/pages/RoleSelectScreen";
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
type Screen = "auth" | "role-select" | "rider" | "driver" | "active-ride";

function AppContent() {
  const [deviceId, setDeviceId] = useState<string>("");
  const [isBanned, setIsBanned] = useState<boolean>(false);
  const [email, setEmail] = useState<string>("");
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
    return <BannedScreen />;
  }

  const handleAuthenticated = (userEmail: string) => {
    setEmail(userEmail);
    setScreen("role-select");
  };

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
    setEmail("");
    setScreen("auth");
  };

  const renderCurrent = () => {
    if (screen === "auth") {
      return <AuthScreen onAuthenticated={handleAuthenticated} deviceId={deviceId} />;
    }
    if (screen === "role-select") {
      return (
        <RoleSelectScreen
          email={email}
          onSelectRole={handleSelectRole}
          onSignOut={handleSignOut}
        />
      );
    }
    if (screen === "rider") {
      return <RiderScreen onRequestRide={handleRequestRide} onSignOut={handleSignOut} />;
    }
    if (screen === "driver") {
      return <DriverScreen onGoOnline={handleGoOnline} onSignOut={handleSignOut} />;
    }
    if (screen === "active-ride") {
      return <ActiveRideScreen role={role} onEndRide={handleEndRide} />;
    }
    return null;
  };

  return (
    <Switch>
      <Route path="/banned">
        <BannedScreen />
      </Route>
      <Route path="/auth">
        <AuthScreen onAuthenticated={handleAuthenticated} deviceId={deviceId} />
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
      <Route path="/">{renderCurrent()}</Route>
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
