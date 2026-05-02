import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import App from "./App";
import AdminPanel from "./pages/AdminPanel";
import { UserProvider } from "./context/UserContext";
import AppErrorBoundary from "./components/AppErrorBoundary";
import "./index.css";

const basename = import.meta.env.BASE_URL.replace(/\/$/, "");

/**
 * Thin wrapper that re-keys the error boundary on route changes so a crash
 * on /rider doesn't poison the fallback when the user navigates to /driver.
 * Lives inside <BrowserRouter> because useLocation() needs router context.
 */
function RoutedTree() {
  const { pathname } = useLocation();
  return (
    <AppErrorBoundary resetKey={pathname}>
      <UserProvider>
        <Routes>
          <Route path="/admin-dashboard" element={<AdminPanel />} />
          <Route path="*" element={<App />} />
        </Routes>
      </UserProvider>
    </AppErrorBoundary>
  );
}

createRoot(document.getElementById("root")!).render(
  <BrowserRouter basename={basename}>
    <RoutedTree />
  </BrowserRouter>,
);
