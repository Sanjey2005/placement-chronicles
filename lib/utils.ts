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
