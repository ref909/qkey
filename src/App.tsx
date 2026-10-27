import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { Variants } from "motion/react";
import HandshakeDemo from "./components/HandshakeDemo";
import OpticalRail from "./components/OpticalRail";

const container = "mx-auto w-full max-w-[1440px] px-5 sm:px-8 lg:px-12";

const navItems = [
  { label: "CHANNEL", href: "#channel" },
  { label: "PROTOCOL", href: "#protocol" },
  { label: "THREAT", href: "#threat" },
  { label: "SPEC", href: "#spec" },
];

const specs = [
  { label: "PROTOCOL", value: "BB84" },
  { label: "FRAME", value: "48", unit: "QUBITS / FRAME" },
  { label: "ABORT", value: "11%", unit: "QBER THRESHOLD" },
  { label: "PAYLOAD", value: "AES-256-GCM" },
];

const steps = [
  {
    number: "01",
    title: "Prepare",
    copy: "Alice draws a random bit and a random basis for every photon. Rectilinear and diagonal states encode the same bit differently, so the basis is part of the signal.",
    tag: "48 PHOTONS / FRAME",
  },
  {
    number: "02",
    title: "Measure",
    copy: "Bob measures each photon in a basis he chooses independently. When his basis matches Alice's, the bit survives. When it does not, the outcome is discarded.",
    tag: "RANDOM BASIS / PHOTON",
  },
  {
    number: "03",
    title: "Sift + Check",
    copy: "Alice and Bob compare bases over the public channel and keep only the rounds that match. The error rate across the sifted bits is the QBER. Above 11%, the exchange aborts.",
    tag: "PUBLIC BASIS COMPARISON",
  },
  {
    number: "04",
    title: "Derive",
    copy: "If the error rate is under threshold, the sifted bits are hashed into a 256-bit key. The payload is encrypted with AES-256-GCM using that derived key.",
    tag: "SHA-256 → AES-256-GCM",
  },
];

const sheetRows = [
  {
    parameter: "FRAME SIZE",
    value: "48 qubits",
    note: "One photon per round.",
  },
  {
    parameter: "ABORT THRESHOLD",
    value: "11% QBER",
    note: "Measured across the sifted bits in the current frame.",
  },
  {
    parameter: "SIFTED KEY",
    value: "Matched bases",
    note: "Rounds where Alice and Bob chose the same basis.",
  },
  {
    parameter: "KEY DERIVATION",
    value: "SHA-256",
    note: "Sifted bits are hashed into a 256-bit key.",
  },
  {
    parameter: "PAYLOAD",
    value: "AES-256-GCM",
    note: "Authenticated encryption with a fresh IV.",
  },
  {
    parameter: "ADVERSARY",
    value: "Eve intercept",
    note: "Intercept-resend attack; raises the measured QBER.",
  },
];

const heroContainer: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
};

const heroLine: Variants = {
  hidden: { opacity: 0, y: 26 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.85, ease: "easeOut" },
  },
};

function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 18 }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

function SectionHead({
  index,
  label,
  titleId,
  title,
  intro,
  large = false,
}: {
  index: string;
  label: string;
  titleId: string;
  title: ReactNode;
  intro: string;
  large?: boolean;
}) {
  return (
    <Reveal>
      <div className="border-t border-ink pt-4">
        <div className="grid gap-6 md:grid-cols-12 md:gap-0">
          <div className="flex items-start gap-3 font-mono text-[10px] uppercase tracking-[0.14em] text-olive md:col-span-2 md:flex-col md:gap-3">
            <span className="bg-laser px-1.5 py-0.5 text-[11px] font-medium leading-none text-ink">
              {index}
            </span>
            <span>{label}</span>
          </div>

          <div className="min-w-0 md:col-span-10 md:border-l md:border-rule md:pl-8 lg:pl-12">
            <h2
              id={titleId}
              className={
                large
                  ? "max-w-[14ch] font-display text-[clamp(3.2rem,7vw,6.5rem)] font-normal leading-[0.88] tracking-[-0.03em] text-ink"
                  : "max-w-[20ch] font-display text-[clamp(2.4rem,4.6vw,4.2rem)] font-normal leading-[0.95] tracking-[-0.02em] text-ink"
              }
            >
              {title}
            </h2>
            <p className="mt-4 max-w-[62ch] text-[15px] leading-[1.6] text-ink/80 sm:text-base">
              {intro}
            </p>
          </div>
        </div>
      </div>
    </Reveal>
  );
}

