import { useEffect, useId, useRef, useState } from "react";
import {
  ABORT_THRESHOLD,
  PHASES,
  QUBIT_COUNT,
  buildFrame,
  bytesToBase64,
  fingerprintFromDigest,
  phaseForRevealed,
  qberPercent,
  siftedBitString,
  type Frame,
} from "../lib/bb84";

type RunState = "idle" | "running" | "deriving" | "secure" | "aborted";
type PhaseStatus = "idle" | "active" | "done";

type Session = {
  digest: ArrayBuffer;
};

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "unknown error";
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function padCount(value: number): string {
  return String(value).padStart(2, "0");
}

export default function HandshakeDemo() {
  const eveInputId = useId();
  const [eveEnabled, setEveEnabled] = useState(false);
  const [runState, setRunState] = useState<RunState>("idle");
  const [frame, setFrame] = useState<Frame | null>(null);
  const [revealed, setRevealed] = useState(0);
  const [phaseIndex, setPhaseIndex] = useState(-1);
  const [qber, setQber] = useState<number | null>(null);
  const [siftedCount, setSiftedCount] = useState<number | null>(null);
  const [keyLabel, setKeyLabel] = useState("—");
  const [fingerprint, setFingerprint] = useState("—");
  const [status, setStatus] = useState("IDLE");
  const [channel, setChannel] = useState("Awaiting handshake");
  const [session, setSession] = useState<Session | null>(null);
  const [payload, setPayload] = useState("The launch codes are in the lattice.");
  const [ciphertext, setCiphertext] = useState("");
  const [plaintext, setPlaintext] = useState("");
  const [payloadError, setPayloadError] = useState<string | null>(null);
  const [encrypting, setEncrypting] = useState(false);
  const [subtleAvailable] = useState<boolean>(() => {
    try {
      return typeof crypto !== "undefined" && typeof crypto.subtle?.digest === "function";
    } catch {
      return false;
    }
  });

  const timersRef = useRef<Set<number>>(new Set());
  const runIdRef = useRef(0);
  const activeRef = useRef(false);
  const encryptingRef = useRef(false);

  const isRunning = runState === "running" || runState === "deriving";
  const isSecure = runState === "secure";
  const isAborted = runState === "aborted";

  const panelStateClass = isRunning ? "is-running" : isSecure ? "is-secure" : isAborted ? "is-aborted" : "";
  const topRule = isSecure ? "border-t-cream" : isRunning || isAborted ? "border-t-laser" : "border-t-panel-line";
  const channelClass = isRunning
    ? "border-laser text-laser"
    : isSecure
      ? "border-cream bg-cream text-panel"
      : isAborted
        ? "border-laser bg-laser text-panel"
        : "border-panel-line text-panel-muted";

  const qberDisplay = qber === null ? "—" : `${qber.toFixed(1)}%`;
  const siftedDisplay = siftedCount === null ? "—" : `${siftedCount} / ${QUBIT_COUNT}`;
  const qberAccent = qber === null ? "text-panel-muted" : qber > ABORT_THRESHOLD ? "text-laser" : "text-cream";
  const siftedAccent = siftedCount === null ? "text-panel-muted" : "text-cream";
  const keyAccent =
    keyLabel === "NO KEY" || keyLabel === "ERROR"
      ? "text-laser"
      : keyLabel === "—"
        ? "text-panel-muted"
        : "text-cream";
  const statusAccent = isAborted || isRunning ? "text-laser" : isSecure ? "text-cream" : "text-panel-muted";
  const progressLabel =
    runState === "idle"
      ? "STANDBY"
      : siftedCount !== null
        ? `SIFTED ${padCount(siftedCount)} / ${QUBIT_COUNT}`
        : `${padCount(revealed)} / ${QUBIT_COUNT}`;

  const payloadStateLabel = !subtleAvailable
    ? "CRYPTO UNAVAILABLE"
    : session
      ? "KEY READY"
      : isAborted
        ? "NO KEY"
        : isSecure
          ? "KEY UNAVAILABLE"
          : "KEY REQUIRED";
  const payloadStateClass =
    !subtleAvailable || isAborted || (isSecure && !session)
      ? "text-laser"
      : session
        ? "text-cream"
        : "text-panel-muted";
  const canEncrypt = isSecure && Boolean(session) && subtleAvailable && !encrypting;
  const payloadNote = !subtleAvailable
    ? "Web Crypto unavailable — key derivation and AES-256-GCM encryption are disabled in this browser."
    : isAborted
      ? "Handshake aborted — no key is available for encryption."
      : isSecure && !session
        ? "Key derivation failed — encryption is unavailable."
        : !session && !isRunning
          ? "Run a secure handshake to derive the AES-256-GCM key."
          : null;
  const payloadNoteClass = !subtleAvailable || isAborted || (isSecure && !session) ? "text-laser" : "text-panel-muted";

  const clearTimers = () => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current.clear();
  };

  const schedule = (callback: () => void, delay: number) => {
    const timer = window.setTimeout(() => {
      timersRef.current.delete(timer);
      callback();
    }, delay);
    timersRef.current.add(timer);
  };

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
      timersRef.current.clear();
      runIdRef.current += 1;
      activeRef.current = false;
    };
  }, []);

  function startRun() {
    if (activeRef.current) {
      return;
    }

    activeRef.current = true;
    clearTimers();
    const runId = runIdRef.current + 1;
    runIdRef.current = runId;
    const model = buildFrame(eveEnabled);
    const reducedMotion = prefersReducedMotion();

    setRunState("running");
    setFrame(model);
    setRevealed(0);
    setPhaseIndex(0);
    setQber(null);
    setSiftedCount(null);
    setKeyLabel("—");
    setFingerprint("—");
    setStatus("TRANSMITTING");
    setChannel(eveEnabled ? "Quantum channel open — Eve intercepting" : "Quantum channel open");
    setSession(null);
    setCiphertext("");
    setPlaintext("");
    setPayloadError(null);
    setEncrypting(false);
    encryptingRef.current = false;

    const finish = () => {
      finishRun(model, runId);
    };

    if (reducedMotion) {
      setRevealed(QUBIT_COUNT);
      setPhaseIndex(3);
      finish();
      return;
    }

    let elapsed = 0;
    for (let index = 0; index < QUBIT_COUNT; index += 1) {
      elapsed += 18 + Math.random() * 10;
      schedule(() => {
        if (runIdRef.current !== runId) {
          return;
        }
        const count = index + 1;
        setRevealed(count);
        setPhaseIndex(phaseForRevealed(count));
      }, elapsed);
    }

    schedule(finish, elapsed + 140);
  }

  function finishRun(model: Frame, runId: number) {
    if (runIdRef.current !== runId) {
      return;
    }

    const sifted = model.siftedIndices.length;
    const rate = qberPercent(model);

    setQber(rate);
    setSiftedCount(sifted);
    setPhaseIndex(3);

    if (rate > ABORT_THRESHOLD) {
      activeRef.current = false;
      setRunState("aborted");
      setStatus("ABORTED");
      setKeyLabel("NO KEY");
      setFingerprint("No key derived — handshake aborted");
      setChannel(`QBER ${rate.toFixed(1)}% — above ${ABORT_THRESHOLD}% threshold; eavesdropper detected`);
      setSession(null);
      setCiphertext("");
      setPlaintext("");
      setPayloadError(null);
      setEncrypting(false);
      encryptingRef.current = false;
      return;
    }

    if (!subtleAvailable) {
      activeRef.current = false;
      setRunState("secure");
      setStatus("SECURE");
      setKeyLabel("NO KEY");
      setFingerprint("Web Crypto unavailable — no key derived");
      setChannel(`QBER ${rate.toFixed(1)}% — secure check passed; key derivation unavailable`);
      setSession(null);
      return;
    }

    setRunState("deriving");
    setStatus("DERIVING");
    setKeyLabel("DERIVING");
    setFingerprint("Hashing sifted bits with SHA-256…");
    setChannel(`QBER ${rate.toFixed(1)}% — within ${ABORT_THRESHOLD}% threshold; deriving key`);
    setPhaseIndex(4);
    deriveKey(siftedBitString(model), rate, runId);
  }

  function deriveKey(bits: string, rate: number, runId: number) {
    const cryptoObject = globalThis.crypto;
    const subtle = cryptoObject?.subtle;

    if (!subtle) {
      activeRef.current = false;
      setRunState("secure");
      setStatus("SECURE");
      setKeyLabel("NO KEY");
      setFingerprint("Web Crypto unavailable — no key derived");
      setChannel(`QBER ${rate.toFixed(1)}% — secure check passed; key derivation unavailable`);
      return;
    }

    subtle
      .digest("SHA-256", new TextEncoder().encode(bits))
      .then((digest) => {
        if (runIdRef.current !== runId) {
          return;
        }
        const fingerprintValue = fingerprintFromDigest(digest);
        activeRef.current = false;
        setSession({ digest });
        setKeyLabel("256-BIT");
        setFingerprint(fingerprintValue);
        setStatus("SECURE");
        setRunState("secure");
        setChannel(
          `QBER ${rate.toFixed(1)}% — within ${ABORT_THRESHOLD}% threshold; key established (AES-256-GCM ready)`,
        );
      })
      .catch((error: unknown) => {
        if (runIdRef.current !== runId) {
          return;
        }
        activeRef.current = false;
        setSession(null);
        setKeyLabel("ERROR");
        setFingerprint(`Key derivation failed — ${errorMessage(error)}`);
        setStatus("SECURE");
        setRunState("secure");
        setChannel(`QBER ${rate.toFixed(1)}% — secure check passed; key derivation failed`);
      });
  }

  function resetDemo() {
    clearTimers();
    runIdRef.current += 1;
    activeRef.current = false;
    encryptingRef.current = false;

    setRunState("idle");
    setFrame(null);
    setRevealed(0);
    setPhaseIndex(-1);
    setQber(null);
    setSiftedCount(null);
    setKeyLabel("—");
    setFingerprint("—");
    setStatus("IDLE");
    setChannel("Awaiting handshake");
    setSession(null);
    setCiphertext("");
    setPlaintext("");
    setPayloadError(null);
    setEncrypting(false);
  }

  async function encryptPayload() {
    if (encryptingRef.current || !subtleAvailable || !session) {
      return;
    }

    const cryptoObject = globalThis.crypto;
    const subtle = cryptoObject?.subtle;
    if (!subtle) {
      setPayloadError("Web Crypto unavailable — encryption is disabled.");
      return;
    }

    if (!payload) {
      setPayloadError("Enter a payload to encrypt.");
      setCiphertext("");
      setPlaintext("");
      return;
    }

    const runId = runIdRef.current;
    const activeSession = session;
    encryptingRef.current = true;
    setEncrypting(true);
    setPayloadError(null);
    setCiphertext("Encrypting…");
    setPlaintext("");

    try {
      const key = await subtle.importKey("raw", activeSession.digest, { name: "AES-GCM" }, false, [
        "encrypt",
        "decrypt",
      ]);
      const iv = new Uint8Array(12);
      cryptoObject.getRandomValues(iv);
      const encoded = new TextEncoder().encode(payload);
      const encrypted = await subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
      const cipherBytes = new Uint8Array(encrypted);
      const decrypted = await subtle.decrypt({ name: "AES-GCM", iv }, key, cipherBytes);

      if (runIdRef.current !== runId) {
        return;
      }

      const combined = new Uint8Array(iv.length + cipherBytes.length);
      combined.set(iv, 0);
      combined.set(cipherBytes, iv.length);

      setCiphertext(bytesToBase64(combined));
      setPlaintext(new TextDecoder().decode(decrypted));
    } catch (error: unknown) {
      if (runIdRef.current !== runId) {
        return;
      }
      setPayloadError(`Encryption failed — ${errorMessage(error)}`);
      setCiphertext("");
      setPlaintext("");
    } finally {
      encryptingRef.current = false;
      if (runIdRef.current === runId) {
        setEncrypting(false);
      }
    }
  }

  function phaseStatus(index: number): PhaseStatus {
    if (runState === "idle") {
      return "idle";
    }
    if (runState === "secure") {
      if (session) {
        return "done";
      }
      return index <= 3 ? "done" : "idle";
    }
    if (runState === "aborted") {
      return index <= 3 ? "done" : "idle";
    }
    if (runState === "deriving") {
      return index < 4 ? "done" : "active";
    }
    if (index < phaseIndex) {
      return "done";
    }
    if (index === phaseIndex) {
      return "active";
    }
    return "idle";
  }

  return (
    <section aria-label="BB84 handshake channel" aria-busy={isRunning} className="w-full">
      <div
        data-demo
        data-state={runState}
        className={`relative overflow-hidden border-x border-b border-t-2 border-x-panel-line border-b-panel-line bg-panel font-sans text-cream ${topRule} ${panelStateClass}`}
      >
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-panel-muted sm:px-6">
          <span className="flex items-center gap-2 text-cream">
            <span className="inline-block h-1.5 w-1.5 bg-cream" aria-hidden="true" />
            Q/KEY <span className="text-panel-muted">/ OPTICAL BENCH</span>
          </span>
          <span>
            BB84 · FRAME {String(QUBIT_COUNT).padStart(3, "0")} · QBER LIMIT {ABORT_THRESHOLD}%
          </span>
        </div>

        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-t border-panel-line px-4 py-2.5 sm:px-6">
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-cream">
            ALICE<span className="hidden text-panel-muted sm:inline"> / SOURCE</span>
          </span>
          <div className="flex min-w-0 items-center justify-center gap-2">
            <span className="hidden h-px flex-1 bg-panel-line sm:block" aria-hidden="true" />
            <span
              role="status"
              aria-live="polite"
              aria-atomic="true"
              className={`max-w-[46ch] border px-2.5 py-1 text-center font-mono text-[10px] leading-snug tracking-[0.04em] transition-colors sm:text-[10px] ${channelClass}`}
            >
              {isRunning ? (
                <span
                  className="mr-1 inline-block h-1 w-1 bg-laser align-[1px] animate-[qk-pulse_1s_ease-in-out_infinite] motion-reduce:animate-none"
                  aria-hidden="true"
                />
              ) : null}
              {channel}
            </span>
            <span className="hidden h-px flex-1 bg-panel-line sm:block" aria-hidden="true" />
          </div>
          <span className="text-right font-mono text-[10px] uppercase tracking-[0.12em] text-cream">
            BOB<span className="hidden text-panel-muted sm:inline"> / DETECTOR</span>
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
          <div className="min-w-0 border-b border-panel-line p-4 sm:p-6 lg:border-b-0 lg:border-r">
            <div className="mb-3 flex items-end justify-between gap-4 border-b border-panel-line pb-2">
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-cream">PHOTON FRAME</span>
                <span className="hidden font-mono text-[10px] uppercase tracking-[0.1em] text-panel-muted sm:inline">
                  ALICE BIT / BASIS
                </span>
              </div>
              <span className="font-mono text-[10px] tabular-nums tracking-[0.08em] text-panel-muted">
                {progressLabel}
              </span>
            </div>

            <div className="relative overflow-hidden border border-panel-line bg-panel-cell p-1.5 sm:p-2">
              <div className="grid grid-cols-8 gap-1 md:grid-cols-12">
                {Array.from({ length: QUBIT_COUNT }, (_, index) => {
                  const cell = frame?.cells[index];
                  const isRevealed = Boolean(cell) && index < revealed;
                  const isSifted = Boolean(isRevealed && cell?.sifted);
                  const isError = Boolean(isRevealed && cell?.error);
                  const label =
                    isRevealed && cell
                      ? `Photon ${index + 1}: bit ${cell.aliceBit}, basis ${cell.aliceBasis}${
                          isSifted ? ", sifted" : ""
                        }${isError ? ", error" : ""}`
                      : `Photon ${index + 1}: standby`;

                  return (
                    <div
                      key={index}
                      role="img"
                      aria-label={label}
                      className={`relative flex aspect-[1/1.12] min-w-0 flex-col items-center justify-center gap-0.5 overflow-hidden border font-mono text-[10px] leading-none transition-colors duration-150 sm:text-[11px] ${
                        !isRevealed
                          ? "border-panel-line/60 bg-panel-cell"
                          : isError
                            ? "border-laser bg-laser/10"
                            : isSifted
                              ? "border-cream bg-panel-lit"
                              : "border-panel-line bg-panel-cell"
                      }`}
                    >
                      {isRevealed && cell ? (
                        <>
                          <span className={isError ? "text-laser" : "text-cream"}>{cell.aliceBit}</span>
                          <span className={isError ? "text-laser" : "text-panel-muted"}>{cell.aliceBasis}</span>
                          {isSifted || isError ? (
                            <span
                              className={`absolute right-1 top-0.5 text-[8px] leading-none ${
                                isError ? "text-laser" : "text-cream"
                              }`}
                              aria-hidden="true"
                            >
                              {isError ? "▲" : "▪"}
                            </span>
                          ) : null}
                        </>
                      ) : (
                        <span className="h-1 w-1 bg-panel-line" aria-hidden="true" />
                      )}
                    </div>
                  );
                })}
              </div>

              {isRunning ? (
                <div
                  className="pointer-events-none absolute inset-0 animate-[qk-scan_2.2s_linear_infinite] motion-reduce:hidden"
                  aria-hidden="true"
                >
                  <div className="absolute inset-y-0 left-0 w-px bg-cream/60">
                    <span className="absolute left-[-2px] top-0 h-1.5 w-1.5 bg-laser" />
                  </div>
                </div>
              ) : null}
            </div>

            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 font-mono text-[10px] uppercase tracking-[0.1em] text-panel-muted">
              <span>
                <span className="text-cream">▪</span> SIFTED
              </span>
              <span>
                <span className="text-laser">▲</span> ERROR
              </span>
              <span>
                <span className="text-cream">+</span> RECTILINEAR / <span className="text-cream">×</span> DIAGONAL
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-1 w-1 bg-panel-line" aria-hidden="true" /> STANDBY
              </span>
            </div>

            <p className="mt-3 max-w-[62ch] font-sans text-xs leading-relaxed text-panel-muted">
              Alice and Bob compare bases after transmission and keep only matching rounds. Intercept-resend pushes
              QBER toward 25%; above 11% the run aborts.
            </p>
          </div>

          <div className="flex min-w-0 flex-col p-4 sm:p-6">
            <div className="mb-3 flex items-end justify-between gap-4 border-b border-panel-line pb-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-cream">TELEMETRY</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-panel-muted">MONITOR</span>
            </div>

            <ol className="border-t border-panel-line">
              {PHASES.map((phase, index) => {
                const state = phaseStatus(index);
                return (
                  <li
                    key={phase}
                    aria-current={state === "active" ? "step" : undefined}
                    className="flex items-center gap-3 border-b border-panel-line py-2 font-mono text-[10px] uppercase tracking-[0.1em]"
                  >
                    <span
                      className={
                        state === "active" ? "text-laser" : state === "done" ? "text-cream" : "text-panel-muted"
                      }
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className={state === "idle" ? "text-panel-muted" : "text-cream"}>{phase}</span>
                    <span className="ml-auto flex h-2 w-2 items-center justify-center">
                      {state === "done" ? (
                        <span
                          className="block h-2 w-2 -rotate-45 border-b border-l border-cream"
                          aria-hidden="true"
                        />
                      ) : state === "active" ? (
                        <span
                          className="block h-1.5 w-1.5 bg-laser animate-[qk-pulse_1s_ease-in-out_infinite] motion-reduce:animate-none"
                          aria-hidden="true"
                        />
                      ) : (
                        <span className="block h-1 w-1 bg-panel-line" aria-hidden="true" />
                      )}
                    </span>
                  </li>
                );
              })}
            </ol>

            <dl className="mt-4 grid grid-cols-2 border-l border-t border-panel-line">
              <div className="min-w-0 border-b border-r border-panel-line p-3">
                <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-panel-muted">QBER</dt>
                <dd className={`mt-1 font-mono text-lg leading-none tabular-nums sm:text-xl ${qberAccent}`}>{qberDisplay}</dd>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.08em] text-panel-muted">
                  ABORT &gt; {ABORT_THRESHOLD}%
                </p>
              </div>
              <div className="min-w-0 border-b border-r border-panel-line p-3">
                <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-panel-muted">SIFTED BITS</dt>
                <dd className={`mt-1 font-mono text-lg leading-none tabular-nums sm:text-xl ${siftedAccent}`}>{siftedDisplay}</dd>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.08em] text-panel-muted">
                  OF {QUBIT_COUNT} QUBITS
                </p>
              </div>
              <div className="min-w-0 border-b border-r border-panel-line p-3">
                <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-panel-muted">KEY</dt>
                <dd className={`mt-1 font-mono text-lg leading-none tracking-[0.02em] sm:text-xl ${keyAccent}`}>{keyLabel}</dd>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.08em] text-panel-muted">SHA-256 DIGEST</p>
              </div>
              <div className="min-w-0 border-b border-r border-panel-line p-3">
                <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-panel-muted">STATUS</dt>
                <dd className={`mt-1 font-mono text-sm leading-none tracking-[0.06em] ${statusAccent}`}>{status}</dd>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.08em] text-panel-muted">CHANNEL</p>
              </div>
            </dl>

            <div className="mt-auto border-t border-panel-line pt-4">
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-panel-muted">
                  KEY FINGERPRINT
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-panel-muted">
                  SHA-256 / 128-BIT TAG
                </span>
              </div>
              <code
                className={`mt-1.5 block min-h-[2.5rem] break-words font-mono text-xs leading-relaxed tracking-[0.06em] ${
                  session ? "text-cream" : "text-panel-muted"
                }`}
              >
                {fingerprint}
              </code>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 border-t border-panel-line px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor={eveInputId}
              className={`inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.1em] ${
                isRunning ? "cursor-not-allowed opacity-50" : "cursor-pointer"
              }`}
            >
              <input
                id={eveInputId}
                type="checkbox"
                checked={eveEnabled}
                onChange={(event) => setEveEnabled(event.target.checked)}
                disabled={isRunning}
                className="peer sr-only"
              />
              <span
                aria-hidden="true"
                className={`grid h-4 w-4 flex-none place-items-center border transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-laser ${
                  eveEnabled ? "border-laser bg-laser" : "border-panel-muted"
                }`}
              >
                {eveEnabled ? <span className="h-1.5 w-1.5 bg-panel" /> : null}
              </span>
              <span className="text-cream">Eve / intercept-resend</span>
              <span aria-hidden="true" className={eveEnabled ? "text-laser" : "text-panel-muted"}>
                {eveEnabled ? "ON" : "OFF"}
              </span>
            </label>
            <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-panel-muted">
              Eve measures and resends in a random basis.
            </span>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              onClick={startRun}
              disabled={isRunning}
              className="w-full border border-cream bg-cream px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-panel transition-colors hover:border-laser hover:bg-laser hover:text-panel disabled:pointer-events-none disabled:opacity-35 sm:w-auto"
            >
              Run handshake
            </button>
            <button
              type="button"
              onClick={resetDemo}
              className="w-full border border-panel-muted px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-cream transition-colors hover:border-cream disabled:pointer-events-none disabled:opacity-35 sm:w-auto"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="border-t border-panel-line px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-panel-line pb-2 font-mono text-[10px] uppercase tracking-[0.12em]">
            <span className="text-cream">PAYLOAD / AES-256-GCM</span>
            <span className={payloadStateClass}>{payloadStateLabel}</span>
          </div>

          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="min-w-0 flex-1">
              <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.12em] text-panel-muted">
                PLAINTEXT INPUT
              </span>
              <input
                type="text"
                value={payload}
                onChange={(event) => setPayload(event.target.value)}
                disabled={encrypting}
                autoComplete="off"
                spellCheck={false}
                className="w-full border border-panel-line bg-panel-cell px-3 py-2.5 font-mono text-[13px] leading-relaxed text-cream caret-laser outline-none transition-colors placeholder:text-panel-muted focus:border-cream disabled:opacity-50"
              />
            </label>
            <button
              type="button"
              onClick={() => {
                void encryptPayload();
              }}
              disabled={!canEncrypt}
              className="w-full border border-cream px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-cream transition-colors hover:bg-cream hover:text-panel disabled:pointer-events-none disabled:opacity-35 sm:w-auto"
            >
              {encrypting ? "Encrypting…" : "Encrypt payload"}
            </button>
          </div>

          {payloadError ? (
            <p className="mt-2 font-mono text-[10px] leading-relaxed text-laser">{payloadError}</p>
          ) : payloadNote ? (
            <p className={`mt-2 font-mono text-[10px] leading-relaxed ${payloadNoteClass}`}>{payloadNote}</p>
          ) : null}

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="min-w-0">
              <span className="block font-mono text-[10px] uppercase tracking-[0.12em] text-panel-muted">
                CIPHERTEXT / BASE64
              </span>
              <pre
                className={`mt-1.5 min-h-[4.5rem] max-h-32 overflow-auto whitespace-pre-wrap break-words border border-panel-line bg-panel-cell p-3 font-mono text-xs leading-relaxed ${
                  ciphertext ? "text-cream" : "text-panel-muted"
                }`}
              >
                {ciphertext || "—"}
              </pre>
              <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.08em] text-panel-muted">
                12-BYTE IV PREFIX
              </span>
            </div>
            <div className="min-w-0">
              <span className="block font-mono text-[10px] uppercase tracking-[0.12em] text-panel-muted">
                DECRYPTED / UTF-8
              </span>
              <pre
                className={`mt-1.5 min-h-[4.5rem] max-h-32 overflow-auto whitespace-pre-wrap break-words border border-panel-line bg-panel-cell p-3 font-mono text-xs leading-relaxed ${
                  plaintext ? "text-cream" : "text-panel-muted"
                }`}
              >
                {plaintext || "—"}
              </pre>
              <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.08em] text-panel-muted">
                LOCAL VERIFICATION
              </span>
            </div>
          </div>
        </div>

        <footer className="flex flex-col gap-1 border-t border-panel-line px-4 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-panel-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span>BB84 / 48-QUBIT FRAME</span>
          <span>QBER THRESHOLD {ABORT_THRESHOLD}%</span>
        </footer>
      </div>
    </section>
  );
}
