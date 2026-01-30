'use client'

import { createContext, useContext } from 'react'
import type { ReactNode, Dispatch, SetStateAction } from 'react'
import type { AreaFilter } from '@/lib/types'

export type DensityMode = 'active' | 'terminated' | 'both' | 'lifetime'
export type AccountType = 'residential' | 'commercial'

export interface FilterContextValue {
  areaFilter: AreaFilter
  setAreaFilter: Dispatch<SetStateAction<AreaFilter>>
  densityMode: DensityMode
  setDensityMode: Dispatch<SetStateAction<DensityMode>>
  accountType: AccountType
  setAccountType: Dispatch<SetStateAction<AccountType>>
}

const FilterContext = createContext<FilterContextValue | null>(null)

export function FilterProvider({
  value,
  children,
}: {
  value: FilterContextValue
  children: ReactNode
}) {
  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>
}

export function useFilterContext() {
  const context = useContext(FilterContext)
  if (!context) {
    throw new Error('useFilterContext must be used within FilterProvider')
  }
  return context
}
