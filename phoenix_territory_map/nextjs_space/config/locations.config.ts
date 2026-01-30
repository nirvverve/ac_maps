/**
 * Centralized location configuration for all geographic markets.
 *
 * Config-driven architecture: All location-specific behavior is defined here.
 * Adding a new location requires only updating this config + uploading data.
 * No code changes needed for new markets.
 *
 * bd-1n8
 */

import type { LocationConfig, ViewModeKey, DataEndpoints, ColorThreshold } from '../lib/types'

// ---------------------------------------------------------------------------
// Location Configurations
// ---------------------------------------------------------------------------

export const LOCATIONS: Record<string, LocationConfig> = {
  arizona: {
    key: 'arizona',
    label: 'Phoenix / Tucson, AZ',
    shortLabel: 'Arizona',
    center: { lat: 33.4484, lng: -112.0740 },
    zoom: 9,
    territories: [
      { key: 'West', label: 'Phoenix West', color: '#3B82F6' },      // Blue
      { key: 'Central', label: 'Phoenix Central', color: '#10B981' }, // Green
      { key: 'East', label: 'Phoenix East', color: '#F59E0B' },       // Orange
      { key: 'Tucson', label: 'Tucson', color: '#A855F7' },          // Purple
      { key: 'Commercial', label: 'Commercial', color: '#FBBF24' },   // Amber
    ],
    availableViews: [
      'territory',
      'density',
      'marketSize',
      'revenue',
      'routes',
      'customerLookup',
      'employeeLocations',
      'commercial',
      'ancillarySales',
    ],
    dataEndpoints: {
      territory: '/phoenix-tucson-map-data.json',
      density: '/phoenix-density-data.json',
      marketSize: '/phoenix-market-data.json',
      revenue: '/phoenix-revenue-data.json',
      routes: '/phoenix-routes-data.json',
      customers: '/phoenix-customers-data.json',
      employees: '/phoenix-employees-data.json',
      commercial: '/phoenix-commercial-data.json',
      ancillarySales: '/phoenix-ancillary-data.json',
    },
    hasActiveTerritoryBreakup: true,
    colorThresholds: {
      active: {
        residential: {
          thresholds: [
            { min: 0, max: 0, color: '#f0fdf4' },     // 0
            { min: 1, max: 5, color: '#d1fae5' },     // 1-5
            { min: 6, max: 15, color: '#86efac' },    // 6-15
            { min: 16, max: 30, color: '#22c55e' },   // 16-30
            { min: 31, max: 50, color: '#16a34a' },   // 31-50
            { min: 51, max: Infinity, color: '#15803d' }, // 51+
          ]
        }
      },
      terminated: {
        residential: {
          thresholds: [
            { min: 0, max: 0, color: '#fef2f2' },     // 0
            { min: 1, max: 20, color: '#fecaca' },    // 1-20
            { min: 21, max: 50, color: '#fca5a5' },   // 21-50
            { min: 51, max: 100, color: '#f87171' },  // 51-100
            { min: 101, max: 200, color: '#dc2626' }, // 101-200
            { min: 201, max: Infinity, color: '#991b1b' }, // 201+
          ]
        }
      },
      lifetime: {
        thresholds: [
          { min: 0, max: 0, color: '#fef2f2' },       // 0
          { min: 1, max: 11, color: '#fbbf24' },      // <1 year
          { min: 12, max: 23, color: '#a3e635' },     // 1-2 years
          { min: 24, max: 35, color: '#86efac' },     // 2-3 years
          { min: 36, max: 59, color: '#22c55e' },     // 3-5 years
          { min: 60, max: 119, color: '#16a34a' },    // 5-10 years
          { min: 120, max: Infinity, color: '#15803d' }, // 10+ years
        ]
      },
      churn: {
        thresholds: [
          { min: 0, max: 0, color: '#f0fdf4' },       // 0%
          { min: 1, max: 50, color: '#d1fae5' },      // 1-50%
          { min: 51, max: 70, color: '#fef3c7' },     // 51-70%
          { min: 71, max: 85, color: '#fbbf24' },     // 71-85%
          { min: 86, max: 95, color: '#f97316' },     // 86-95%
          { min: 96, max: 100, color: '#991b1b' },    // 96-100%
        ]
      }
    },
  },

  miami: {
    key: 'miami',
    label: 'Miami, FL',
    shortLabel: 'Miami',
    center: { lat: 25.7617, lng: -80.1918 },
    zoom: 10,
    territories: [
      { key: 'North', label: 'Miami North', color: '#3B82F6' },     // Blue
      { key: 'Central', label: 'Miami Central', color: '#10B981' }, // Green
      { key: 'South', label: 'Miami South', color: '#F59E0B' },     // Orange
    ],
    availableViews: [
      'territory',
      'density',
      'revenue',
      'routes',
      'customerLookup',
      'commercial',
      'ancillarySales',
      // Miami-specific scenario views
      'kmlScenario',
      'assignmentTool',
      'miamiFinal',
      'miami10pct',
      'miamiZipOptimized',
      'miamiZipOptimized2',
      'radicalReroute',
      'miamiCommercialRoutes',
      'miamiFutureCommercialRoutes',
    ],
    dataEndpoints: {
      territory: '/miami-territory-data.json',
      density: '/miami-density-data.json',
      revenue: '/miami-revenue-data.json',
      routes: '/miami-routes-data.json',
      customers: '/miami-customers-data.json',
      commercial: '/miami-commercial-data.json',
      ancillarySales: '/miami-ancillary-data.json',
      scenarios: '/miami-scenarios-data.json',
    },
    hasActiveTerritoryBreakup: true,
    colorThresholds: {
      active: {
        residential: {
          thresholds: [
            { min: 0, max: 0, color: '#f0fdf4' },     // 0
            { min: 1, max: 10, color: '#d1fae5' },    // 1-10
            { min: 11, max: 20, color: '#a7f3d0' },   // 11-20
            { min: 21, max: 35, color: '#6ee7b7' },   // 21-35
            { min: 36, max: 50, color: '#34d399' },   // 36-50
            { min: 51, max: 75, color: '#10b981' },   // 51-75
            { min: 76, max: 100, color: '#059669' },  // 76-100
            { min: 101, max: 125, color: '#047857' }, // 101-125
            { min: 126, max: Infinity, color: '#065f46' }, // 125+
          ]
        },
        commercial: {
          thresholds: [
            { min: 0, max: 0, color: '#f0fdf4' },     // 0
            { min: 1, max: 2, color: '#d1fae5' },     // 1-2
            { min: 3, max: 4, color: '#a7f3d0' },     // 3-4
            { min: 5, max: 6, color: '#6ee7b7' },     // 5-6
            { min: 7, max: 9, color: '#34d399' },     // 7-9
            { min: 10, max: 12, color: '#10b981' },   // 10-12
            { min: 13, max: 15, color: '#059669' },   // 13-15
            { min: 16, max: 18, color: '#047857' },   // 16-18
            { min: 19, max: Infinity, color: '#065f46' }, // 18+
          ]
        }
      },
      terminated: {
        residential: {
          thresholds: [
            { min: 0, max: 0, color: '#fef2f2' },     // 0
            { min: 1, max: 15, color: '#fecaca' },    // 1-15
            { min: 16, max: 30, color: '#fca5a5' },   // 16-30
            { min: 31, max: 50, color: '#f87171' },   // 31-50
            { min: 51, max: 75, color: '#ef4444' },   // 51-75
            { min: 76, max: 100, color: '#dc2626' },  // 76-100
            { min: 101, max: 150, color: '#b91c1c' }, // 101-150
            { min: 151, max: 200, color: '#991b1b' }, // 151-200
            { min: 201, max: Infinity, color: '#7f1d1d' }, // 200+
          ]
        },
        commercial: {
          thresholds: [
            { min: 0, max: 0, color: '#fef2f2' },     // 0
            { min: 1, max: 3, color: '#fecaca' },     // 1-3
            { min: 4, max: 6, color: '#fca5a5' },     // 4-6
            { min: 7, max: 9, color: '#f87171' },     // 7-9
            { min: 10, max: 12, color: '#ef4444' },   // 10-12
            { min: 13, max: 15, color: '#dc2626' },   // 13-15
            { min: 16, max: 18, color: '#b91c1c' },   // 16-18
            { min: 19, max: 21, color: '#991b1b' },   // 19-21
            { min: 22, max: Infinity, color: '#7f1d1d' }, // 21+
          ]
        }
      },
      lifetime: {
        thresholds: [
          { min: 0, max: 0, color: '#fef2f2' },       // 0
          { min: 1, max: 11, color: '#fbbf24' },      // <1 year
          { min: 12, max: 23, color: '#a3e635' },     // 1-2 years
          { min: 24, max: 35, color: '#86efac' },     // 2-3 years
          { min: 36, max: 59, color: '#22c55e' },     // 3-5 years
          { min: 60, max: 119, color: '#16a34a' },    // 5-10 years
          { min: 120, max: Infinity, color: '#15803d' }, // 10+ years
        ]
      },
      churn: {
        thresholds: [
          { min: 0, max: 0, color: '#f0fdf4' },       // 0%
          { min: 1, max: 50, color: '#d1fae5' },      // 1-50%
          { min: 51, max: 70, color: '#fef3c7' },     // 51-70%
          { min: 71, max: 85, color: '#fbbf24' },     // 71-85%
          { min: 86, max: 95, color: '#f97316' },     // 86-95%
          { min: 96, max: 100, color: '#991b1b' },    // 96-100%
        ]
      }
    },
  },

  dallas: {
    key: 'dallas',
    label: 'Dallas, TX',
    shortLabel: 'Dallas',
    center: { lat: 32.7767, lng: -96.7970 },
    zoom: 10,
    territories: [], // No active territory breakup yet
    availableViews: [
      'density',
      'revenue',
      'routes',
      'customerLookup',
      'commercial',
      'ancillarySales',
    ],
    dataEndpoints: {
      density: '/dallas-density-data.json',
      revenue: '/dallas-revenue-data.json',
      routes: '/dallas-routes-data.json',
      customers: '/dallas-customers-data.json',
      commercial: '/dallas-commercial-data.json',
      ancillarySales: '/dallas-ancillary-data.json',
    },
    hasActiveTerritoryBreakup: false,
    colorThresholds: {
      active: {
        residential: {
          thresholds: [
            { min: 0, max: 0, color: '#f0fdf4' },     // 0
            { min: 1, max: 5, color: '#d1fae5' },     // 1-5
            { min: 6, max: 10, color: '#a7f3d0' },    // 6-10
            { min: 11, max: 20, color: '#6ee7b7' },   // 11-20
            { min: 21, max: 30, color: '#34d399' },   // 21-30
            { min: 31, max: 40, color: '#10b981' },   // 31-40
            { min: 41, max: 50, color: '#059669' },   // 41-50
            { min: 51, max: Infinity, color: '#047857' }, // 50+
          ]
        },
        commercial: {
          thresholds: [
            { min: 0, max: 0, color: '#f0fdf4' },     // 0
            { min: 1, max: 1, color: '#6ee7b7' },     // 1
            { min: 2, max: Infinity, color: '#10b981' }, // 2+
          ]
        }
      },
      terminated: {
        residential: {
          thresholds: [
            { min: 0, max: 0, color: '#fef2f2' },     // 0
            { min: 1, max: 20, color: '#fecaca' },    // 1-20
            { min: 21, max: 40, color: '#fca5a5' },   // 21-40
            { min: 41, max: 60, color: '#f87171' },   // 41-60
            { min: 61, max: 80, color: '#ef4444' },   // 61-80
            { min: 81, max: 100, color: '#dc2626' },  // 81-100
            { min: 101, max: 150, color: '#b91c1c' }, // 101-150
            { min: 151, max: Infinity, color: '#991b1b' }, // 150+
          ]
        },
        commercial: {
          thresholds: [
            { min: 0, max: 0, color: '#fef2f2' },     // 0
            { min: 1, max: 2, color: '#fecaca' },     // 1-2
            { min: 3, max: 4, color: '#fca5a5' },     // 3-4
            { min: 5, max: 6, color: '#f87171' },     // 5-6
            { min: 7, max: 8, color: '#ef4444' },     // 7-8
            { min: 9, max: Infinity, color: '#dc2626' }, // 8+
          ]
        }
      },
      lifetime: {
        thresholds: [
          { min: 0, max: 0, color: '#fef2f2' },       // 0
          { min: 1, max: 11, color: '#fbbf24' },      // <1 year
          { min: 12, max: 23, color: '#a3e635' },     // 1-2 years
          { min: 24, max: 35, color: '#86efac' },     // 2-3 years
          { min: 36, max: 59, color: '#22c55e' },     // 3-5 years
          { min: 60, max: 119, color: '#16a34a' },    // 5-10 years
          { min: 120, max: Infinity, color: '#15803d' }, // 10+ years
        ]
      },
      churn: {
        thresholds: [
          { min: 0, max: 0, color: '#f0fdf4' },       // 0%
          { min: 1, max: 50, color: '#d1fae5' },      // 1-50%
          { min: 51, max: 70, color: '#fef3c7' },     // 51-70%
          { min: 71, max: 85, color: '#fbbf24' },     // 71-85%
          { min: 86, max: 95, color: '#f97316' },     // 86-95%
          { min: 96, max: 100, color: '#991b1b' },    // 96-100%
        ]
      }
    },
  },

  orlando: {
    key: 'orlando',
    label: 'Orlando, FL',
    shortLabel: 'Orlando',
    center: { lat: 28.5383, lng: -81.3792 },
    zoom: 10,
    territories: [], // No active territory breakup yet
    availableViews: [
      'density',
      'revenue',
      'routes',
      'customerLookup',
      'commercial',
      'ancillarySales',
    ],
    dataEndpoints: {
      density: '/orlando-density-data.json',
      revenue: '/orlando-revenue-data.json',
      routes: '/orlando-routes-data.json',
      customers: '/orlando-customers-data.json',
      commercial: '/orlando-commercial-data.json',
      ancillarySales: '/orlando-ancillary-data.json',
    },
    hasActiveTerritoryBreakup: false,
    colorThresholds: {
      active: {
        residential: {
          thresholds: [
            { min: 0, max: 0, color: '#f0fdf4' },     // 0
            { min: 1, max: 10, color: '#d1fae5' },    // 1-10
            { min: 11, max: 20, color: '#a7f3d0' },   // 11-20
            { min: 21, max: 35, color: '#6ee7b7' },   // 21-35
            { min: 36, max: 50, color: '#34d399' },   // 36-50
            { min: 51, max: 70, color: '#10b981' },   // 51-70
            { min: 71, max: 90, color: '#059669' },   // 71-90
            { min: 91, max: Infinity, color: '#047857' }, // 90+
          ]
        },
        commercial: {
          thresholds: [
            { min: 0, max: 0, color: '#f0fdf4' },     // 0
            { min: 1, max: 2, color: '#d1fae5' },     // 1-2
            { min: 3, max: 4, color: '#6ee7b7' },     // 3-4
            { min: 5, max: 6, color: '#34d399' },     // 5-6
            { min: 7, max: 9, color: '#10b981' },     // 7-9
            { min: 10, max: Infinity, color: '#059669' }, // 9+
          ]
        }
      },
      terminated: {
        residential: {
          thresholds: [
            { min: 0, max: 0, color: '#fef2f2' },     // 0
            { min: 1, max: 10, color: '#fecaca' },    // 1-10
            { min: 11, max: 20, color: '#fca5a5' },   // 11-20
            { min: 21, max: 30, color: '#f87171' },   // 21-30
            { min: 31, max: 50, color: '#ef4444' },   // 31-50
            { min: 51, max: 75, color: '#dc2626' },   // 51-75
            { min: 76, max: 100, color: '#b91c1c' },  // 76-100
            { min: 101, max: Infinity, color: '#991b1b' }, // 100+
          ]
        },
        commercial: {
          thresholds: [
            { min: 0, max: 0, color: '#fef2f2' },     // 0
            { min: 1, max: 5, color: '#fecaca' },     // 1-5
            { min: 6, max: 10, color: '#fca5a5' },    // 6-10
            { min: 11, max: 15, color: '#f87171' },   // 11-15
            { min: 16, max: 20, color: '#ef4444' },   // 16-20
            { min: 21, max: 30, color: '#dc2626' },   // 21-30
            { min: 31, max: Infinity, color: '#b91c1c' }, // 30+
          ]
        }
      },
      lifetime: {
        thresholds: [
          { min: 0, max: 0, color: '#fef2f2' },       // 0
          { min: 1, max: 11, color: '#fbbf24' },      // <1 year
          { min: 12, max: 23, color: '#a3e635' },     // 1-2 years
          { min: 24, max: 35, color: '#86efac' },     // 2-3 years
          { min: 36, max: 59, color: '#22c55e' },     // 3-5 years
          { min: 60, max: 119, color: '#16a34a' },    // 5-10 years
          { min: 120, max: Infinity, color: '#15803d' }, // 10+ years
        ]
      },
      churn: {
        thresholds: [
          { min: 0, max: 0, color: '#f0fdf4' },       // 0%
          { min: 1, max: 50, color: '#d1fae5' },      // 1-50%
          { min: 51, max: 70, color: '#fef3c7' },     // 51-70%
          { min: 71, max: 85, color: '#fbbf24' },     // 71-85%
          { min: 86, max: 95, color: '#f97316' },     // 86-95%
          { min: 96, max: 100, color: '#991b1b' },    // 96-100%
        ]
      }
    },
  },

  jacksonville: {
    key: 'jacksonville',
    label: 'Jacksonville, FL',
    shortLabel: 'Jacksonville',
    center: { lat: 30.3322, lng: -81.6557 },
    zoom: 10,
    territories: [], // No active territory breakup yet
    availableViews: [
      'density',
      'revenue',
      'routes',
      'customerLookup',
      'commercial',
      'ancillarySales',
      // Jacksonville-specific views
      'jaxRevenue',
      'jaxCommercial',
      'jaxRoutes',
    ],
    dataEndpoints: {
      density: '/jacksonville-density-data.json',
      revenue: '/jacksonville-revenue-data.json',
      routes: '/jacksonville-routes-data.json',
      customers: '/jacksonville-customers-data.json',
      commercial: '/jacksonville-commercial-data.json',
      ancillarySales: '/jacksonville-ancillary-data.json',
    },
    hasActiveTerritoryBreakup: false,
    colorThresholds: {
      active: {
        residential: {
          thresholds: [
            { min: 0, max: 0, color: '#f0fdf4' },     // 0
            { min: 1, max: 10, color: '#d1fae5' },    // 1-10
            { min: 11, max: 25, color: '#a7f3d0' },   // 11-25
            { min: 26, max: 40, color: '#6ee7b7' },   // 26-40
            { min: 41, max: 60, color: '#34d399' },   // 41-60
            { min: 61, max: 80, color: '#10b981' },   // 61-80
            { min: 81, max: 110, color: '#059669' },  // 81-110
            { min: 111, max: Infinity, color: '#047857' }, // 110+
          ]
        },
        commercial: {
          thresholds: [
            { min: 0, max: 0, color: '#f0fdf4' },     // 0
            { min: 1, max: 1, color: '#6ee7b7' },     // 1
            { min: 2, max: Infinity, color: '#10b981' }, // 2+
          ]
        }
      },
      terminated: {
        residential: {
          thresholds: [
            { min: 0, max: 0, color: '#fef2f2' },     // 0
            { min: 1, max: 5, color: '#fecaca' },     // 1-5
            { min: 6, max: 10, color: '#fca5a5' },    // 6-10
            { min: 11, max: 20, color: '#f87171' },   // 11-20
            { min: 21, max: 30, color: '#ef4444' },   // 21-30
            { min: 31, max: 50, color: '#dc2626' },   // 31-50
            { min: 51, max: Infinity, color: '#b91c1c' }, // 50+
          ]
        },
        commercial: {
          // Jacksonville commercial has NO terminated accounts - always lightest
          thresholds: [
            { min: 0, max: Infinity, color: '#fef2f2' }, // Always lightest
          ]
        }
      },
      lifetime: {
        thresholds: [
          { min: 0, max: 0, color: '#fef2f2' },       // 0
          { min: 1, max: 11, color: '#fbbf24' },      // <1 year
          { min: 12, max: 23, color: '#a3e635' },     // 1-2 years
          { min: 24, max: 35, color: '#86efac' },     // 2-3 years
          { min: 36, max: 59, color: '#22c55e' },     // 3-5 years
          { min: 60, max: 119, color: '#16a34a' },    // 5-10 years
          { min: 120, max: Infinity, color: '#15803d' }, // 10+ years
        ]
      },
      churn: {
        thresholds: [
          { min: 0, max: 0, color: '#f0fdf4' },       // 0%
          { min: 1, max: 50, color: '#d1fae5' },      // 1-50%
          { min: 51, max: 70, color: '#fef3c7' },     // 51-70%
          { min: 71, max: 85, color: '#fbbf24' },     // 71-85%
          { min: 86, max: 95, color: '#f97316' },     // 86-95%
          { min: 96, max: 100, color: '#991b1b' },    // 96-100%
        ]
      }
    },
  },

  portCharlotte: {
    key: 'portCharlotte',
    label: 'Port Charlotte, FL',
    shortLabel: 'Port Charlotte',
    center: { lat: 26.9762, lng: -82.0909 },
    zoom: 11,
    territories: [], // No active territory breakup yet
    availableViews: [
      'density',
      'revenue',
      'routes',
      'customerLookup',
      'commercial',
      'ancillarySales',
    ],
    dataEndpoints: {
      density: '/port-charlotte-density-data.json',
      revenue: '/port-charlotte-revenue-data.json',
      routes: '/port-charlotte-routes-data.json',
      customers: '/port-charlotte-customers-data.json',
      commercial: '/port-charlotte-commercial-data.json',
      ancillarySales: '/port-charlotte-ancillary-data.json',
    },
    hasActiveTerritoryBreakup: false,
    colorThresholds: {
      active: {
        residential: {
          thresholds: [
            { min: 0, max: 0, color: '#f0fdf4' },     // 0
            { min: 1, max: 5, color: '#d1fae5' },     // 1-5
            { min: 6, max: 15, color: '#86efac' },    // 6-15
            { min: 16, max: 30, color: '#22c55e' },   // 16-30
            { min: 31, max: 50, color: '#16a34a' },   // 31-50
            { min: 51, max: Infinity, color: '#15803d' }, // 51+
          ]
        }
      },
      terminated: {
        residential: {
          thresholds: [
            { min: 0, max: 0, color: '#fef2f2' },     // 0
            { min: 1, max: 20, color: '#fecaca' },    // 1-20
            { min: 21, max: 50, color: '#fca5a5' },   // 21-50
            { min: 51, max: 100, color: '#f87171' },  // 51-100
            { min: 101, max: 200, color: '#dc2626' }, // 101-200
            { min: 201, max: Infinity, color: '#991b1b' }, // 201+
          ]
        }
      },
      lifetime: {
        thresholds: [
          { min: 0, max: 0, color: '#fef2f2' },       // 0
          { min: 1, max: 11, color: '#fbbf24' },      // <1 year
          { min: 12, max: 23, color: '#a3e635' },     // 1-2 years
          { min: 24, max: 35, color: '#86efac' },     // 2-3 years
          { min: 36, max: 59, color: '#22c55e' },     // 3-5 years
          { min: 60, max: 119, color: '#16a34a' },    // 5-10 years
          { min: 120, max: Infinity, color: '#15803d' }, // 10+ years
        ]
      },
      churn: {
        thresholds: [
          { min: 0, max: 0, color: '#f0fdf4' },       // 0%
          { min: 1, max: 50, color: '#d1fae5' },      // 1-50%
          { min: 51, max: 70, color: '#fef3c7' },     // 51-70%
          { min: 71, max: 85, color: '#fbbf24' },     // 71-85%
          { min: 86, max: 95, color: '#f97316' },     // 86-95%
          { min: 96, max: 100, color: '#991b1b' },    // 96-100%
        ]
      }
    },
  },
}

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

