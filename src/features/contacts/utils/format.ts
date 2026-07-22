/** Truncates a Stellar address for display: `GABC…WXYZ`. */
export function formatContactAddress(address: string): string {
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}
