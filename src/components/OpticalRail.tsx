import { motion, useReducedMotion } from "motion/react";

type RailNodeProps = {
  name: string;
  role: string;
};

function RailNode({ name, role }: RailNodeProps) {
  return (
    <div className="w-14 shrink-0 text-center sm:w-20">
      <span
        aria-hidden="true"
        className="relative mx-auto mb-2 block h-12 w-12 border border-ink sm:h-16 sm:w-16"
      >
        <span className="absolute left-1/2 top-1/2 h-px w-4 -translate-x-1/2 -translate-y-1/2 bg-ink sm:w-[18px]" />
        <span className="absolute left-1/2 top-1/2 h-4 w-px -translate-x-1/2 -translate-y-1/2 bg-ink sm:h-[18px]" />
      </span>
      <span className="block font-mono text-[10px] tracking-[0.1em] text-ink sm:text-[11px]">
        {name}
      </span>
      <span className="mt-0.5 block font-mono text-[8px] uppercase tracking-[0.1em] text-olive sm:text-[9px]">
        {role}
      </span>
    </div>
  );
}

const ticks = Array.from({ length: 13 }, (_, index) => (index * 1000) / 12);

export default function OpticalRail() {
  const reduce = useReducedMotion();

  return (
    <figure className="mt-8 sm:mt-10" aria-labelledby="optical-rail-caption">
      <figcaption id="optical-rail-caption" className="sr-only">
        Optical schematic. Alice prepares single photons, the quantum channel carries
        them to Bob, and an interception tap introduces a detectable error.
      </figcaption>

      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 sm:gap-7">
        <RailNode name="ALICE" role="PREPARE" />

        <div className="relative min-w-0 pb-7 pt-7">
          <span className="absolute left-1/2 top-0 -translate-x-1/2 whitespace-nowrap font-mono text-[8px] uppercase tracking-[0.12em] text-olive sm:text-[9px]">
            QUANTUM CHANNEL
          </span>

          <svg
            viewBox="0 0 1000 44"
            preserveAspectRatio="none"
            className="block h-11 w-full overflow-visible"
            aria-hidden="true"
          >
            <line
              x1="0"
              y1="22"
              x2="1000"
              y2="22"
              stroke="currentColor"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
              className="text-ink"
            />
            {ticks.map((x) => (
              <line
                key={x}
                x1={x}
                y1="18"
                x2={x}
                y2="26"
                stroke="currentColor"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
                className="text-rule"
              />
            ))}
            <line
              x1="0"
              y1="22"
              x2="1000"
              y2="22"
              stroke="currentColor"
              strokeWidth="1"
              strokeDasharray="2 10"
              vectorEffect="non-scaling-stroke"
              className={
                reduce
                  ? "text-laser"
                  : "text-laser motion-safe:animate-[qk-beam_5s_linear_infinite]"
              }
            />
          </svg>

          {reduce ? null : (
            <motion.span
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 h-[5px] w-[5px] -translate-y-1/2 bg-laser"
              initial={{ left: "1%" }}
              animate={{ left: "99%" }}
              transition={{
                duration: 4.8,
                ease: "linear",
                repeat: Infinity,
                repeatDelay: 0.6,
              }}
            />
          )}

          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-7 h-11 -translate-x-1/2"
          >
            <span className="absolute left-1/2 top-1/2 h-7 w-px -translate-x-1/2 -translate-y-1/2 bg-laser" />
            <span className="absolute left-1/2 top-1/2 h-[7px] w-[7px] -translate-x-1/2 -translate-y-1/2 rotate-45 bg-laser" />
          </div>

          <span className="absolute bottom-0 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[8px] uppercase tracking-[0.1em] text-olive sm:text-[9px]">
            EVE TAP / INTERCEPT = ERROR
          </span>
        </div>

        <RailNode name="BOB" role="MEASURE" />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-rule pt-3 font-mono text-[9px] uppercase tracking-[0.1em] text-olive sm:text-[10px]">
        <span>
          <span className="text-ink">+</span> RECTILINEAR
        </span>
        <span>
          <span className="text-ink">×</span> DIAGONAL
        </span>
        <span className="ml-auto text-laser-ink">ORANGE = INTERCEPT TAP</span>
      </div>
    </figure>
  );
}
