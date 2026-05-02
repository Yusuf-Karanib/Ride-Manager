import { useState, type FormEvent } from "react";
import { useUser, type Vehicle } from "@/context/UserContext";

interface VehicleRegistrationProps {
  onComplete?: (vehicle: Vehicle) => void;
  onSkip?: () => void;
}

const PLATE_PATTERN = /^[A-Z0-9\- ]{2,12}$/;

export default function VehicleRegistration({
  onComplete,
  onSkip,
}: VehicleRegistrationProps) {
  const { vehicle, setVehicle } = useUser();

  const [carModel, setCarModel] = useState(vehicle?.carModel ?? "");
  const [color, setColor] = useState(vehicle?.color ?? "");
  const [licensePlate, setLicensePlate] = useState(vehicle?.licensePlate ?? "");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedModel = carModel.trim();
    const trimmedColor = color.trim();
    const normalizedPlate = licensePlate.trim().toUpperCase();

    if (trimmedModel.length < 2) {
      setError("Enter your car model (e.g. Hyundai Accent).");
      return;
    }
    if (trimmedColor.length < 2) {
      setError("Enter your car color.");
      return;
    }
    if (!PLATE_PATTERN.test(normalizedPlate)) {
      setError("License plate must be 2–12 letters, numbers, spaces, or dashes.");
      return;
    }

    const v: Vehicle = {
      carModel: trimmedModel,
      color: trimmedColor,
      licensePlate: normalizedPlate,
    };
    setVehicle(v);
    onComplete?.(v);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6">
          <div className="inline-block bg-yellow-400 text-black text-xs font-bold uppercase tracking-wider px-2 py-1 mb-3 border-2 border-black">
            Step 2 of 2
          </div>
          <h1 className="text-3xl font-black text-black tracking-tight">
            Register Your Vehicle
          </h1>
          <p className="mt-2 text-sm text-black">
            Riders see this info before accepting your bid. Make sure it matches
            your car exactly.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="carModel"
              className="block text-xs font-bold text-black uppercase mb-1 tracking-wider"
            >
              Car Model / Make
            </label>
            <input
              id="carModel"
              type="text"
              autoComplete="off"
              value={carModel}
              onChange={(e) => setCarModel(e.target.value)}
              className="w-full px-3 py-2 border-2 border-black bg-white text-black text-sm focus:outline-none focus:bg-yellow-100"
              placeholder="e.g. Hyundai Accent"
              maxLength={48}
            />
          </div>

          <div>
            <label
              htmlFor="color"
              className="block text-xs font-bold text-black uppercase mb-1 tracking-wider"
            >
              Color
            </label>
            <input
              id="color"
              type="text"
              autoComplete="off"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-full px-3 py-2 border-2 border-black bg-white text-black text-sm focus:outline-none focus:bg-yellow-100"
              placeholder="e.g. Silver"
              maxLength={24}
            />
          </div>

          <div>
            <label
              htmlFor="licensePlate"
              className="block text-xs font-bold text-black uppercase mb-1 tracking-wider"
            >
              License Plate
            </label>
            <input
              id="licensePlate"
              type="text"
              autoComplete="off"
              value={licensePlate}
              onChange={(e) =>
                setLicensePlate(e.target.value.toUpperCase().slice(0, 12))
              }
              className="w-full px-3 py-2 border-2 border-black bg-white text-black text-sm tracking-widest font-mono uppercase focus:outline-none focus:bg-yellow-100"
              placeholder="ABC-1234"
              maxLength={12}
            />
            <p className="mt-1 text-[11px] text-black/60 font-medium">
              Letters, numbers, spaces and dashes only.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="border-2 border-black bg-red-600 text-white px-3 py-2 text-xs font-bold"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 px-4 bg-black text-white text-sm font-bold uppercase tracking-wider border-2 border-black hover:bg-yellow-400 hover:text-black"
          >
            Save & Continue
          </button>

          {onSkip && (
            <button
              type="button"
              onClick={onSkip}
              className="w-full py-2 text-xs font-bold uppercase tracking-wider text-black/60 hover:text-black"
            >
              Skip for now
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
