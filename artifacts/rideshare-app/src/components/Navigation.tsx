import { Car, User, Search, Wallet, type LucideIcon } from "lucide-react";

export type NavRole = "rider" | "driver";
export type RiderTab = "book" | "profile";
export type DriverTab = "find" | "earnings";
export type NavTab = RiderTab | DriverTab;

interface NavItem<T extends NavTab> {
  id: T;
  label: string;
  Icon: LucideIcon;
}

const RIDER_ITEMS: NavItem<RiderTab>[] = [
  { id: "book", label: "Book Ride", Icon: Car },
  { id: "profile", label: "My Profile", Icon: User },
];

const DRIVER_ITEMS: NavItem<DriverTab>[] = [
  { id: "find", label: "Find Rides", Icon: Search },
  { id: "earnings", label: "Earnings", Icon: Wallet },
];

interface NavigationProps {
  role: NavRole;
  active: NavTab;
  onChange: (tab: NavTab) => void;
}

export default function Navigation({ role, active, onChange }: NavigationProps) {
  const items: NavItem<NavTab>[] =
    role === "rider"
      ? (RIDER_ITEMS as NavItem<NavTab>[])
      : (DRIVER_ITEMS as NavItem<NavTab>[]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[1500] bg-white border-t-2 border-black flex">
      {items.map(({ id, label, Icon }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 border-r-2 border-black last:border-r-0 ${
              isActive
                ? "bg-black text-white"
                : "bg-white text-black hover:bg-gray-100"
            }`}
          >
            <Icon className="w-5 h-5" strokeWidth={2.5} />
            <span className="text-[10px] font-bold uppercase tracking-wider">
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
