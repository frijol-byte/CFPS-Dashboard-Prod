# Glossary — JCM-Claude Analyzer Toolkit

A comprehensive reference of columns, terms, abbreviations, and acronyms used throughout the toolkit. Example values are drawn from the actual project data.

---

## General Terms

| Term | Definition |
|------|-----------|
| **CFPS** | Cell-Free Protein Synthesis — a method of producing proteins outside of living cells using cellular extracts (lysates) and defined reagent mixtures. |
| **Cell-free / TX-TL** | Transcription-Translation system. The in-vitro system that transcribes DNA into mRNA and translates it into protein using cell lysate components. |
| **AbsQuant** | Absolute Quantification — the process of determining exact protein concentrations by comparing sample fluorescence to a standard curve of known concentrations. |
| **P902** | Internal project code for the cell-free protein synthesis product line tracked in this toolkit. |
| **Lot** | A discrete batch of a reagent or product manufactured under uniform conditions and assigned a unique identifier for traceability. |
| **Plate Reader** | A laboratory instrument that measures fluorescence, absorbance, or luminescence across a multi-well plate (typically 384 wells). In this project the reader is named `TIKTAALIK`. |
| **384-Well Plate** | A microplate with 384 wells arranged in 16 rows (A–P) × 24 columns, used for high-throughput reactions. The plates used here are `384 well plate Greiner`. |
| **Well** | A single reaction cavity in a microplate, identified by row letter and column number. Examples: `A1`, `B12`, `P24`. |
| **Standard Curve** | A series of measurements at known concentrations used to create a mathematical relationship (typically linear regression) between fluorescence signal and protein concentration. In this project, standards range from `1` to `128` concentration units. |
| **Spike-in** | A sample with a known amount of protein added, used to validate the accuracy of the quantification system. Identified by the key `Spike-in` or `spike-in`. |
| **Outlier** | A data point that falls outside the expected range, identified using the IQR (Interquartile Range) method: values below Q1 − 1.5×IQR or above Q3 + 1.5×IQR. |
| **IQR** | Interquartile Range — the difference between the 75th percentile (Q3) and the 25th percentile (Q1) of a dataset. Used for outlier detection. |
| **CV%** | Coefficient of Variation expressed as a percentage — standard deviation divided by the mean, multiplied by 100. A measure of relative variability. In the dashboard, CV% is color-coded: green (<15%), amber (15–30%), red (>30%). |
| **R²** | R-squared (coefficient of determination) — a statistical measure of how well a regression line fits the data. Values closer to 1.0 indicate better fit. For standard curves, ≥ 0.99 is considered good, ≥ 0.98 is acceptable. Example: `0.998`. |
| **Linear Regression** | A statistical method fitting a straight line (y = mx + b) to a set of data points. Used here to relate fluorescence measurements to known standard concentrations. Example fit: slope = `3671`, intercept = `2769`. |
| **GitLab Pages** | A GitLab feature that serves static websites directly from a repository. All toolkit pages are deployed this way. |
| **sql.js** | A JavaScript library that compiles SQLite to WebAssembly, allowing SQL queries to run entirely in the browser without a backend server. |
| **IndexedDB** | A browser-based database API used by the toolkit to cache loaded CSV data between dashboard page navigations. |

---

## Results CSV Columns

These columns appear in the processed experiment data files stored in `data/P902_Results/` and in the `P902_Results` table of `cfps.db`.

