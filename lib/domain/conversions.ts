const FEET_PER_METER = 3.28084;
const INCHES_PER_METER = 39.3701;

export function metersToFeet(meters: number): number {
  return meters * FEET_PER_METER;
}

export function feetToMeters(feet: number): number {
  return feet / FEET_PER_METER;
}

export function metersToInches(meters: number): number {
  return meters * INCHES_PER_METER;
}

export function roundTo(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function metersToDisplay(meters: number): string {
  return `${roundTo(meters, 2)} m / ${roundTo(metersToFeet(meters), 2)} ft`;
}
