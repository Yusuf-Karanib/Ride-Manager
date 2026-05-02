import type { ReactNode } from "react";
import { useUser } from "@/context/UserContext";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { userType, logout } = useUser();

  const label = userType ? userType.toUpperCase() : "GUEST";

  return (
    <div className="min-h-screen w-screen flex flex-col bg-white">
      <nav className="flex items-center justify-between border-b-2 border-black bg-white px-4 py-3">
        <div className="flex items-baseline gap-2">
          <span className="text-base font-bold text-black uppercase tracking-wider">
            Rideshare
          </span>
          <span className="text-xs font-bold text-gray-500 uppercase tracking-[0.2em]">
            {label}
          </span>
        </div>
        <button
          type="button"
          onClick={logout}
          className="px-3 py-1.5 text-sm font-bold text-black border-2 border-black hover:bg-black hover:text-white"
        >
          Logout
        </button>
      </nav>

      <main className="flex-1 flex flex-col">{children}</main>
    </div>
  );
}
