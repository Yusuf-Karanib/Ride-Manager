import { useState, type FormEvent } from "react";
import { submitRating, type RatingTarget } from "@/lib/api";

interface RatingScreenProps {
  rideId: string;
  ratedUserId: string;
  ratedUserName: string;
  raterRole: RatingTarget;
  onSubmitted: () => void;
}

const COMMENT_MAX = 240;

export default function RatingScreen({
  rideId,
  ratedUserId,
  ratedUserName,
  raterRole,
  onSubmitted,
}: RatingScreenProps) {
  const [stars, setStars] = useState(0);
  const [hoverStars, setHoverStars] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayStars = hoverStars || stars;
  const targetLabel = raterRole === "rider" ? "driver" : "rider";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (stars < 1) {
      setError("Please tap a star to rate.");
      return;
    }

    setSubmitting(true);
    try {
      await submitRating({
        ride_id: rideId,
        rated_user_id: ratedUserId,
        rater_role: raterRole,
        stars,
        comment,
      });
      onSubmitted();
    } catch (err) {
      console.error("[RatingScreen] submit failed", err);
      setError("Could not submit rating. Try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="inline-block bg-yellow-400 text-black text-xs font-bold uppercase tracking-wider px-2 py-1 mb-3 border-2 border-black">
            Trip Complete
          </div>
          <h1 className="text-3xl font-black text-black tracking-tight">
            Rate Your {targetLabel}
          </h1>
          <p className="mt-2 text-sm text-black">
            How was your trip with{" "}
            <span className="font-bold">{ratedUserName}</span>?
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div
            className="flex items-center justify-center gap-2"
            onMouseLeave={() => setHoverStars(0)}
            role="radiogroup"
            aria-label="Star rating"
          >
            {[1, 2, 3, 4, 5].map((n) => {
              const active = n <= displayStars;
              return (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={stars === n}
                  aria-label={`${n} star${n === 1 ? "" : "s"}`}
                  onMouseEnter={() => setHoverStars(n)}
                  onFocus={() => setHoverStars(n)}
                  onBlur={() => setHoverStars(0)}
                  onClick={() => setStars(n)}
                  className={`w-12 h-12 flex items-center justify-center border-2 border-black text-2xl leading-none transition-colors ${
                    active
                      ? "bg-yellow-400 text-black"
                      : "bg-white text-black/30 hover:bg-yellow-100"
                  }`}
                >
                  {active ? "★" : "☆"}
                </button>
              );
            })}
          </div>
          {stars > 0 && (
            <p className="text-center text-xs font-bold uppercase tracking-wider text-black">
              {stars} / 5
            </p>
          )}

          <div>
            <label
              htmlFor="comment"
              className="block text-xs font-bold text-black uppercase mb-1 tracking-wider"
            >
              Comments (optional)
            </label>
            <textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, COMMENT_MAX))}
              rows={3}
              className="w-full px-3 py-2 border-2 border-black bg-white text-black text-sm focus:outline-none focus:bg-yellow-100 resize-none"
              placeholder="Anything they should know?"
            />
            <p className="mt-1 text-[11px] text-black/60 font-medium text-right tabular-nums">
              {comment.length} / {COMMENT_MAX}
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
            disabled={submitting}
            className="w-full py-3 px-4 bg-black text-white text-sm font-bold uppercase tracking-wider border-2 border-black hover:bg-yellow-400 hover:text-black disabled:bg-gray-400 disabled:border-gray-400 disabled:cursor-not-allowed"
          >
            {submitting ? "Submitting…" : "Submit Rating"}
          </button>

          <button
            type="button"
            onClick={onSubmitted}
            disabled={submitting}
            className="w-full py-2 text-xs font-bold uppercase tracking-wider text-black/60 hover:text-black disabled:opacity-50"
          >
            Skip
          </button>
        </form>
      </div>
    </div>
  );
}