| Column | Definition | Example Values |
|--------|-----------|----------------|
| **WELL** | Well position identifier on the plate. Encodes row letter + column number. | `A1`, `B12`, `H16`, `P24` |
| **MEASUREMENT** | Raw fluorescence reading from the plate reader, in Relative Fluorescence Units (RFU). This is the primary signal used for quantification. | `205.0`, `3.0`, `6977.0` |
| **ROW_LETTER** | The alphabetic row designation of the well (A through P for a 384-well plate). | `A`, `D`, `H`, `P` |
| **ROW_NUMBER** | Numeric row index (1–16), corresponding to ROW_LETTER (A=1, B=2, …, P=16). | `1`, `8`, `16` |
| **COLUMN_NUMBER** | Numeric column index (1–24) on the plate. | `1`, `12`, `24` |
| **LABEL** | An optional descriptive label assigned to the well in the plate layout. | `12-L_plasmid`, `20-L_linear`, `12-L-control_Arbor Optimal Condition_neg` |
| **KEY** | The primary sample or standard identifier. Standards are prefixed with "Standard". Sample keys describe the condition. | `384_Premium`, `384_Economy`, `Standard - 1`, `Standard - 1 - 3`, `Spike-in`, `384_neg` |
| **LYSATE** | The lot identifier of the cell lysate used in the reaction. The lysate provides the cellular machinery for transcription and translation. | `17-L`, `20-L`, `21-L`, `12-L`, `Arbor lysate` |
| **MASTER_MIX** | The lot identifier of the master mix used. The master mix contains energy sources, amino acids, salts, and cofactors needed for protein synthesis. | `MMC_17`, `MMC_19`, `MMC_20`, `MMA_7`, `Arbor` |
| **CONCENTRATION** | For standard wells only: the known protein concentration . Used to build the standard curve. Blank for sample wells. | `1.0`, `2.0`, `4.0`, `8.0`, `16.0`, `32.0`, `64.0`, `128.0` |
| **DILUTION** | The dilution factor applied to the sample before measurement. The final concentration is multiplied by this factor to obtain the true reaction concentration. | `400.0`, `200.0`, `100.0`, `20.0`, `1.0` |
| **EXP_ID** | Experiment identifier — a unique code for each experimental run. | `E185`, `E191`, `E209`, `E215`, `E227` |
| **PLATE_ID** | Plate number within an experiment. Some experiments span multiple plates. | `1`, `2` |
| **PLATE_READER** | Name or identifier of the plate reader instrument used for the measurement. | `TIKTAALIK` |
| **REACTION_VOLUME** | The volume of the cell-free reaction . | `5.0`, `10.0`, `20.0` |
| **PLATE_TYPE** | Description of the plate format used. | `384 well plate Grainer` |
| **PLASMID_MID** | Material ID of the plasmid DNA template used in the reaction. | `m9134733`, `m9229555` |
| **TEMPLATE** | Type of DNA template used. | `plasmid`, `linear`, `neg`, `spike-in` |
| **STANDARD_CURVE_LOT** | The lot or preparation date of the standard curve aliquots used for that experiment. | `2026-02-03`, `2026-03-10` |
| **GAIN** | The plate reader gain setting — an amplification factor applied to the fluorescence detector. Higher gain increases sensitivity but may also increase noise. | `50` |
| **TEST_CONDITION** | An optional label describing the specific experimental condition being tested (e.g., salt concentration, temperature variant). | *(often blank)* |
| **OPERATOR** | Initials of the person who performed the experiment. | `P1`, `P6`, `P2` |
| **VESSEL** | Vessel format or brand identifier. | `384`, `Arbor`, `Axygen`, `Eppendorf`, `Greiner`, `Kingfisher`, `tube` |
| **PRODUCT** | Product category or formulation type. | `Premium`, `Economy`, `Ready96`, `control`, `neg`, `12-l neg ctrl` |
| **CALCULATED_CONCENTRATION** | Concentration back-calculated from the standard curve regression: `slope × measurement + intercept`. Reported . May be negative for very low signals. | `4.1211`, `0.0523`, `-0.3526` |
| **FINAL_CONCENTRATION_WITH_DILUTION** | The final protein concentration after applying the dilution factor: `max(0, calculated_concentration × dilution)`. Reported in concentration units. This is the primary output metric. | `1648.43`, `0.00`, `7331.99` |
| **source_file** | Automatically added by `build_db.py` — the filename of the CSV that contributed each row, for traceability. | `Experimental data example.csv` |

---

## Lot Tracker Columns

### Fermentation (`lot_fermentation`)

