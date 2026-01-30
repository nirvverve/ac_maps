
# Account Density Analysis - Complete Deliverables

## 📊 Executive Summary

You now have **TWO** powerful ways to visualize and analyze account density across your territories:

1. **Interactive Web Map** (Mapbox-powered, best for exploration)
2. **Static HTML Charts** (Perfect for presentations and reports)

Both show the same critical insight: **84.6% overall churn rate** with significant variation by territory.

---

## 🗺️ Interactive Density Map Application

### Location
```
/home/ubuntu/density_map/nextjs_space/
```

### How to Launch
```bash
cd /home/ubuntu/density_map/nextjs_space
yarn dev
```
Then open: **http://localhost:3000**

### Features
✅ **Three View Modes:**
- Active Account Density (green gradient)
- Terminated Account Density (red gradient)  
- Churn Rate (green-to-red gradient)

✅ **Interactive Elements:**
- Click any ZIP code for detailed popup
- Filter by territory (West, Central, East, Tucson)
- Real-time statistics sidebar
- Graduated color scaling by density

---

## 📈 Static Visualizations (HTML Charts)

### Files Created

1. **density_viz_top_30_active.html** - Top 30 ZIPs by active customers
2. **density_viz_top_30_terminated.html** - Top 30 ZIPs by terminated customers
3. **density_viz_area_comparison.html** - Territory comparison dashboard
4. **density_viz_scatter_comparison.html** - Active vs Terminated bubble chart
5. **density_viz_churn_distribution.html** - Churn rate box plots

### How to Open
Simply open any `.html` file in your browser

---

## 📋 Data Files

### CSV Files
- **DENSITY_TOP_50_ACTIVE_ZIPS.csv** - Top 50 by active accounts
- **DENSITY_TOP_50_TERMINATED_ZIPS.csv** - Top 50 by terminated accounts
- **DENSITY_HIGHEST_CHURN_ZIPS.csv** - Top 50 by churn rate
- **account_density_by_zip.csv** - Complete dataset (156 ZIPs)
- **area_density_summary.csv** - Territory-level summary

### JSON Files
- **DENSITY_SUMMARY_STATS.json** - Machine-readable metrics
- **density-map-data.json** - GeoJSON with boundaries (in map public folder)
- **area-statistics.json** - Territory statistics (in map public folder)

---

## 📖 Documentation

### **DENSITY_MAP_ANALYSIS_README.md**
Complete 240-line analysis with:
- Executive summary with key findings
- Interactive map usage instructions
- Color legend explanations
- Strategic insights and recommendations
- Technical specifications

---

## 🎯 Key Insights

### Territory Performance

| Territory | ZIPs | Active | Terminated | Churn Rate |
|-----------|------|--------|------------|------------|
| **West** | 45 | 529 | 3,599 | **86.9%** ⚠️ |
| **Central** | 49 | 527 | 3,010 | **84.6%** |
| **East** | 36 | 570 | 2,527 | **80.9%** ✓ |
| **Tucson** | 26 | 73 | 226 | **72.5%** ✓✓ |

### Critical Issues
1. West Territory: 86.9% churn (highest)
2. ZIP 85308 (Glendale): 87% churn
3. ZIP 85331: 87.6% churn

### Top Opportunities
1. ZIP 85122 (Casa Grande): 89 active accounts
2. ZIP 85254 (N. Scottsdale): 56 active accounts
3. ZIP 85308 (Glendale): 40 active accounts

---

## 🚀 Quick Start Guide

### For Presentations
1. Open `density_viz_area_comparison.html`
2. Show territory comparison
3. Drill into `density_viz_top_30_active.html` for details

### For Analysis
1. Open `DENSITY_TOP_50_ACTIVE_ZIPS.csv` in Excel
2. Create pivot tables
3. Cross-reference with `DENSITY_HIGHEST_CHURN_ZIPS.csv`

### For Exploration
1. Launch interactive map: `cd density_map/nextjs_space && yarn dev`
2. Toggle between Active/Terminated/Churn views
3. Click ZIP codes for detailed popups

---

**Status: ✅ COMPLETE AND READY FOR USE**

**Analysis Date:** October 30, 2025  
**Version:** 1.0  
**Total Deliverables:** 19 files
