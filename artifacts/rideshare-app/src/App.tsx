import { useState, useEffect } from "react";
import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AuthScreen from "@/pages/AuthScreen";
import RoleSelectScreen from "@/pages/RoleSelectScreen";
import RiderScreen from "@/pages/RiderScreen";
import DriverScreen from "@/pages/DriverScreen";
import ActiveRideScreen from "@/pages/ActiveRideScreen";
import BannedScreen from "@/pages/BannedScreen";
import { useUser } from "@/context/UserContext";

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
  // UserContext is the canonical auth signal that downstream screens
  // (RiderScreen, etc.) read via useUser(). App's local `email`/`role`
  // state still drives the screen-state machine; we mirror auth events
  // into UserContext so consumers see a consistent userType.
  const { loginAsRider, loginAsDriver, logout } = useUser();
  const [, setLocation] = useLocation();
  // Public-by-default: unauthenticated users land on the rider experience
  // at `/`. AuthScreen is still reachable explicitly via `/auth` and is
  // entered from RoleSelectScreen for users who want to drive.
  // Driver/active-ride routes remain gated by the inline role checks below.
  const [screen, setScreen] = useState<Screen>("rider");
  const [agreedPriceSyp, setAgreedPriceSyp] = useState<number>(0);

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
    // If the user reached AuthScreen via the explicit `/auth` route (e.g.
    // bounced from RiderScreen's auth gate), push them back to `/` so the
    // state-driven flow can render RoleSelectScreen → role → RiderScreen.
    // Otherwise the URL stays at `/auth` and the wouter Switch keeps
    // rendering AuthScreen regardless of state transitions.
    setLocation("/");
  };

  const handleSelectRole = (selectedRole: "rider" | "driver") => {
    setRole(selectedRole);
    setScreen(selectedRole);
    // Mirror into UserContext so RiderScreen/DriverScreen/etc. can read
    // userType as the auth signal instead of prop-drilling email/role.
    if (selectedRole === "rider") loginAsRider();
    else loginAsDriver();
  };

  const handleRequestRide = (price: number) => {
    setAgreedPriceSyp(price);
    setScreen("active-ride");
  };

  const handleAcceptedBid = (price: number) => {
    setAgreedPriceSyp(price);
    setScreen("active-ride");
  };

  const handleEndRide = () => {
    setAgreedPriceSyp(0);
    setScreen(role === "rider" ? "rider" : "driver");
  };

  const handleSignOut = () => {
    setRole(null);
    setEmail("");
    setAgreedPriceSyp(0);
    // Land back on the public rider screen, not AuthScreen — matches the
    // public-by-default routing change. Sign-in is reachable via `/auth`
    // or the in-screen "Sign in" button.
    setScreen("rider");
    logout();
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
      return <DriverScreen onAcceptedBid={handleAcceptedBid} onSignOut={handleSignOut} />;
    }
    if (screen === "active-ride") {
      return (
        <ActiveRideScreen
          agreedPriceSyp={agreedPriceSyp}
          onReportProblem={handleEndRide}
          onCompleteTrip={handleEndRide}
        />
      );
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
          <DriverScreen onAcceptedBid={handleAcceptedBid} onSignOut={handleSignOut} />
        ) : (
          <Redirect to="/" />
        )}
      </Route>
      <Route path="/active-ride">
        {screen === "active-ride" ? (
          <ActiveRideScreen
            agreedPriceSyp={agreedPriceSyp}
            onReportProblem={handleEndRide}
            onCompleteTrip={handleEndRide}
          />
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