| Column | Definition | Example Values |
|--------|-----------|----------------|
| **num** | Sequential lot identifier (may be alphanumeric for early batches). | `A1`, `A2`, `1`, `2` |
| **date** | Date of the fermentation run (YYYYMMDD). | `20250410`, `20250716` |
| **fermenter_num** | Fermenter unit identifier. | `F#`, `F09` |
| **fte** | Operator name who ran the fermentation. | `Person 1` |
| **strain** | Bacterial strain used. BL21(DE3) is a common E. coli expression strain. | `Bl21DE3` |
| **sop** | Standard Operating Procedure reference for the fermentation protocol. | `Fermentation protocol for TX-TL v2` |
| **br_batching_sheet** | Batch record / batching sheet reference. | *(may be blank)* |
| **eln** | Electronic Lab Notebook reference. | `Slides 15-19` |
| **fermenter_lot_num** | Unique lot number for this fermentation batch. Format: `YYYYMMDD-ID-Fermenter`. | `20250410-A1-F#`, `20250716-1-F09` |
| **notes** | Free-text notes about the run. | `ran to specifications` |
| **use_for_experiment_production** | Whether this batch is approved for experiments or production. | *(may be blank)* |
| **lysate_lot** | The downstream lysate lot produced from this fermentation. | `20250411`, `20250609` |
| **harvested_pellet_g** | Weight of the harvested cell pellet . | *(may be blank)* |

### Lysate (`lot_lysate`)

| Column | Definition | Example Values |
|--------|-----------|----------------|
| **num** | Sequential lot identifier. | `1`, `2`, `3` |
| **fte** | Operator who performed the lysis. | `Person 1` |
| **date** | Date of lysis (YYYYMMDD). | `20250411`, `20250721` |
| **lysis_sop** | SOP reference for the lysis procedure. | *(may be blank)* |
| **batch_record** | Batch record reference. | *(may be blank)* |
| **lysis_lot_number** | Unique lot number. Format: `YYYYMMDD-#-L`. | `20250411-1-L`, `20250721-3-L` |
| **fermentation_lot** | Source fermentation lot number. | `20250410_006`, `20250820-F10-5` |
| **starting_lysate_volume_ml** | Volume of lysate produced . | *(may be blank)* |
| **resuspension_ratio_ml\_-\_buffer:g\_-\_pellet** | Ratio of buffer volume (mL) to pellet weight (g) used during resuspension. | `0.7` |
| **lims_id** | Laboratory Information Management System identifier. | *(may be blank)* |
| **kglu_mm** | Potassium glutamate concentration in the paired master mix . | `160` |
| **mgglu_mm** | Magnesium glutamate concentration in the paired master mix . | `9` |
| **cfu_count** | Colony-forming unit count — quality check for contamination. | `Lawn` (indicates overgrowth) |
| **abs_quant_plasmid_g_l** | AbsQuant protein yield using plasmid template . | *(numeric, may be blank)* |
| **abs_quant_plasmid_cv_pct** | CV% of the plasmid AbsQuant measurement. | *(numeric, may be blank)* |
| **abs_quant_linear_g_l** | AbsQuant protein yield using linear template . | *(numeric, may be blank)* |
| **abs_quant_linear\_-\_cv_pct** | CV% of the linear AbsQuant measurement. | *(numeric, may be blank)* |
| **solubility_pct** | Percentage of protein produced that is soluble. | *(numeric, may be blank)* |
| **solubility_error_cvpct** | CV% of the solubility measurement. | *(numeric, may be blank)* |
| **salt_optimization_experiment_file** | Reference to the salt optimization experiment file/setup. | `20250729 Echo setup P902 Salt Optimization` |
| **use** | Intended use for this lysate lot. | *(may be blank)* |

### Master Mix (`lot_mastermix`)

| Column | Definition | Example Values |
|--------|-----------|----------------|
| **num** | Sequential lot identifier. | `1`, `2`, `3` |
| **date_yymmdd** | Date of preparation. | `2025-10-29`, `2025-10-31` |
| **fte** | Operator who prepared the master mix. | `Person 4` |
| **batching_sheet_link** | Link to the batching sheet / batch record. | `P902_E91_Master Mix Batching Record` |
| **prepared_for** | Purpose or experiment this master mix was prepared for. | *(may be blank)* |
| **volume_created_ml** | Total volume of master mix prepared . | `56.1`, `52.8` |
| **paired_lysate_lot** | The lysate lot this master mix is optimized for. | `20251024-12-L` |
| **sop_used** | SOP reference for preparation. | `Batching Sheet` |
| **lot_number** | Unique lot number. Format: `YYYYMMDD-#-MM-Letter`. | `20251029-1-MM-A`, `20251029-2-MM-B` |
| **lot_num\_\_+\_description** | Lot number with descriptive suffix. | `20251029-1-MM-A`, `20251029-2-MM-B` |
| **kglu_mm** | Potassium glutamate concentration  — a key salt in the TX-TL reaction. | `120` |
| **mgglu2_mm** | Magnesium glutamate concentration  — affects ribosome activity. | `6` |
| **type** | Master mix type/variant. | `Brij` *(indicates 0.1% Brij surfactant added)* |
| **assumed_expiry** | Expected expiry date for this lot. | `2026-10-29` |
| **comments** | Free-text notes. | `0.1% Brij added accidentally so used for internal MSAT testing…` |

