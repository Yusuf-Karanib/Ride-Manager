interface PriceDisplayProps {
  amountSyp: number;
  label?: string;
}

const formatPrice = (n: number) => new Intl.NumberFormat("en-US").format(n);

export default function PriceDisplay({
  amountSyp,
  label = "Final Agreed Price",
}: PriceDisplayProps) {
  return (
    <div className="w-full bg-yellow-400 border-4 border-black p-6 sm:p-8 text-center">
      <p className="text-[10px] sm:text-xs font-bold text-black uppercase tracking-[0.3em] mb-2">
        {label}
      </p>

      <div className="border-t-2 border-b-2 border-dashed border-black py-4 my-2">
        <div className="flex items-baseline justify-center gap-2 sm:gap-3">
          <span className="text-6xl sm:text-8xl font-black text-black leading-none tracking-tight tabular-nums">
            {formatPrice(amountSyp)}
          </span>
          <span className="text-2xl sm:text-3xl font-black text-black">
            SYP
          </span>
        </div>
      </div>

      <p className="text-[10px] sm:text-xs font-bold text-black uppercase tracking-[0.2em] mt-2">
        Pay Driver In Cash
      </p>
    </div>
  );
}
