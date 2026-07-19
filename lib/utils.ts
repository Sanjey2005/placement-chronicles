import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCompensation(amount: number | undefined | null, roleType?: string): string {
  if (amount === undefined || amount === null) return 'N/A';
  if (amount === 0) return 'Prefer not to say';

  const formatter = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
  });

  const formattedAmount = formatter.format(amount);

  if (roleType === 'INTERNSHIP' || roleType === 'SUMMER_INTERNSHIP') {
    return `${formattedAmount} / month`;
  }

  return `${formattedAmount} LPA`;
}

/**
 * Average CTC in LPA, normalising internship stipends (x12/100000).
 * Returns null (not 0) when there's no data, so callers can tell "no data"
 * apart from a real zero CTC. This math was copy-pasted in three places.
 */
export function averageCTC(
  experiences: Array<{ ctc?: number; roleType?: string }>
): number | null {
  let total = 0;
  let n = 0;
  for (const e of experiences) {
    const ctc = e.ctc ?? 0;
    if (ctc > 0) {
      total +=
        e.roleType === 'INTERNSHIP' || e.roleType === 'SUMMER_INTERNSHIP'
          ? (ctc * 12) / 100000
          : ctc;
      n++;
    }
  }
  return n > 0 ? total / n : null;
}

/** Share of experiences that ended in an offer, 0-100. */
export function selectionRate(experiences: Array<{ finalVerdict?: string }>): number {
  if (experiences.length === 0) return 0;
  const selected = experiences.filter((e) => e.finalVerdict === 'selected').length;
  return Math.round((selected / experiences.length) * 100);
}

/** Typical number of interview rounds. null when no data. */
export function averageRounds(experiences: Array<{ rounds?: unknown[] }>): number | null {
  const counts = experiences.map((e) => e.rounds?.length ?? 0).filter((n) => n > 0);
  if (counts.length === 0) return null;
  return counts.reduce((a, b) => a + b, 0) / counts.length;
}

/** "2 months ago" — createdAt is sorted by but was never displayed. */
export function relativeTime(date: string | Date | undefined): string | null {
  if (!date) return null;
  const then = new Date(date).getTime();
  if (Number.isNaN(then)) return null;

  const seconds = Math.round((Date.now() - then) / 1000);
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ];
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  for (const [unit, secs] of units) {
    if (Math.abs(seconds) >= secs) return rtf.format(-Math.round(seconds / secs), unit);
  }
  return rtf.format(0, 'minute');
}