### Standard Curves (`lot_std_curves`)

| Column | Definition | Example Values |
|--------|-----------|----------------|
| **num** | Sequential identifier. | `1`, `2`, `3` |
| **date_of_prep_yyyymmdd** | Date the standard curve aliquots were prepared. | `20251008` |
| **operator** | Person who prepared the standards. | `Person 6`, `Person 2` |
| **eln** | Electronic Lab Notebook reference. | `ELN` |
| **test_experiment** | Experiment used to validate the standard curve. | *(may be blank)* |
| **sop\_\_planning_gsheet** | SOP or planning spreadsheet reference. | *(may be blank)* |
| **fluorescence_protein** | Fluorescent protein used as the standard. | `eGFP`, `sfGFP` |
| **aliquot_volume_ul** | Volume per aliquot . | `50` |
| **total_nº_of_pcr_strips_1_strip\_=\_1_std_curve** | Number of PCR strip aliquots prepared (one strip = one standard curve). | `8`, `7` |
| **qc\_-\_r2** | R² value from the QC validation run. | `0.998`, `0.993`, `0.999` |
| **slope** | Slope of the standard curve (RFU per concentration units). | `3671`, `4400` |
| **y-\_intercept** | Y-intercept of the standard curve (RFU at zero concentration). | `2769`, `969` |
| **storage_location** | Where the aliquots are stored. | `P902 -80C Freezer space` |
| **range** | Concentration range of the standard curve. | `0-32` |

### Controls (`lot_controls`)

| Column | Definition | Example Values |
|--------|-----------|----------------|
| **num** | Sequential identifier. | `1`, `2`, `3` |
| **date_of_prep_yyyymmdd** | Preparation date. | `20251010`, `20251105` |
| **operator** | Person who prepared the controls. | `Person 2`, `Person 6` |
| **eln** | Electronic Lab Notebook reference. | `20251105-E99-Standard curve setup` |
| **fluorescence_protein** | Fluorescent protein used. | `eGFP` |
| **aliquot_volume_ul** | Volume per aliquot . | `10` |
| **total_volume_ul** | Total volume prepared . | `400`, `260`, `140` |
| **storage_location** | Freezer location. | `P902 -80C Freezer space` |
| **notes** | Notes including target concentration. | `0.5`, `failed QC` |
| **run1\_-\_e61 … run5** | Measured concentration  from sequential QC runs, named by experiment ID. Used to track control stability over time. | `0.525`, `0.44`, `0.47`, `0.45` |

### CF Product (`lot_cf_product`)

| Column | Definition | Example Values |
|--------|-----------|----------------|
| **seq_num** | Sequential product number. | `1`, `2`, `3` |
| **date_yymm** | Year-month code (YYMM). | `2504` *(April 2025)*, `2508` *(Aug 2025)* |
| **date_dd** | Day of the month. | `10`, `20`, `17` |
| **lysate_lot** | Source lysate lot. | *(may be blank)* |
| **so_mm_lot_a / so_mm_lot_b** | Salt-optimized master mix lot(s). | *(may be blank)* |
| **mscarlett_lot** | mScarlett fluorescent protein control lot. | *(may be blank)* |
| **reaction_volume_ml** | Reaction volume . | *(may be blank)* |
| **kits_1ml / kits_10ml / kits_100ml** | Number of kits produced at each size. | *(numeric or blank)* |
| **version** | Product version number. | `1` |
| **lot_number** | Unique lot number. Format: `CF-YYMM-Seq-Version`. | `CF-2504-1-1`, `CF-2508-1-2` |
| **product_version** | Product version description. | *(may be blank)* |
| **cf_size1 / cf_size2 / cf_size3** | Product size variants. | *(may be blank)* |
| **expiry_date** | Product expiry date (YYMMDD). | `260410`, `260820` |
| **internal** | Whether the product is for internal use only. | *(may be blank)* |
| **labels_1ml / labels_10ml / labels_100ml** | Label counts per kit size. | *(numeric or blank)* |
| **coa** | Certificate of Analysis status. | *(may be blank)* |
| **plasmid** | Associated plasmid lot. | `20250410_006`, `202508_01` |