/**
 * Get configuration for a specific location.
 * Falls back to arizona if location is not found.
 */
export function getLocationConfig(locationKey: string): LocationConfig {
  return LOCATIONS[locationKey] ?? LOCATIONS.arizona
}

/**
 * Get all available location keys.
 */
export function getAllLocationKeys(): string[] {
  return Object.keys(LOCATIONS)
}

/**
 * Get locations that have active territory breakups.
 */
export function getLocationsWithTerritories(): LocationConfig[] {
  return Object.values(LOCATIONS).filter(loc => loc.hasActiveTerritoryBreakup)
}

/**
 * Check if a location supports a specific view mode.
 */
export function locationSupportsView(locationKey: string, viewMode: ViewModeKey): boolean {
  const config = getLocationConfig(locationKey)
  return config.availableViews.includes(viewMode)
}

/**
 * Get available view modes for a specific location.
 */
export function getAvailableViews(locationKey: string): ViewModeKey[] {
  const config = getLocationConfig(locationKey)
  return config.availableViews
}

/**
 * Get data endpoint URL for a location and data type.
 */
export function getDataEndpoint(locationKey: string, dataType: keyof DataEndpoints): string | undefined {
  const config = getLocationConfig(locationKey)
  return config.dataEndpoints[dataType]
}

