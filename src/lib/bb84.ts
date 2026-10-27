export const QUBIT_COUNT = 48;
export const ABORT_THRESHOLD = 11;

export const PHASES = ["PREPARE", "MEASURE", "SIFT", "CHECK", "DERIVE"] as const;

export type Basis = "+" | "×";
export type Bit = 0 | 1;
export type RandomSource = () => number;

export type PhotonCell = {
  aliceBit: Bit;
  aliceBasis: Basis;
  bobBit: Bit;
  bobBasis: Basis;
  eveBasis: Basis | null;
  sifted: boolean;
  error: boolean;
};

export type Frame = {
  cells: PhotonCell[];
  siftedIndices: number[];
  errorIndices: number[];
  eveEnabled: boolean;
};

function defaultRandom(): number {
  const cryptoObject = globalThis.crypto;
  if (cryptoObject && typeof cryptoObject.getRandomValues === "function") {
    const values = new Uint32Array(1);
    cryptoObject.getRandomValues(values);
    return values[0] / 4294967296;
  }
  return Math.random();
}

function randomBit(random: RandomSource): Bit {
  return random() < 0.5 ? 0 : 1;
}

function randomBasis(random: RandomSource): Basis {
  return random() < 0.5 ? "+" : "×";
}

export function buildFrame(eveEnabled: boolean, random: RandomSource = defaultRandom): Frame {
  const cells: PhotonCell[] = [];
  const siftedIndices: number[] = [];
  const errorIndices: number[] = [];

  for (let index = 0; index < QUBIT_COUNT; index += 1) {
    const aliceBit = randomBit(random);
    const aliceBasis = randomBasis(random);
    const bobBasis = randomBasis(random);
    let eveBasis: Basis | null = null;
    let transmittedBit = aliceBit;
    let transmittedBasis = aliceBasis;

    if (eveEnabled) {
      eveBasis = randomBasis(random);
      transmittedBit = eveBasis === aliceBasis ? aliceBit : randomBit(random);
      transmittedBasis = eveBasis;
    }

    const bobBit = bobBasis === transmittedBasis ? transmittedBit : randomBit(random);
    const sifted = aliceBasis === bobBasis;
    const error = sifted && bobBit !== aliceBit;

    if (sifted) {
      siftedIndices.push(index);
      if (error) {
        errorIndices.push(index);
      }
    }

    cells.push({
      aliceBit,
      aliceBasis,
      bobBit,
      bobBasis,
      eveBasis,
      sifted,
      error,
    });
  }

  return {
    cells,
    siftedIndices,
    errorIndices,
    eveEnabled,
  };
}

export function qberPercent(frame: Frame): number {
  if (frame.siftedIndices.length === 0) {
    return 0;
  }
  return (frame.errorIndices.length / frame.siftedIndices.length) * 100;
}

export function siftedBitString(frame: Frame): string {
  return frame.siftedIndices.map((index) => String(frame.cells[index].aliceBit)).join("");
}

export function phaseForRevealed(revealed: number): number {
  const fraction = Math.min(Math.max(revealed, 0), QUBIT_COUNT) / QUBIT_COUNT;
  if (fraction >= 0.8) {
    return 3;
  }
  if (fraction >= 0.55) {
    return 2;
  }
  if (fraction >= 0.25) {
    return 1;
  }
  return 0;
}

export function toHex(bytes: Uint8Array): string {
  let hex = "";
  for (const byte of bytes) {
    hex += byte.toString(16).padStart(2, "0");
  }
  return hex;
}

export function groupHex(hex: string, size = 4): string {
  const groups: string[] = [];
  for (let index = 0; index < hex.length; index += size) {
    groups.push(hex.slice(index, index + size));
  }
  return groups.join(" ");
}

export function fingerprintFromDigest(digest: ArrayBuffer): string {
  return groupHex(toHex(new Uint8Array(digest)).slice(0, 32));
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return globalThis.btoa(binary);
}