### Plasmid (`lot_plasmid`)

| Column | Definition | Example Values |
|--------|-----------|----------------|
| **plasmid** | Sequential identifier. | `1`, `2` |
| **fte** | Operator who prepared the stock. | `Person 6` |
| **date** | Preparation date (YYYYMMDD). | `20251023`, `20260408` |
| **sop / eln / batch_record** | Documentation references. | `ELN`, `P902 Plasmid stock calculator` |
| **plasmid_lot_number** | Unique lot identifier. Format: `YYYYMMDD-#-P`. | `20251023-1-P`, `20260408-2-P` |
| **lot_number_of_azenta_stock** | Lot number from the Azenta (external supplier) stock. | `10/16/2025 - Lot# 45946HK0926G_1_R1` |
| **azenta_concentration_listed\_-\_ng_ul** | Concentration listed by the supplier . | `1778`, `1541` |
| **azenta_concentration_nanodrop\_-\_ng_ul** | Concentration verified by NanoDrop measurement . | `1670.7`, `1484.7` |
| **volume_azenta_stock_ul** | Volume of supplier stock used (µL). | `869`, `333` |
| **volume_water** | Volume of water added for dilution (µL). | `6631`, `2217` |
| **final_concentration_nanodrop\_-\_ng_ul** | Final stock concentration after dilution . | `194.4`, `191.3` |
| **final_concentration\_-\_nm** | Final stock concentration . | `100.39`, `98.79` |

### Premix (`lot_premix`)

| Column | Definition | Example Values |
|--------|-----------|----------------|
| **num** | Sequential identifier. | `1`, `2` |
| **date_yymmdd** | Preparation date. | `2026-02-11`, `2026-03-09` |
| **fte** | Operator(s). | `Person 2/ Person 5`, `Person 6` |
| **ratio_of_lysate:\_mastermix** | Mixing ratio of lysate to master mix. | `1:1` |
| **prepared_for** | Target product or experiment. | `CF-2602-4-12`, `Stability test` |
| **volume_created_ml** | Total volume prepared . | `80mL`, `86` |
| **paired_lysate_lot** | Lysate lot used. | `20251209-15-L`, `20260306-L-20` |
| **paired_mastermix_lot** | Master mix lot used. | `20260210-19-MM-C`, `20260309-22-MM-C` |
| **unique_lot_number** | Unique premix lot number. Format: `YYYYMMDD-#-PM`. | `20260211-1-PM`, `20260309-2-PM` |
| **lot_num\_\_+\_description** | Lot number with descriptive suffix. | *(may be blank)* |

### Pre-SO Master Mix (`lot_pre_so_mm`)

| Column | Definition | Example Values |
|--------|-----------|----------------|
| **date_yymmdd** | Preparation date. | `2025-08-27`, `2025-09-04` |
| **fte** | Operator(s). | `Person 1 Person 2` |
| **batching_sheet_link** | Link to the batching sheet. | `20250827 P902 E16 Salt Optimization Echo setup` |
| **eln** | Electronic Lab Notebook reference. | *(may be blank)* |
| **volume_created_ml** | Volume prepared . | `3.6` |
| **lysates_optimized** | Which lysate lots this was optimized for. | `R&D`, `20250918-L-5` |
| **sop_used** | SOP reference. | *(may be blank)* |
| **use** | Intended use (R&D vs. production). | `R&D` |
| **experiment_number** | Associated experiment. | `P902_E16` |
| **lot_name** | Lot name identifier. | *(may be blank)* |

### Solubility Enhancer (`lot_solubility_enhancer`)