/**
 * Get territory configuration for a location.
 * Returns empty array if location has no territories.
 */
export function getTerritories(locationKey: string) {
  const config = getLocationConfig(locationKey)
  return config.territories
}

/**
 * Get territory color by key for a location.
 */
export function getTerritoryColor(locationKey: string, territoryKey: string): string | undefined {
  const territories = getTerritories(locationKey)
  return territories.find(t => t.key === territoryKey)?.color
}

/**
 * Get color for density data based on value and thresholds.
 * Replaces the 213-line if/else chain in getColor().
 *
 * bd-h1b
 */
export function getDensityColor(
  locationKey: string,
  densityMode: 'active' | 'terminated' | 'lifetime' | 'churn',
  value: number,
  accountType: 'residential' | 'commercial' = 'residential'
): string {
  const config = getLocationConfig(locationKey)

  // Get the appropriate threshold scale for the density mode
  let thresholdScale: ColorThreshold[]

  if (densityMode === 'lifetime' || densityMode === 'churn') {
    // Lifetime and churn are not split by account type
    thresholdScale = config.colorThresholds[densityMode].thresholds
  } else {
    // Active and terminated are split by account type
    const accountTypeThresholds = config.colorThresholds[densityMode]

    // Use commercial thresholds if available and requested, otherwise fall back to residential
    if (accountType === 'commercial' && accountTypeThresholds.commercial) {
      thresholdScale = accountTypeThresholds.commercial.thresholds
    } else {
      thresholdScale = accountTypeThresholds.residential.thresholds
    }
  }

  // Find the appropriate color threshold
  for (const threshold of thresholdScale) {
    if (value >= threshold.min && value <= threshold.max) {
      return threshold.color
    }
  }

  // Fallback to the last color if no threshold matches (shouldn't happen with proper config)
  return thresholdScale[thresholdScale.length - 1]?.color || '#f0fdf4'
}

// ---------------------------------------------------------------------------
// Default Exports
// ---------------------------------------------------------------------------

export default LOCATIONS