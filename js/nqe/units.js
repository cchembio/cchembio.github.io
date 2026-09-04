// Atomic units internally. Convert only at the display boundary.
// Every physical constant in the NQE apps lives here and nowhere else.

export const MASS = { H: 1836.152673, D: 3670.482967, T: 5496.921535 }; // m_e

export const BOHR_ANG      = 0.529177210903;
export const HARTREE_KJMOL = 2625.4996;
export const HARTREE_CM    = 219474.6314;
export const HARTREE_EV    = 27.211386;
export const KB_HARTREE    = 3.166811563e-6;   // hartree / K
export const HBAR = 1;
export const AU_TIME_S   = 2.4188843265857e-17;  // s per atomic unit of time

export function angToBohr(x)    { return x / BOHR_ANG; }
export function bohrToAng(x)    { return x * BOHR_ANG; }
export function cmToHartree(e)  { return e / HARTREE_CM; }
export function hartreeToCm(e)  { return e * HARTREE_CM; }
export function kJmolToHartree(e) { return e / HARTREE_KJMOL; }
export function hartreeToKJmol(e) { return e * HARTREE_KJMOL; }
export function hartreeToEv(e)  { return e * HARTREE_EV; }
export function kT(T)           { return KB_HARTREE * T; }
/** rate in atomic units -> s^-1 */
export function auToPerSecond(k) { return k / AU_TIME_S; }