| Column | Definition | Example Values |
|--------|-----------|----------------|
| **num** | Sequential identifier. | `1`, `2` |
| **date_yymmdd** | Preparation date. | `2026-04-02` |
| **fte** | Operator(s). | `Person 2/ Person 5` |
| **lot** | Lot identifier. | `20260402-GR012-1`, `20260402-GR012-2` |
| **prepared_for** | Target product or experiment. | *(may be blank)* |
| **volume_per_tube_ml** | Volume per aliquot tube . | `1`, `0.2` |
| **num_tubes** | Number of tubes prepared. | `208`, `61` |
| **total_volume** | Total volume . | `208`, `12.2` |
| **type** | Enhancer type/formulation. | *(may be blank)* |
| **assumed_expiry** | Expected expiry date. | `2026-10-01` |
| **comments** | Notes. | *(may be blank)* |

### Delivered Material (`lot_delivered_material`)

| Column | Definition | Example Values |
|--------|-----------|----------------|
| **reagent** | Reagent type. | `Lysate`, `Mastermix`, `sfGFP` |
| **2025_openai / 2025_dp / 2025_biofab / 2025_other** | Volume or quantity delivered to each customer/project in 2025. | `3.1 L`, `10 mL`, `9.6 mL @ 1200 uM` |
| **2026_openai / 2026_dp / 2026_biofab / 2026_other** | Volume or quantity delivered in 2026. | `660 mL`, `10 mL @ 1750 uM` |
| **2026_proj_openai / 2026_proj_dp / 2026_proj_biofab / 2026_proj_other** | Projected deliveries for 2026. | `600 mL`, `20 mL`, `10 mL` |

---

## Lot Number Naming Conventions

Lot numbers in this project follow a consistent pattern that encodes the preparation date, sequence number, and reagent type:

| Pattern | Meaning | Example |
|---------|---------|---------|
| `YYYYMMDD-#-L` | Lysate lot | `20250411-1-L`, `20251024-12-L` |
| `YYYYMMDD-#-MM-X` | Master Mix lot (X = letter variant) | `20251029-1-MM-A`, `20260210-19-MM-C` |
| `YYYYMMDD-#-PM` | Premix lot | `20260211-1-PM` |
| `YYYYMMDD-#-P` | Plasmid lot | `20251023-1-P` |
| `YYYYMMDD-A#-F#` | Fermentation lot (fermenter ID) | `20250410-A1-F#`, `20250716-1-F09` |
| `CF-YYMM-Seq-Ver` | CF Product lot | `CF-2504-1-1`, `CF-2508-1-2` |
| `YYYYMMDD-GR###-#` | Solubility enhancer lot | `20260402-GR012-1` |

---

## Abbreviations Quick Reference

| Abbreviation | Meaning |
|-------------|---------|
| **CFPS** | Cell-Free Protein Synthesis |
| **TX-TL** | Transcription-Translation |
| **RFU** | Relative Fluorescence Units |
| **AU** | Arbitrary Units |
| **R²** | Coefficient of Determination |
| **CV%** | Coefficient of Variation (percentage) |
| **IQR** | Interquartile Range |
| **Q1 / Q3** | First / Third Quartile (25th / 75th percentile) |
| **SD** | Standard Deviation |
| **eGFP** | Enhanced Green Fluorescent Protein |
| **sfGFP** | Super-folder Green Fluorescent Protein |
| **mScarlett** | Monomeric Scarlett (a red fluorescent protein) |
| **kGlu** | Potassium Glutamate (a key salt component) |
| **MgGlu** | Magnesium Glutamate |
| **MM** | Master Mix |
| **SO** | Salt Optimization |
| **PM** | Premix (pre-combined lysate + master mix) |
| **SOP** | Standard Operating Procedure |
| **ELN** | Electronic Lab Notebook |
| **CoA** | Certificate of Analysis |
| **LIMS** | Laboratory Information Management System |
| **CFU** | Colony-Forming Units |
| **MSAT** | Manufacturing Science and Technology |
| **NanoDrop** | A UV-Vis spectrophotometer used for nucleic acid/protein quantification |
| **Azenta** | External DNA/plasmid supplier |
| **Bl21DE3** | BL21(DE3) — a common E. coli strain optimized for protein expression |
| **Brij** | A non-ionic surfactant sometimes added to master mix formulations |
| **CI/CD** | Continuous Integration / Continuous Deployment |
| **sql.js** | SQLite compiled to WebAssembly for browser use |
