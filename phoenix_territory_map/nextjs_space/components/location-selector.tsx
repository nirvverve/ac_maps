"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

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
          <SelectItem value="arizona">Phoenix / Tucson AZ</SelectItem>
          <SelectItem value="dallas">Dallas TX</SelectItem>
          <SelectItem value="orlando">Orlando FL</SelectItem>
          <SelectItem value="jacksonville">Jacksonville FL</SelectItem>
          <SelectItem value="portCharlotte">Port Charlotte FL</SelectItem>
          <SelectItem value="miami">Miami FL</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
