import { lazy, Suspense, type ComponentProps } from "react";
import type MapPicker from "@/components/MapPicker";
import type RiderMap from "@/components/RiderMap";

const MapPickerLazy = lazy(() => import("@/components/MapPicker"));
const RiderMapLazy = lazy(() => import("@/components/RiderMap"));

function MapSkeleton({ label }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="w-full h-full flex items-center justify-center bg-gray-100 border-2 border-black"
      style={{ minHeight: 240 }}
    >
      <div className="flex flex-col items-center gap-2">
        <div className="w-8 h-8 border-4 border-black border-t-yellow-400 rounded-full animate-spin" />
        <span className="text-xs font-bold uppercase tracking-wider text-black">
          {label ?? "Loading map…"}
        </span>
      </div>
    </div>
  );
}

export function LazyMapPicker(props: ComponentProps<typeof MapPicker>) {
  return (
    <Suspense fallback={<MapSkeleton />}>
      <MapPickerLazy {...props} />
    </Suspense>
  );
}

export function LazyRiderMap(props: ComponentProps<typeof RiderMap>) {
  return (
    <Suspense fallback={<MapSkeleton />}>
      <RiderMapLazy {...props} />
    </Suspense>
  );
}

export function preloadMapChunks(): Promise<unknown> {
  return Promise.all([
    import("@/components/MapPicker"),
    import("@/components/RiderMap"),
  ]);
}
