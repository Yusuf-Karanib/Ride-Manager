import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Direction = "ltr" | "rtl";

interface DirectionContextValue {
  direction: Direction;
  isRtl: boolean;
  setDirection: (dir: Direction) => void;
  toggleDirection: () => void;
}

const DirectionContext = createContext<DirectionContextValue | undefined>(
  undefined,
);

interface RTLWrapperProps {
  children: ReactNode;
  initialDirection?: Direction;
  applyToDocument?: boolean;
}

export default function RTLWrapper({
  children,
  initialDirection = "ltr",
  applyToDocument = true,
}: RTLWrapperProps) {
  const [direction, setDirection] = useState<Direction>(initialDirection);

  useEffect(() => {
    if (!applyToDocument || typeof document === "undefined") return;
    const html = document.documentElement;
    const prevDir = html.getAttribute("dir");
    const prevLang = html.getAttribute("lang");
    html.setAttribute("dir", direction);
    if (direction === "rtl") html.setAttribute("lang", "ar");
    return () => {
      if (prevDir !== null) html.setAttribute("dir", prevDir);
      else html.removeAttribute("dir");
      if (prevLang !== null) html.setAttribute("lang", prevLang);
    };
  }, [direction, applyToDocument]);

  const toggleDirection = useCallback(() => {
    setDirection((d) => (d === "ltr" ? "rtl" : "ltr"));
  }, []);

  const value = useMemo<DirectionContextValue>(
    () => ({
      direction,
      isRtl: direction === "rtl",
      setDirection,
      toggleDirection,
    }),
    [direction, toggleDirection],
  );

  return (
    <DirectionContext.Provider value={value}>
      <div dir={direction} className="contents">
        {children}
      </div>
    </DirectionContext.Provider>
  );
}

export function useDirection(): DirectionContextValue {
  const ctx = useContext(DirectionContext);
  if (!ctx) {
    throw new Error("useDirection must be used within an RTLWrapper");
  }
  return ctx;
}
