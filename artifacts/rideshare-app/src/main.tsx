import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import App from "./App";
import AdminPanel from "./pages/AdminPanel";
import { UserProvider } from "./context/UserContext";
import "./index.css";

const basename = import.meta.env.BASE_URL.replace(/\/$/, "");

createRoot(document.getElementById("root")!).render(
  <BrowserRouter basename={basename}>
    <UserProvider>
      <Routes>
        <Route path="/admin-dashboard" element={<AdminPanel />} />
        <Route path="*" element={<App />} />
      </Routes>
    </UserProvider>
  </BrowserRouter>,
);
