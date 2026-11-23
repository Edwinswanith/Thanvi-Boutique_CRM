/** Characters encodable by Code 39 ("Code 3 of 9"). `*` is the start/stop char and is excluded. */
const CODE39_PATTERN = /^[A-Z0-9 \-.$/+%]*$/;

export function isCode39Safe(value: string): boolean {
  return CODE39_PATTERN.test(value);
}

export function toCode39(value: string): string {
  return value.trim().toUpperCase();
}

export function formatSeriesCode(prefix: string, num: number, padding: number): string {
  return `${prefix}${String(num).padStart(padding, "0")}`;
}

/** Per-piece item code: `<SKU>-<NNN>`, e.g. TB1000-001. */
export function itemCode(sku: string, pieceNo: number, padding = 3): string {
  return `${sku}-${String(pieceNo).padStart(padding, "0")}`;
}
