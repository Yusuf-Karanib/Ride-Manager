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
import ServicesHub, { type ServiceId } from "@/pages/ServicesHub";
import RequestForm from "@/pages/RequestForm";
import DeliveryDetails from "@/pages/DeliveryDetails";
import ActivityScreen from "@/pages/ActivityScreen";
import ProfileScreen from "@/pages/ProfileScreen";
import Layout from "@/components/Layout";
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

const SERVICE_IDS = new Set<ServiceId>([
  "taxi",
  "motorcycle",
  "microbus",
  "vip",
  "package",
]);

const SERVICE_LABELS: Record<ServiceId, string> = {
  taxi: "Standard Taxi",
  motorcycle: "Motorcycle",
  microbus: "Microbus",
  vip: "VIP Car",
  package: "Package Delivery",
};

/** Read `?service=…` from the live URL, validate against ServiceId, fall back to "taxi". */
function readServiceIdFromQuery(): ServiceId {
  const raw = new URLSearchParams(window.location.search).get("service");
  if (raw && SERVICE_IDS.has(raw as ServiceId)) return raw as ServiceId;
  return "taxi";
}

function AppContent() {
  const [deviceId, setDeviceId] = useState<string>("");
  const [isBanned, setIsBanned] = useState<boolean>(false);
  const [email, setEmail] = useState<string>("");
  const [role, setRole] = useState<Role>(null);
  // UserContext is the canonical auth signal that downstream screens
  // (RiderScreen, etc.) read via useUser().
  const { loginAsRider, loginAsDriver, logout } = useUser();
  const [, setLocation] = useLocation();
  const [agreedPriceSyp, setAgreedPriceSyp] = useState<number>(0);
  // Captured at request time. Not yet persisted (createRide has zero
  // callsites) — surfaces here so the future wiring has a canonical source.
  const [, setSelectedServiceType] = useState<ServiceId>("taxi");

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
    setLocation("/role-select");
  };

  const handleSelectRole = (selectedRole: "rider" | "driver") => {
    setRole(selectedRole);
    if (selectedRole === "rider") {
      loginAsRider();
      setLocation("/");
    } else {
      loginAsDriver();
      setLocation("/driver");
    }
  };

  const handleRequestRide = (price: number, serviceType: ServiceId) => {
    setAgreedPriceSyp(price);
    setSelectedServiceType(serviceType);
    setLocation("/active-ride");
  };

  const handleAcceptedBid = (price: number) => {
    setAgreedPriceSyp(price);
    setLocation("/active-ride");
  };

  const handleEndRide = () => {
    setAgreedPriceSyp(0);
    setLocation(role === "driver" ? "/driver" : "/");
  };

  const handleSignOut = () => {
    setRole(null);
    setEmail("");
    setAgreedPriceSyp(0);
    setLocation("/");
    logout();
  };

  return (
    <Switch>
      {/* Auth + banned — full-bleed, no nav shell */}
      <Route path="/banned">
        <BannedScreen />
      </Route>
      <Route path="/auth">
        <AuthScreen onAuthenticated={handleAuthenticated} deviceId={deviceId} />
      </Route>
      <Route path="/role-select">
        <RoleSelectScreen
          email={email}
          onSelectRole={handleSelectRole}
          onSignOut={handleSignOut}
        />
      </Route>

      {/* Existing full-bleed app screens. Kept outside Layout because
          they use h-screen and contain bottom-anchored UI (submit
          buttons, in-trip controls) that BottomNav would overlap. */}
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
        {agreedPriceSyp > 0 ? (
          <ActiveRideScreen
            agreedPriceSyp={agreedPriceSyp}
            onReportProblem={handleEndRide}
            onCompleteTrip={handleEndRide}
          />
        ) : (
          <Redirect to="/" />
        )}
      </Route>

      {/* New routes — wrapped in Layout for the global BottomNav. */}
      <Route path="/request">
        {() => {
          const serviceId = readServiceIdFromQuery();
          // Package has a different schema (item description, receiver
          // phone, fragile/high-value, separate item-value vs delivery
          // price) — render its dedicated form. All other services share
          // the standard RequestForm.
          if (serviceId === "package") {
            return (
              <Layout>
                <DeliveryDetails
                  serviceLabel={SERVICE_LABELS[serviceId]}
                  onBack={() => setLocation("/")}
                  onSubmit={(values) => {
                    // NOTE: persistence to `rides` is intentionally NOT
                    // wired yet. The schema lacks a `metadata` jsonb
                    // column AND `service_type` does not include
                    // 'package'. Both must be migrated before
                    // createRide() can accept this payload. Until then
                    // the delivery price drives the local auction state
                    // exactly like the rider flow, so the user can still
                    // walk through the UX end-to-end.
                    setAgreedPriceSyp(values.deliveryPriceSyp);
                    setSelectedServiceType(serviceId);
                    setLocation("/active-ride");
                  }}
                />
              </Layout>
            );
          }
          return (
            <Layout>
              <RequestForm
                serviceId={serviceId}
                serviceLabel={SERVICE_LABELS[serviceId]}
                onBack={() => setLocation("/")}
                onSubmit={(values) => {
                  // NOTE: this flow skips negotiation (the auction modal
                  // lives only in RiderScreen). For now the offer price
                  // becomes the agreed price directly. Wire negotiation
                  // here when the auction step is unified across flows.
                  if (values.offerPriceSyp != null) {
                    setAgreedPriceSyp(values.offerPriceSyp);
                  }
                  setSelectedServiceType(serviceId);
                  setLocation("/active-ride");
                }}
              />
            </Layout>
          );
        }}
      </Route>
      <Route path="/activity">
        <Layout>
          <ActivityScreen />
        </Layout>
      </Route>
      <Route path="/profile">
        <Layout>
          <ProfileScreen onLogout={handleSignOut} />
        </Layout>
      </Route>

      {/* Home — ServicesHub at /. The catch-all default. */}
      <Route path="/">
        <Layout>
          <ServicesHub
            onSelect={(id) => setLocation(`/request?service=${id}`)}
          />
        </Layout>
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
