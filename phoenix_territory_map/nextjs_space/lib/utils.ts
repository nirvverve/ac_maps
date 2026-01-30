import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
}

export function getAreaDisplayName(area: string): string {
  const areaMap: Record<string, string> = {
    'West': 'APS of Glendale',
    'Central': 'APS of Scottsdale',
    'East': 'APS of Chandler',
    'Tucson': 'APS of Tucson',
    'Commercial': 'APS - Commercial',
    'Mesa': 'APS of Mesa',
    'Goodyear': 'APS of Goodyear',
    'Cave Creek': 'APS of Cave Creek'
  }
  return areaMap[area] || area
}