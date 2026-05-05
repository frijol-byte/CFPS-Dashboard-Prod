# JCM-Claude Analyzer Toolkit

**Cell-free protein synthesis (CFPS) analysis tools — from raw plate reader output to publication-ready reports.**

A browser-based toolkit hosted on GitLab Pages for processing, visualizing, reporting on, and tracking cell-free protein synthesis experiments. No server required — everything runs client-side using WebAssembly (sql.js), JavaScript, and React.

---

## Table of Contents

- [Overview](#overview)
- [Repo Structure](#repo-structure)
- [How Data Flows](#how-data-flows)
- [Pages & Features](#pages--features)
  - [Index (Landing Page)](#index-landing-page)
  - [AbsQuant Data Processing](#absquant-data-processing)
  - [Data Review Dashboard](#data-review-dashboard)
  - [Report Generator](#report-generator)
  - [Data Browser](#data-browser)
  - [Graph Builder](#graph-builder)
  - [Lot Browser](#lot-browser)
  - [Lot Raw Table Editor](#lot-raw-table-editor)
  - [Gantt Chart Studio](#gantt-chart-studio)
  - [Salt Optimization Tool](#salt-optimization-tool)
  - [Report Upload & Viewer](#report-upload--viewer)
- [Getting Started](#getting-started)
  - [Running Locally](#running-locally)
  - [Adding New Experiment Data](#adding-new-experiment-data)
- [Data Schemas](#data-schemas)
  - [Results CSV Columns](#results-csv-columns)
  - [Lot Tracker Tables](#lot-tracker-tables)
- [Technology Stack](#technology-stack)
- [Help & Tutorials](#help--tutorials)
- [GitLab CI/CD](#gitlab-cicd)
- [Glossary](#glossary)

---

## Overview

The JCM-Claude Analyzer Toolkit is a suite of static HTML pages that together provide a complete workflow for CFPS scientists:

1. **Process** raw plate reader output into quantified concentrations (AbsQuant pipeline)
2. **Explore** processed results across multiple experiments with interactive charts, filters, and heatmaps (Dashboard)
3. **Report** on experiments with one-click report generation — filters, grouping, auto-commentary, and rich-text annotations (Report Generator)
4. **Query** the experiment database directly with SQL (Data Browser)
5. **Visualize** data with custom drag-and-drop charts (Graph Builder)
6. **Track** reagent lots — fermentation, lysate, master mix, plasmid, standards, controls, and more (Lot Browser)
7. **Edit** raw lot data tables with inline cell editing and push changes back to GitLab (Lot Raw Table Editor)
8. **Plan** project timelines with Gantt charts (Gantt Chart Studio)

All tools run entirely in the browser. Data is stored in CSV files committed to the repository, which a GitLab CI pipeline compiles into a SQLite database (`cfps.db`) served alongside the pages.

---

## Repo Structure

```
jcm-toolkit/
├── .gitlab-ci.yml              ← CI pipeline: builds DB, deploys to GitLab Pages
├── scripts/
│   └── build_db.py             ← Reads CSVs from data/, builds public/cfps.db + db_meta.json
├── data/
│   ├── P902_Results/            ← Drop processed experiment result CSVs here
│   ├── P902_SO_Results/         ← Drop salt optimization result CSVs here
│   ├── experiment_meta.csv      ← Experiment descriptions (supports rich text)
│   ├── layouts/                 ← Drop plate layout CSVs here (optional)
│   ├── lots/                    ← Lot tracker CSVs (one file per category)
│   │   ├── fermentation.csv
│   │   ├── lysate.csv
│   │   ├── mastermix.csv
│   │   ├── plasmid.csv
│   │   ├── std_curves.csv
│   │   ├── controls.csv
│   │   ├── cf_product.csv
│   │   ├── premix.csv
│   │   ├── pre_so_mm.csv
│   │   ├── solubility_enhancer.csv
│   │   └── delivered_material.csv
│   └── reports/                 ← Uploaded HTML reports
└── public/                      ← Served by GitLab Pages (24 files)
    ├── index.html               ← Toolkit landing page (orbital layout, 11 tools)
    ├── plate_reader_analyzer.html  ← AbsQuant processing pipeline
    ├── load.html                ← Data loader (CSV upload or DB pull)
    ├── dashboard.html           ← Overview dashboard with charts & filters
    ├── curves.html              ← Standard curve QC & lot tracking
    ├── experiment.html          ← Per-experiment deep dive
    ├── raw.html                 ← Raw data table explorer
    ├── repro.html               ← Reproducibility analysis
    ├── report_generator.html    ← Automated experiment report builder
    ├── browser.html             ← SQL data browser (queries cfps.db)
    ├── graph_builder.html       ← Drag-and-drop graph builder (JMP-style)
    ├── lot_browser.html         ← Lot tracker with charts & entry forms
    ├── lot_raw_editor.html      ← Inline CSV editor with GitLab push
    ├── gantt_tool.html          ← Gantt chart project planner
    ├── so_tool.html             ← Salt optimization upload & plate builder
    ├── so_heatmap.html          ← SO 2D Mg/K heatmap
    ├── so_timecourse.html       ← SO 384-well kinetic curves
    ├── report_upload.html       ← HTML report upload to GitLab
    ├── report_viewer.html       ← HTML report viewer (sandboxed iframe)
    ├── so_data.js               ← Shared SO data processing module
    ├── data_loader.js           ← Shared data loading with auto-refresh
    ├── gitlab_utils.js          ← GitLab API helpers (commit, read, descriptions)
    ├── tutorial.js              ← Interactive guided tutorials for all tools
    ├── cfps.db                  ← Auto-generated SQLite database (don't commit)
    └── db_meta.json             ← Build metadata for auto-refresh (don't commit)
```

---

## How Data Flows

```
┌──────────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Plate Reader (.xlsx) │     │  Plate Layout     │     │  Lot CSVs        │
│  + raw fluorescence   │     │  (.csv)           │     │  (data/lots/)    │
└──────────┬───────────┘     └────────┬─────────┘     └────────┬─────────┘
           │                          │                         │
           ▼                          ▼                         │
    ┌─────────────────────────────────────────┐                │
    │  AbsQuant Plate Reader Analyzer          │                │
    │  • Standard curve regression             │                │
    │  • Sample quantification                 │                │
    │  • Outlier removal (IQR method)          │                │
    │  • Export processed CSV                  │                │
    └──────────┬──────────────────────────────┘                │
               │                                                │
               ▼                                                ▼
    ┌─────────────────────┐              ┌────────────────────────┐
    │  data/P902_Results/  │              │  data/lots/*.csv        │
    │  (committed to repo) │              │  (committed to repo)    │
    └──────────┬──────────┘              └───────────┬────────────┘
               │                                      │
               ▼──────────────────────────────────────▼
    ┌────────────────────────────────────────────────────────┐
    │  GitLab CI: python scripts/build_db.py                  │
    │  → Reads all CSVs → Builds public/cfps.db               │
    └──────────┬─────────────────────────────────────────────┘
               │
               ▼
    ┌────────────────────────────────────────────────────────┐
    │  GitLab Pages: serves public/ as a static site          │
    │  → Dashboard, Report Generator, Browser, Lot Browser    │
    │    all query cfps.db via sql.js (WebAssembly)            │
    └────────────────────────────────────────────────────────┘
```

1. Process raw plate reader Excel output through **AbsQuant**.
2. The processed CSV is committed into `data/P902_Results/`.
3. GitLab CI runs `build_db.py`, which reads every CSV in `data/` and builds `public/cfps.db` with `db_meta.json`.
4. GitLab Pages deploys everything in `public/`.
5. Dashboard, Report Generator, Data Browser, and Lot Browser load `cfps.db` client-side — no backend server needed.
6. Dashboard pages **auto-refresh** when they detect a newer `db_meta.json`.

---

## Pages & Features

### Index (Landing Page)

**File:** `index.html`

The toolkit home page with 11 tool cards arranged in an orbital layout, organized into four color-coded groups:

- **Processing (green)** — AbsQuant, Salt Optimization
- **Data Analysis (blue)** — Dashboard, Graph Builder, Data Browser, Report Generator
- **Product Tracking (amber)** — Lot Browser, Lot Raw Editor, Gantt Chart Studio
- **Reports (rose)** — PD Report Upload, PD Report Viewer

Animated boot sequence, responsive orbital positioning, and help modal with full workflow documentation.

---

### AbsQuant Data Processing

**File:** `plate_reader_analyzer.html`

The primary data processing pipeline for converting raw plate reader output into quantified protein concentrations.

**Features:**

- **File Upload** — Accepts plate reader results (`.xlsx` or `.csv`) and plate layout files. Drag-and-drop or click to browse.
- **Automatic Excel Parsing** — Locates the "Results" section in Excel files and extracts 384-well plate data.
- **Standard Curve Regression** — Linear regression on standard points with R², slope, and intercept.
- **Sample Quantification** — Back-calculates concentrations using the standard curve and applies dilution factors.
- **Outlier Removal** — IQR-based detection and removal (1.5× IQR fence).
- **Interactive Charts** — Standard curve scatter, boxplots, individual points, and outlier views (Chart.js).
- **Summary Statistics** — Per-sample n, min, Q1, median, Q3, max, mean, and geometric mean.
- **Export** — CSV (all/cleaned/summary) and PNG chart images.
- **Push to Database** — Validates schema and commits directly to GitLab.

---

### Data Review Dashboard

The dashboard is a multi-page React application for exploring processed experiment data. Data is cached in IndexedDB and auto-refreshes when the pipeline rebuilds `cfps.db`.

All dashboard pages share a navigation bar linking to: Load Data, Overview, Curves & Lots, Experiment, Raw Data, Reproducibility, and Report Generator.

#### Load Data (`load.html`)

- **CSV Upload** — Drag-and-drop or browse for a processed results CSV.
- **Database Pull** — Load directly from `cfps.db` without a file upload.
- **Rebuild Database** — One-click browser-side rebuild from CSVs.
- **Auto-Refresh** — Detects newer `db_meta.json` and refreshes transparently.

#### Overview Dashboard (`dashboard.html`)

- **Global Filters** — Filter by Experiment ID, Template, Reaction Volume, Lysate, Master Mix, Product, Operator, and Test Condition.
- **KPI Cards** — Filtered count, mean, median, CV%, experiment count, outlier count.
- **Control Chart** — Mean ± SD per experiment, grouped by any metadata field.
- **Distribution Boxplot** — Box-and-whisker with jittered points and IQR outlier flags.
- **Plate Heatmap** — 384-well Viridis-colored heatmap. Standards highlighted.
- **Pie Chart** — By count or mean, sliced by any metadata field.
- **Summary Table** — Group statistics with outlier counts.
- **Zoomable Charts** — Scroll to zoom, drag to pan, double-click to reset.

#### Curves & Lots (`curves.html`)

- **Standard Curve QC** — Per-experiment scatter with fit line, color-coded by R².
- **Spike-in Analysis** — By dilution, with mean RFU, SD, CV%.
- **Lot Tracking** — Lysate/Master Mix lot means across experiments.
- **QC Summary Table** — Slope, intercept, R², counts per experiment.

#### Experiment Deep Dive (`experiment.html`)

- **Experiment Selector** — Dropdown with experiment metadata.
- **Rich Text Descriptions** — Per-experiment descriptions with bold, italic, font sizing, and lists. Saved to GitLab via the API.
- **Group & Sub-group** — Chart and stats grouped by Product, Lysate, Operator, etc. with optional sub-grouping.
- **Mean ± SD Chart** — Concentration by group with error bars and jittered points.
- **Plate Heatmap** — Full 384-well heatmap for the selected experiment.
- **Standard Curve** — Experiment-specific curve with fit details.
- **Well Data Table** — Paginated, sortable, searchable with CSV export.
- **Spatial Analysis** — Edge-effect detection (edge vs. interior wells).

#### Raw Data (`raw.html`)

- **Sortable Table** — Full dataset with column sorting.
- **Column Selection** — Choose which columns to display.
- **Pagination** and **CSV Export**.

#### Reproducibility (`repro.html`)

- **Trend Charts** — Concentration trends over experiments.
- **Operator Comparison** — Side-by-side means on matched conditions.
- **Experiment Comparison** — Paired bar charts across experiments.

---

### Report Generator

**File:** `report_generator.html`

One-click experiment report generation with full customization. Part of the Data Analysis group, accessible from the dashboard nav bar.

**Setup:**

1. **Choose Template** — Quick QC (one-page pass/fail), Full Analysis (all charts and tables), or Executive Summary (KPIs and commentary only). Each pre-selects sensible sections.
2. **Select Experiments** — Click chips to select one or more experiments. Multi-select generates a batch report with page breaks.
3. **Filter Data** — Chip-based filters matching the dashboard: Product, Lysate, Operator, Dilution, Template, Rxn Vol, Master Mix, Test Condition. Real-time sample counter shows filtered/total.
4. **Group Statistics By** — Primary group + optional sub-group (e.g., Product / Operator). Controls the Mean ± SD chart, statistics table, and section titles.
5. **Report Sections** — Toggle individual sections on/off.

**Report Sections:**

- **Key Metrics** — KPI cards: mean, median, CV%, well count, outliers, R².
- **Auto-Commentary** — Generated findings: R² value, outlier count, CV%, edge effects.
- **Standard Curve** — Scatter with fit line, equation, and R² value.
- **Concentration Distribution** — Histogram with five-number summary.
- **Mean ± SD Chart** — Grouped point chart with error bars, colored by group. Jittered individual data points.
- **Plate Heatmap** — 384-well Viridis heatmap with tooltips and legend.
- **Spike-in Analysis** — By dilution with mean RFU, SD, CV%.
- **Group Statistics Table** — n, mean, median, SD, CV%, min, max, outliers per group.
- **Well-Level Data** — Scrollable table (200 rows), outliers highlighted.

**Custom Comments:**

Each section has an "Add comment" button that opens a rich text editor with:
- **Bold** and **Italic** with active-state highlighting
- **Font size** dropdown (8–36px) showing the current size at cursor
- **Bullet list** and **Numbered list**
- Comments are included in HTML exports and printed reports.

**Export:**

- **Print / PDF** — Browser print dialog with clean print stylesheet.
- **Export HTML** — Standalone file with embedded fonts and styles.

---

### Data Browser

**File:** `browser.html`

- **SQL Editor** — Write and execute arbitrary SQL queries against `cfps.db`.
- **Auto-load** — Database loads via sql.js (WebAssembly).
- **Results Table** — Scrollable, formatted results.
- **CSV Download** — Export query results.
- **Schema Info** — View tables and columns.

---

### Graph Builder

**File:** `graph_builder.html`

A JMP-style drag-and-drop visualization builder.

- **Data Source Selection** — Load any table from `cfps.db`. Columns appear as draggable chips.
- **10 Chart Types** — Scatter, Bar, Box Plot, Histogram, Violin, Line, Area, Heatmap, Pie, Treemap.
- **Drag-and-Drop Zones** — X, Y, Color, Size, Wrap (facet).
- **Properties** — Statistics, error bars, jitter, overlays, axis scaling.
- **Filters** — Categorical and numeric range with save/load presets.
- **Annotations** — Text labels and arrows on charts.
- **Export** — SVG and PNG.

---

### Lot Browser

**File:** `lot_browser.html`

- **11 Lot Categories** — Fermentation, Lysate, Master Mix, Standard Curves, Controls, CF Product, Plasmid, Premix, Pre-SO MM, Solubility Enhancer, Delivered Material.
- **Search & Sort** — Real-time text search, sortable columns.
- **Distribution Charts** — Histograms for numeric columns.
- **Summary Statistics** — Count, mean, min, max; unique counts for text.
- **Add New Entry** — Modal form with validation.
- **CSV Export** and **Push to GitLab**.

---

### Lot Raw Table Editor

**File:** `lot_raw_editor.html`

- **Inline Cell Editing** — Click any cell to edit.
- **Row & Column Operations** — Add, delete, rename, reorder.
- **Change Tracking** — Counts edits, additions, and deletions.
- **Pull/Push GitLab** — Fetch latest CSV or commit changes with diff summary.
- **CSV Export**.

---

### Gantt Chart Studio

**File:** `gantt_tool.html`

Project timeline visualization and planning tool.

- **CSV Import** — Load tasks from CSV or use the built-in template.
- **Task Table** — Inline editing for activity, description, dates, product, assignee, status.
- **Timeline View** — Horizontal bar chart with task durations and dependency arrows.
- **Color Coding** — Group bars by Product, Assignee, Status, or Activity Type.
- **Zoom Controls** — Adjust timeline scale.
- **Export** — SVG, PNG, or CSV.

---

### Salt Optimization Tool

**Files:** `so_tool.html`, `so_heatmap.html`, `so_timecourse.html`, `so_data.js`

Multi-page tool for Mg/K screening experiments.

- **Parse & Merge** — Extracts timepoint data from Excel, merges with plate layout.
- **Quick Preview** — Mini heatmap + top 3 conditions.
- **2D Heatmap** — Viridis-colored Mg/K grid with top conditions starred.
- **384-Well Time-Course** — Kinetic curves for all wells with zoom.
- **Export** — CSV, SVG, PNG.

---

### Report Upload & Viewer

**Files:** `report_upload.html`, `report_viewer.html`

- **Upload** — Store HTML reports (from Claude, Jupyter, R Markdown, etc.) via GitLab with IndexedDB local cache.
- **Viewer** — Select reports from dropdown, render in sandboxed iframe, open in new tab, download, or deep-link.

---

## Getting Started

### Running Locally

```bash
# 1. Clone the repository
git clone <your-gitlab-repo-url>
cd jcm-toolkit

# 2. Build the SQLite database from CSVs
python3 scripts/build_db.py

# 3. Start a local HTTP server
cd public && python3 -m http.server 8000

# 4. Open http://localhost:8000 in your browser
```

### Adding New Experiment Data

```bash
# Copy your processed results CSV into the data folder
cp my_new_results.csv data/P902_Results/

# Commit and push — the pipeline rebuilds the DB automatically
git add data/
git commit -m "Add E220 experiment data"
git push
```

The pipeline rebuilds the entire database from scratch on every push. A `source_file` column is added automatically so you can trace which CSV each row came from.

---

## Data Schemas

### Results CSV Columns

| Column | Type | Description |
|--------|------|-------------|
| `WELL` | text | Well position (e.g., A1, B12, P24) |
| `MEASUREMENT` | float | Raw fluorescence (RFU) |
| `ROW_LETTER` | text | Row letter (A-P) |
| `ROW_NUMBER` | int | Row number (1-16) |
| `COLUMN_NUMBER` | int | Column number (1-24) |
| `LABEL` | text | Optional well label |
| `KEY` | text | Sample or standard identifier |
| `LYSATE` | text | Lysate lot identifier |
| `MASTER_MIX` | text | Master mix lot identifier |
| `CONCENTRATION` | float | Known concentration for standards |
| `DILUTION` | float | Dilution factor applied |
| `EXP_ID` | text | Experiment identifier (e.g., E191) |
| `PLATE_ID` | int | Plate number within an experiment |
| `PLATE_READER` | text | Plate reader instrument name |
| `REACTION_VOLUME` | float | Reaction volume in uL |
| `PLATE_TYPE` | text | Plate format description |
| `PLASMID_MID` | text | Plasmid material ID |
| `TEMPLATE` | text | Template type (plasmid or linear) |
| `STANDARD_CURVE_LOT` | text | Lot/date of standard curve used |
| `GAIN` | int | Plate reader gain setting |
| `TEST_CONDITION` | text | Experimental test condition label |
| `OPERATOR` | text | Person who ran the experiment |
| `VESSEL` | text | Vessel format identifier |
| `PRODUCT` | text | Product category (Premium, Economy, Ready96) |
| `CALCULATED_CONCENTRATION` | float | Back-calculated concentration |
| `FINAL_CONCENTRATION_WITH_DILUTION` | float | Final concentration with dilution (mg/L) |

### Lot Tracker Tables

Each CSV in `data/lots/` becomes a table prefixed with `lot_`. Key tables:

- **lot_fermentation** — Fermenter run records
- **lot_lysate** — Lysis lot records with AbsQuant results
- **lot_mastermix** — Master mix batching records
- **lot_std_curves** — Standard curve preparation and QC
- **lot_controls** — Positive control records
- **lot_cf_product** — Final CF product lot records
- **lot_plasmid** — Plasmid stock records
- **lot_premix** — Pre-mixed lysate+mastermix records
- **lot_pre_so_mm** — Salt optimization master mix records
- **lot_solubility_enhancer** — Solubility enhancer lots
- **lot_delivered_material** — Material delivery tracking

---

## Technology Stack

| Technology | Purpose |
|-----------|---------|
| **Vanilla HTML/CSS/JS** | Self-contained single-file pages |
| **React 18** | Dashboard pages + Report Generator |
| **D3.js v7** | SVG charts (boxplots, heatmaps, scatter, pie, mean +/- SD) |
| **Chart.js 4** | Canvas charts in AbsQuant |
| **sql.js 1.8** | SQLite in the browser via WebAssembly |
| **PapaParse 5** | CSV parsing |
| **SheetJS (xlsx)** | Excel file reading |
| **Babel Standalone** | In-browser JSX compilation |
| **IndexedDB** | Client-side caching with auto-refresh |
| **GitLab Pages** | Static site hosting |
| **GitLab CI** | Automated database rebuild |
| **GitLab API** | Browser-based CSV commit and description saving |

---

## Help & Tutorials

Every tool includes a **help button** (? icon, bottom-right corner) with detailed documentation.

Each tool includes an **interactive guided tutorial** that walks first-time users through the interface:

- **Spotlight overlay** highlights the current element.
- **Tooltip** with arrow explains each feature.
- **Navigation** — Previous, Next, Skip. Press any key to advance; Esc to skip.
- **Auto-start** on first visit (tracked in localStorage).
- **Restart** via the help modal.

Tutorials are defined centrally in `tutorial.js` and cover all 12 tool pages: Load, Dashboard, Experiment, Curves, Raw, Repro, Report Generator, AbsQuant, SO Tool, SO Heatmap, SO Timecourse, Gantt, and Graph Builder.

---

## GitLab CI/CD

The `.gitlab-ci.yml` pipeline runs `python3 scripts/build_db.py` on every push, then deploys `public/` to GitLab Pages. No secrets needed for the basic build. Push-to-GitLab features use personal access tokens stored in browser localStorage only.

---

## Glossary

See [GLOSSARY.md](GLOSSARY.md) for a full glossary of columns, terms, abbreviations, and acronyms used throughout the toolkit.
