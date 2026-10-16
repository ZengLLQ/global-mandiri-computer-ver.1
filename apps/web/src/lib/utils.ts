import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRupiah(amount: number | bigint): string {
  if (amount === 0 || amount === 0n) {
    return "TANYA HARGA";
  }
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount).replace(/\s+/g, " ");
}

export function formatNumber(num: number | bigint): string {
  return new Intl.NumberFormat("id-ID").format(num);
}

export function formatPriceIdr(amount: number | bigint): string {
  if (amount === 0 || amount === 0n) return "Rp 0";
  return "Rp " + new Intl.NumberFormat("id-ID").format(amount);
}
