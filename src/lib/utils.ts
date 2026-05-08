import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(timestamp: any): string {
  if (!timestamp) return 'N/A';
  try {
    const date = timestamp instanceof Date 
      ? timestamp 
      : (timestamp?.toDate ? timestamp.toDate() : new Date(timestamp));
    return date.toLocaleDateString();
  } catch (e) {
    return 'Invalid Date';
  }
}

export function formatTime(timestamp: any): string {
  if (!timestamp) return 'N/A';
  try {
    const date = timestamp instanceof Date 
      ? timestamp 
      : (timestamp?.toDate ? timestamp.toDate() : new Date(timestamp));
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return '--:--';
  }
}
