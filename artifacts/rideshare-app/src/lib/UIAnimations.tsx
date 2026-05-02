import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type HTMLMotionProps,
  type Variants,
} from "framer-motion";
import type { ReactNode } from "react";

/* -------------------------------------------------------------------------- */
/* Variants — reusable motion definitions                                     */
/* -------------------------------------------------------------------------- */

export const fadeBackdrop: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.18, ease: "easeOut" } },
  exit: { opacity: 0, transition: { duration: 0.15, ease: "easeIn" } },
};

/** Slides up from the bottom on mobile; lightly scales on desktop. */
export const slideUpSheet: Variants = {
  hidden: { y: "100%", opacity: 0.6 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      damping: 32,
      stiffness: 360,
      mass: 0.9,
    },
  },
  exit: {
    y: "100%",
    opacity: 0,
    transition: { duration: 0.18, ease: "easeIn" },
  },
};

export const fadeScaleCard: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: "spring", damping: 28, stiffness: 320 },
  },
  exit: { opacity: 0, scale: 0.96, transition: { duration: 0.15 } },
};

/** Cascade for list children (used with `staggerItem`). */
export const staggerList: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.04, delayChildren: 0.05 },
  },
  exit: { transition: { staggerChildren: 0.02, staggerDirection: -1 } },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", damping: 24, stiffness: 360 },
  },
  exit: { opacity: 0, y: -4, transition: { duration: 0.12 } },
};

/** A "pop" used when a new bid lands or a button confirms an action. */
export const popIn: Variants = {
  hidden: { scale: 0.85, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { type: "spring", damping: 14, stiffness: 480 },
  },
  exit: { scale: 0.9, opacity: 0, transition: { duration: 0.12 } },
};

/* -------------------------------------------------------------------------- */
/* Wrappers — opinionated building blocks                                     */
/* -------------------------------------------------------------------------- */

interface AnimatedSheetProps {
  open: boolean;
  onScrimClick?: () => void;
  /** Container className applied to the inner sheet panel. */
  className?: string;
  /** Outer wrapper className (positioning of sheet). */
  wrapperClassName?: string;
  children: ReactNode;
  ariaLabel?: string;
}

/**
 * Bottom-sheet on mobile, centered card on `sm:` breakpoint and up.
 * Handles AnimatePresence + scrim + reduced-motion automatically.
 */
export function AnimatedSheet({
  open,
  onScrimClick,
  className,
  wrapperClassName,
  children,
  ariaLabel,
}: AnimatedSheetProps) {
  const reduce = useReducedMotion();

  const sheetVariants: Variants = reduce
    ? {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.12 } },
        exit: { opacity: 0, transition: { duration: 0.1 } },
      }
    : slideUpSheet;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="sheet-root"
          role="dialog"
          aria-modal="true"
          aria-label={ariaLabel}
          className={`fixed inset-0 z-[2000] flex items-end sm:items-center justify-center ${
            wrapperClassName ?? ""
          }`}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <motion.button
            type="button"
            aria-label="Close"
            onClick={onScrimClick}
            className="absolute inset-0 bg-black/55"
            variants={fadeBackdrop}
          />
          <motion.div
            className={`relative w-full sm:max-w-md bg-white border-t-2 sm:border-2 border-black flex flex-col max-h-[85vh] ${
              className ?? ""
            }`}
            variants={sheetVariants}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface StaggerListProps extends HTMLMotionProps<"ul"> {
  children: ReactNode;
}

export function StaggerList({ children, ...rest }: StaggerListProps) {
  const reduce = useReducedMotion();
  return (
    <motion.ul
      variants={reduce ? undefined : staggerList}
      initial="hidden"
      animate="visible"
      exit="exit"
      {...rest}
    >
      {children}
    </motion.ul>
  );
}

interface StaggerItemProps extends HTMLMotionProps<"li"> {
  children: ReactNode;
}

export function StaggerItem({ children, ...rest }: StaggerItemProps) {
  const reduce = useReducedMotion();
  return (
    <motion.li variants={reduce ? undefined : staggerItem} {...rest}>
      {children}
    </motion.li>
  );
}

interface PopInProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
}

/** A drop-in wrapper for elements that should "pop" on mount (badges, totals). */
export function PopIn({ children, ...rest }: PopInProps) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      variants={reduce ? undefined : popIn}
      initial="hidden"
      animate="visible"
      exit="exit"
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/* Reduced-motion aware passthrough for the CSS radar                         */
/* -------------------------------------------------------------------------- */

/**
 * Wrap the existing CSS-pulse radar (EmptyState) so we can centrally suppress
 * it for users with `prefers-reduced-motion`. The CSS already has an
 * `@media (prefers-reduced-motion: reduce)` clause; this wrapper additionally
 * fades the whole radar in on mount via Framer Motion.
 */
export function RadarMount({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, scale: reduce ? 1 : 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: reduce ? 0.15 : 0.4, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
