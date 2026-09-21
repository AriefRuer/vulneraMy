// Human-readable sector names, mapped from the 3-letter DOSM TSA codes.
// Source: clean data `decent_work` / `allocation` industry labels.
export const SECTOR_NAMES: Record<string, string> = {
  ACC: 'Accommodation',
  CSR: 'Arts & Entertainment',
  FNB: 'Food & Beverage',
  FUE: 'Wholesale & Retail',
  RET: 'Retail Trade',
  SVC: 'Other Services',
  TAG: 'Admin & Support',
  TRN: 'Transport & Storage',
}

export function sectorName(code: string): string {
  return SECTOR_NAMES[code] || code
}