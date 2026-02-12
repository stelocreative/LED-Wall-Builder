const FEET_PER_METER = 3.28084;
const INCHES_PER_METER = 39.3701;
const MM_PER_INCH = 25.4;

export function roundTo(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function metersToFeet(meters: number): number {
  return meters * FEET_PER_METER;
}

export function feetToMeters(feet: number): number {
  return feet / FEET_PER_METER;
}

export function metersToInches(meters: number): number {
  return meters * INCHES_PER_METER;
}

export function inchesToMeters(inches: number): number {
  return inches / INCHES_PER_METER;
}

export function mmToInches(mm: number): number {
  return mm / MM_PER_INCH;
}

export function inchesToMm(inches: number): number {
  return inches * MM_PER_INCH;
}

export function kgToLbs(kg: number): number {
  return kg * 2.20462;
}

export function lbsToKg(lbs: number): number {
  return lbs / 2.20462;
}

export function metersToFeetInchesLabel(meters: number): string {
  const totalInches = metersToInches(meters);
  const feet = Math.floor(totalInches / 12);
  const inches = roundTo(totalInches - feet * 12, 1);
  return `${feet}' ${inches}\"`;
}

export function feetInchesToMeters(feet: number, inches: number): number {
  return feetToMeters(feet + inches / 12);
}

export function metersFeetLabel(meters: number): string {
  return `${roundTo(meters, 2)}m / ${roundTo(metersToFeet(meters), 2)}ft`;
}

export function mmInchLabel(mm: number): string {
  return `${roundTo(mm, 1)}mm / ${roundTo(mmToInches(mm), 2)}in`;
}