export default function App() {
  const reduce = useReducedMotion();

  const contractAddress =
    typeof import.meta.env.VITE_QKEY_CONTRACT === "string"
      ? import.meta.env.VITE_QKEY_CONTRACT.trim()
      : "";
  const contractDisplay = contractAddress || "TBA";

  return (
    <div id="top" className="min-h-screen overflow-x-clip bg-paper text-ink">
      <a
        href="#main"
        className="fixed left-0 top-0 z-50 -translate-y-full bg-ink px-4 py-3 font-mono text-[11px] uppercase tracking-[0.1em] text-cream focus:translate-y-0"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b border-rule bg-paper">
        <div
          className={`${container} grid min-h-16 grid-cols-[auto_1fr] items-center gap-4 md:grid-cols-[1fr_auto_1fr]`}
        >
          <a
            href="#top"
            aria-label="Q/KEY home"
            className="justify-self-start font-mono text-[15px] font-bold tracking-[0.06em] text-ink"
          >
            Q<span className="text-laser-ink">/</span>KEY
          </a>

          <nav
            aria-label="Primary"
            className="hidden items-center justify-center gap-7 md:flex lg:gap-10"
          >
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="relative py-2 font-mono text-[10px] uppercase tracking-[0.1em] text-olive transition-colors after:absolute after:bottom-0 after:left-0 after:h-px after:w-0 after:bg-laser after:transition-all hover:text-ink hover:after:w-full"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center justify-self-end gap-3 sm:gap-5">
            <span className="hidden items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-olive min-[360px]:inline-flex sm:text-[10px]">
              <span
                aria-hidden="true"
                className="h-[5px] w-[5px] bg-laser motion-safe:animate-[qk-pulse_2.8s_ease-in-out_infinite]"
              />
              BB84 / CHANNEL 0.1
            </span>
            <a
              href="#channel"
              className="inline-flex items-center gap-2 whitespace-nowrap bg-ink px-3 py-2.5 font-mono text-[9px] uppercase tracking-[0.1em] text-cream transition-colors hover:bg-laser hover:text-ink sm:px-4 sm:text-[10px]"
            >
              RUN HANDSHAKE
              <span aria-hidden="true">→</span>
            </a>
          </div>
        </div>

        <div className="border-t border-rule md:hidden">
          <nav
            aria-label="Sections"
            className={`${container} flex items-center justify-between py-2`}
          >
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="py-1 font-mono text-[9px] uppercase tracking-[0.1em] text-olive transition-colors hover:text-ink"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <main id="main">
        <section aria-labelledby="hero-title" className="border-b border-rule">
          <div
            className={`${container} pb-10 pt-14 sm:pb-12 sm:pt-20 lg:pt-24`}
          >
            <div className="grid grid-cols-1 gap-12 md:grid-cols-12 md:gap-0">
              <div className="min-w-0 md:col-span-8 md:pr-10 lg:pr-16">
                <div className="mb-6 flex items-center gap-3 font-mono text-[9px] uppercase tracking-[0.16em] text-olive sm:text-[10px]">
                  <span aria-hidden="true" className="h-2 w-2 bg-laser" />
                  BB84 / QUANTUM KEY DISTRIBUTION
                </div>

                <motion.h1
                  id="hero-title"
                  className="max-w-[10ch] font-display text-[clamp(3.55rem,8vw,7.4rem)] font-normal leading-[0.86] tracking-[-0.035em] text-ink"
                  initial={reduce ? false : "hidden"}
                  animate={reduce ? undefined : "show"}
                  variants={heroContainer}
                >
                  <span className="block">
                    <motion.span className="block" variants={heroLine}>
                      Keys that
                    </motion.span>
                  </span>
                  <span className="block">
                    <motion.span className="block" variants={heroLine}>
                      cannot be
                    </motion.span>
                  </span>
                  <span className="block">
                    <motion.span className="block" variants={heroLine}>
                      <em className="italic">copied</em>
                      <span className="text-laser-ink">.</span>
                    </motion.span>
                  </span>
                </motion.h1>

                <motion.div
                  initial={reduce ? false : { opacity: 0, y: 16 }}
                  animate={reduce ? undefined : { opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.42, ease: "easeOut" }}
                >
                  <p className="mt-7 max-w-[54ch] text-[17px] leading-[1.55] text-ink sm:text-lg">
                    Q/KEY is a BB84 key-distribution channel for agent-to-agent
                    channels. Interception disturbs the quantum state; Q/KEY
                    detects it and aborts.
                  </p>

                  <div className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-5">
                    <a
                      href="#channel"
                      className="group inline-flex items-center justify-center gap-3 border border-ink bg-ink px-5 py-4 font-mono text-[10px] uppercase tracking-[0.1em] text-cream transition-colors hover:border-laser hover:bg-laser hover:text-ink sm:text-[11px]"
                    >
                      RUN HANDSHAKE
                      <span
                        aria-hidden="true"
                        className="transition-transform group-hover:translate-x-1"
                      >
                        →
                      </span>
                    </a>
                    <a
                      href="#protocol"
                      className="inline-flex items-center gap-2 border-b border-ink pb-2 font-mono text-[10px] uppercase tracking-[0.1em] text-ink transition-colors hover:border-laser-ink hover:text-laser-ink sm:text-[11px]"
                    >
                      READ PROTOCOL
                      <span aria-hidden="true">↓</span>
                    </a>
                  </div>

                  <p className="mt-8 flex items-center gap-2 font-mono text-[8px] uppercase tracking-[0.12em] text-olive sm:text-[9px]">
                    <span aria-hidden="true" className="h-1.5 w-1.5 bg-laser" />
                    NO ACCOUNT / NO STORED KEYS
                  </p>
                </motion.div>
              </div>

              <aside
                aria-label="Protocol specification"
                className="flex min-w-0 flex-col border-t border-rule pt-8 md:col-span-4 md:border-l md:border-t-0 md:pl-8 md:pt-0 lg:pl-10"
              >
                <div className="flex items-center justify-between border-b border-ink pb-3 font-mono text-[9px] uppercase tracking-[0.12em] sm:text-[10px]">
                  <span className="flex items-center gap-2">
                    <span aria-hidden="true" className="h-2 w-2 bg-laser" />
                    SYSTEM SPEC
                  </span>
                  <span className="text-olive">0.1</span>
                </div>

                <dl>
                  {specs.map((spec) => (
                    <div
                      key={spec.label}
                      className="flex items-baseline justify-between gap-4 border-b border-rule py-4 last:border-ink"
                    >
                      <dt className="font-mono text-[9px] uppercase tracking-[0.12em] text-olive sm:text-[10px]">
                        {spec.label}
                      </dt>
                      <dd className="text-right font-mono text-[clamp(0.95rem,1.4vw,1.2rem)] leading-tight text-ink">
                        {spec.value}
                        {spec.unit ? (
                          <span className="mt-1 block font-mono text-[8px] uppercase tracking-[0.1em] text-olive sm:text-[9px]">
                            {spec.unit}
                          </span>
                        ) : null}
                      </dd>
                    </div>
                  ))}
                </dl>

                <p className="mt-auto pt-5 font-mono text-[8px] uppercase tracking-[0.12em] text-olive sm:text-[9px]">
                  BB84 / 48-QUBIT FRAME / AES-256-GCM
                </p>
              </aside>
            </div>

            <div className="mt-12 border-t border-rule pt-5 sm:mt-16">
              <div className="flex flex-wrap items-baseline justify-between gap-2 font-mono text-[9px] uppercase tracking-[0.12em] text-olive sm:text-[10px]">
                <span>FIG. 01 — OPTICAL SCHEMATIC</span>
                <span>SINGLE PHOTON / RANDOM BASIS</span>
              </div>
              <OpticalRail />
            </div>
          </div>
        </section>

        <section
          id="channel"
          aria-labelledby="channel-title"
          className="scroll-mt-[104px] border-b border-rule md:scroll-mt-[68px]"
        >
          <div className={`${container} py-20 sm:py-28 lg:py-32`}>
            <SectionHead
              index="01"
              label="CHANNEL"
              titleId="channel-title"
              title={
                <>
                  Run the exchange.{" "}
                  <em className="italic">Watch the error rate.</em>
                </>
              }
              intro="Every frame runs BB84 end to end: Alice prepares 48 single-photon states, Bob measures in random bases, and both sides compare notes. Toggle Eve to watch the error rate move."
            />

            <Reveal className="mt-10 sm:mt-14" delay={0.05}>
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 font-mono text-[9px] uppercase tracking-[0.12em] text-olive sm:text-[10px]">
                <span>FIG. 02 — INTERACTIVE EXCHANGE</span>
                <span>ALICE → BOB / BB84</span>
              </div>
              <div className="overflow-hidden bg-panel">
                <HandshakeDemo />
              </div>
            </Reveal>
          </div>
        </section>

        <section
          id="protocol"
          aria-labelledby="protocol-title"
          className="scroll-mt-[104px] border-b border-rule md:scroll-mt-[68px]"
        >
          <div className={`${container} py-20 sm:py-28 lg:py-32`}>
            <SectionHead
              index="02"
              label="PROTOCOL"
              titleId="protocol-title"
              title={
                <>
                  Four steps. <em className="italic">One shared key.</em>
                </>
              }
              intro="The exchange is deliberately simple. The hard part is what the error rate proves."
            />

            <Reveal className="mt-12 sm:mt-14" delay={0.05}>
              <ol className="grid grid-cols-1 border-b border-ink sm:grid-cols-2 lg:grid-cols-4">
                {steps.map((step) => (
                  <li
                    key={step.number}
                    className="flex min-w-0 flex-col border-t border-rule px-0 py-7 first:border-t-ink sm:border-r sm:border-t-ink sm:px-6 sm:even:border-r-0 sm:first:pl-0 lg:border-l lg:border-r-0 lg:border-rule lg:px-8 lg:first:border-l-0 lg:first:pl-0"
                  >
                    <div className="flex items-center gap-4">
                      <span className="bg-laser px-1.5 py-0.5 font-mono text-[11px] font-medium leading-none text-ink">
                        {step.number}
                      </span>
                      <span aria-hidden="true" className="h-px flex-1 bg-rule" />
                    </div>
                    <h3 className="mt-8 font-display text-[clamp(1.8rem,2.8vw,2.6rem)] font-normal leading-none tracking-[-0.01em] text-ink">
                      {step.title}
                    </h3>
                    <p className="mt-3 max-w-[30ch] text-[14px] leading-[1.55] text-ink/80">
                      {step.copy}
                    </p>
                    <span className="mt-8 block font-mono text-[8px] uppercase tracking-[0.1em] text-olive sm:text-[9px]">
                      {step.tag}
                    </span>
                  </li>
                ))}
              </ol>
            </Reveal>
          </div>
        </section>

        <section
          id="threat"
          aria-labelledby="threat-title"
          className="scroll-mt-[104px] border-b border-rule md:scroll-mt-[68px]"
        >
          <div className={`${container} py-20 sm:py-28 lg:py-32`}>
            <SectionHead
              index="03"
              label="THREAT"
              titleId="threat-title"
              large
              title={
                <>
                  Harvest now.
                  <span className="block">
                    <em className="italic">Decrypt later.</em>
                  </span>
                </>
              }
              intro="A recorded ciphertext is not a dead secret. It is a secret with a deadline."
            />

            <div className="mt-10 grid md:grid-cols-12">
              <div className="md:col-span-10 md:col-start-3 md:border-l md:border-rule md:pl-8 lg:pl-12">
                <Reveal className="grid gap-10" delay={0.05}>
                  <div className="grid max-w-[82ch] gap-8 sm:grid-cols-2 md:gap-12">
                    <p className="text-[15px] leading-[1.6] text-ink/80 sm:text-base">
                      A long-lived secret is a standing invitation. An
                      adversary can record encrypted traffic today and wait for
                      the compute to catch up. If the key can be copied or
                      derived later, the ciphertext is already lost.
                    </p>
                    <p className="text-[15px] leading-[1.6] text-ink/80 sm:text-base">
                      Quantum states cannot be cloned. Any attempt to measure a
                      photon in transit disturbs it, and BB84 converts that
                      disturbance into a detectable error rate. The channel
                      itself becomes the alarm.
                    </p>
                  </div>

                  <div className="max-w-[82ch] border-t border-ink pt-5">
                    <p className="text-[14px] leading-[1.6] text-ink sm:text-[15px]">
                      <span
                        aria-hidden="true"
                        className="mr-2 inline-grid h-[18px] w-[18px] place-items-center bg-laser align-[1px] font-mono text-[11px] text-ink"
                      >
                        !
                      </span>
                      <strong className="font-semibold">
                        The channel is the alarm.
                      </strong>{" "}
                      Every measurement leaves a trace. BB84 turns that trace
                      into an error rate, and the error rate decides whether the
                      key survives.
                    </p>
                  </div>

                  <div className="flex max-w-[82ch] flex-wrap gap-x-8 gap-y-3 border-t border-rule pt-4 font-mono text-[9px] uppercase tracking-[0.12em] text-olive sm:text-[10px]">
                    <span>01 RECORD CIPHERTEXT</span>
                    <span>02 WAIT FOR COMPUTE</span>
                    <span>03 DECRYPT LATER</span>
                  </div>
                </Reveal>
              </div>
            </div>
          </div>
        </section>

        <section
          id="spec"
          aria-labelledby="spec-title"
          className="scroll-mt-[104px] border-b border-rule md:scroll-mt-[68px]"
        >
          <div className={`${container} py-20 sm:py-28 lg:py-32`}>
            <SectionHead
              index="04"
              label="SPEC"
              titleId="spec-title"
              title={
                <>
                  What the channel <em className="italic">actually does.</em>
                </>
              }
              intro="A fixed frame size, an explicit abort rule, and a key derived from the surviving bits. The values below describe each run."
            />

            <Reveal className="mt-12 sm:mt-14" delay={0.05}>
              <div className="border-t border-ink">
                <div className="hidden grid-cols-[1.2fr_1fr_2fr] gap-6 border-b border-rule py-2.5 font-mono text-[9px] uppercase tracking-[0.12em] text-olive sm:grid sm:text-[10px]">
                  <span>PARAMETER</span>
                  <span>VALUE</span>
                  <span>NOTE</span>
                </div>

                <dl>
                  {sheetRows.map((row) => (
                    <div
                      key={row.parameter}
                      className="grid gap-1 border-b border-rule py-4 sm:grid-cols-[1.2fr_1fr_2fr] sm:items-baseline sm:gap-6"
                    >
                      <dt className="font-mono text-[9px] uppercase tracking-[0.12em] text-olive sm:text-[10px]">
                        {row.parameter}
                      </dt>
                      <dd className="font-mono text-[13px] tabular-nums text-ink">
                        {row.value}
                      </dd>
                      <dd className="text-[13px] leading-relaxed text-olive sm:text-sm">
                        {row.note}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>

              <p className="mt-6 max-w-[76ch] font-mono text-[9px] leading-[1.7] tracking-[0.02em] text-olive sm:text-[10px]">
                Eve uses an intercept-resend attack. QBER is computed across
                the sifted bits in the current frame; the surviving bits are
                hashed into the key.
              </p>
            </Reveal>
          </div>
        </section>

        <section
          aria-labelledby="token-title"
          className="border-b border-ink border-t-2 border-t-laser"
        >
          <div className={`${container} py-12 sm:py-16`}>
            <div className="grid gap-8 md:grid-cols-[1.2fr_1fr_1fr] md:gap-0">
              <div className="md:pr-8">
                <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-olive sm:text-[10px]">
                  TOKEN
                </span>
                <h2
                  id="token-title"
                  className="mt-2 font-display text-[clamp(3.5rem,7vw,6rem)] font-normal leading-[0.8] tracking-[-0.02em] text-laser-ink"
                >
                  QKEY
                </h2>
                <p className="mt-4 max-w-[28ch] text-[13px] leading-relaxed text-olive">
                  QKEY / channel access.
                </p>
              </div>

              <div className="border-t border-rule pt-5 md:border-l md:border-t-0 md:px-8 md:pt-0">
                <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-olive sm:text-[10px]">
                  CHANNEL
                </span>
                <strong className="mt-3 block font-mono text-sm font-normal tracking-[0.02em] text-ink">
                  QKEY ACCESS
                </strong>
                <span className="mt-4 block font-mono text-[8px] uppercase tracking-[0.1em] text-olive sm:text-[9px]">
                  BB84 / 48-QUBIT FRAME
                </span>
              </div>

              <div className="border-t border-rule pt-5 md:border-l md:border-t-0 md:px-8 md:pt-0">
                <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-olive sm:text-[10px]">
                  CONTRACT
                </span>
                <strong className="mt-3 block break-all font-mono text-sm font-normal tracking-[0.02em] text-ink">
                  {contractDisplay}
                </strong>
              </div>
            </div>

          </div>
        </section>
      </main>

      <footer className="border-t border-ink">
        <div className={`${container} py-8`}>
          <div className="grid gap-6 md:grid-cols-12 md:gap-0">
            <div className="font-mono text-[15px] font-bold tracking-[0.06em] text-ink md:col-span-2">
              Q<span className="text-laser-ink">/</span>KEY
            </div>
            <p className="max-w-[70ch] text-[12px] leading-[1.6] text-olive sm:text-[13px] md:col-span-8">
              Q/KEY is a BB84 key-distribution channel for agent-to-agent
              systems.
            </p>
            <div className="flex gap-4 font-mono text-[9px] uppercase tracking-[0.1em] text-olive md:col-span-2 md:justify-end">
              <span>2026</span>
              <span aria-hidden="true">·</span>
              <span>0.1</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
