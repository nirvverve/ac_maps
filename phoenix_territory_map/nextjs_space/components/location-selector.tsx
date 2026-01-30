"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { getAllLocationKeys, getLocationConfig } from '@/config/locations.config';

interface LocationSelectorProps {
  selectedLocation: string;
  onLocationChange: (location: string) => void;
}

export function LocationSelector({ selectedLocation, onLocationChange }: LocationSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <Label htmlFor="location-select" className="text-sm font-medium whitespace-nowrap">
        Location:
      </Label>
      <Select value={selectedLocation} onValueChange={onLocationChange}>
        <SelectTrigger id="location-select" className="w-[220px]">
          <SelectValue placeholder="Select location" />
        </SelectTrigger>
        <SelectContent>
          {getAllLocationKeys().map(locationKey => {
            const config = getLocationConfig(locationKey)
            return (
              <SelectItem key={locationKey} value={locationKey}>
                {config.label}
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>
    </div>
  );
}
