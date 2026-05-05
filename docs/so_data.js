// ═══════════════════════════════════════════════════════════════════════════════
//  Salt Optimization Tool — Shared Data Processing Module
// ═══════════════════════════════════════════════════════════════════════════════

const SO_DB_NAME = 'so_tool';
const SO_STORE_NAME = 'so_data';

// ═══════════════════════════════════════════════════════════════════════════════
//  IndexedDB
// ═══════════════════════════════════════════════════════════════════════════════

let soDatabase = null;

async function openSODatabase() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(SO_DB_NAME, 1);
    req.onerror = () => reject(new Error('Failed to open IndexedDB'));
    req.onsuccess = () => { soDatabase = req.result; resolve(soDatabase); };
    req.onupgradeneeded = (evt) => {
      const db = evt.target.result;
      if (!db.objectStoreNames.contains(SO_STORE_NAME)) {
        db.createObjectStore(SO_STORE_NAME);
      }
    };
  });
}

async function saveSOData(key, value) {
  if (!soDatabase) await openSODatabase();
  return new Promise((resolve, reject) => {
    const tx = soDatabase.transaction([SO_STORE_NAME], 'readwrite');
    const store = tx.objectStore(SO_STORE_NAME);
    const req = store.put(value, key);
    req.onerror = () => reject(new Error(`Failed to save ${key}`));
    req.onsuccess = () => resolve(value);
  });
}

async function loadSOData(key) {
  if (!soDatabase) await openSODatabase();
  return new Promise((resolve, reject) => {
    const tx = soDatabase.transaction([SO_STORE_NAME], 'readonly');
    const store = tx.objectStore(SO_STORE_NAME);
    const req = store.get(key);
    req.onerror = () => reject(new Error(`Failed to load ${key}`));
    req.onsuccess = () => resolve(req.result);
  });
}

async function clearSOData() {
  if (!soDatabase) await openSODatabase();
  return new Promise((resolve, reject) => {
    const tx = soDatabase.transaction([SO_STORE_NAME], 'readwrite');
    const store = tx.objectStore(SO_STORE_NAME);
    const req = store.clear();
    req.onerror = () => reject(new Error('Failed to clear database'));
    req.onsuccess = () => resolve();
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  Experiment Index
// ═══════════════════════════════════════════════════════════════════════════════

async function listExperiments() {
  return (await loadSOData('experiments_index')) || [];
}

function expKey(expId, lysateLot) {
  return expId + '__' + (lysateLot || '') + '__';
}

async function saveExperimentData(expId, lysateLot, processingResult) {
  const prefix = expKey(expId, lysateLot);
  await saveSOData(prefix + 'merged_data', processingResult.mergedData);
  await saveSOData(prefix + 'aggregated_data', processingResult.aggregatedData);
  await saveSOData(prefix + 'top3', processingResult.top3);
  await saveSOData(prefix + 'metadata', processingResult.metadata);

  // Update index
  const experiments = await listExperiments();
  const existing = experiments.findIndex(e => e.id === expId && e.lysateLot === lysateLot);
  const entry = { id: expId, lysateLot: lysateLot, timestamp: new Date().toISOString() };
  if (existing >= 0) {
    experiments[existing] = entry;
  } else {
    experiments.push(entry);
  }
  await saveSOData('experiments_index', experiments);
}

async function loadExperimentData(expId, lysateLot) {
  const prefix = expKey(expId, lysateLot);
  return {
    mergedData: await loadSOData(prefix + 'merged_data'),
    aggregatedData: await loadSOData(prefix + 'aggregated_data'),
    top3: await loadSOData(prefix + 'top3'),
    metadata: await loadSOData(prefix + 'metadata')
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SQLite Loading (cfps.db → P902_SO_Results table)
// ═══════════════════════════════════════════════════════════════════════════════

let _soSqlDb = null;

async function openSOSqlite() {
  if (_soSqlDb) return _soSqlDb;
  try {
    if (typeof initSqlJs === 'undefined') return null;
    const SQL = await initSqlJs({
      locateFile: f => 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/' + f
    });
    const resp = await fetch('cfps.db');
    if (!resp.ok) return null;
    const buf = await resp.arrayBuffer();
    _soSqlDb = new SQL.Database(new Uint8Array(buf));
    // Check table exists
    const tables = _soSqlDb.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='P902_SO_Results'");
    if (!tables.length || !tables[0].values.length) {
      _soSqlDb.close();
      _soSqlDb = null;
      return null;
    }
    return _soSqlDb;
  } catch (e) {
    return null;
  }
}

async function listDbExperiments() {
  const db = await openSOSqlite();
  if (!db) return [];
  const result = db.exec("SELECT DISTINCT exp_id, lysate_lot FROM P902_SO_Results ORDER BY exp_id, lysate_lot");
  if (!result.length) return [];
  return result[0].values.map(row => ({ id: row[0], lysateLot: row[1] || '', source: 'db' }));
}

async function loadDbMergedData(expId, lysateLot) {
  const db = await openSOSqlite();
  if (!db) return null;
  const result = db.exec("SELECT well, time, measurement, mgglu_mm, kglu_mm FROM P902_SO_Results WHERE exp_id = ? AND lysate_lot = ?", [expId, lysateLot]);
  if (!result.length || !result[0].values.length) return null;
  return result[0].values.map(row => ({
    Well: row[0],
    Time: row[1],
    Measurement: row[2],
    MgGlu: row[3],
    KGlu: row[4]
  }));
}

async function listAllExperiments() {
  const [idbExps, dbExps] = await Promise.all([listExperiments(), listDbExperiments()]);
  const key = e => e.id + '|||' + (e.lysateLot || '');
  const map = {};
  dbExps.forEach(e => { map[key(e)] = { id: e.id, lysateLot: e.lysateLot || '', source: 'db' }; });
  idbExps.forEach(e => {
    const k = key(e);
    if (map[k]) {
      map[k].source = 'both';
    } else {
      map[k] = { id: e.id, lysateLot: e.lysateLot || '', source: 'local' };
    }
  });
  return Object.values(map).sort((a, b) => a.id.localeCompare(b.id) || a.lysateLot.localeCompare(b.lysateLot));
}

async function loadExperimentMergedData(expId, lysateLot) {
  // Try IndexedDB first (faster, has freshly processed data)
  const idbData = await loadSOData(expKey(expId, lysateLot) + 'merged_data');
  if (idbData) return idbData;
  // Fall back to SQLite
  return await loadDbMergedData(expId, lysateLot);
}

async function loadExperimentAggregatedData(expId, lysateLot) {
  // Try IndexedDB first
  const idbData = await loadSOData(expKey(expId, lysateLot) + 'aggregated_data');
  if (idbData) return idbData;
  // For SQLite, load merged data and aggregate on the fly
  const merged = await loadDbMergedData(expId, lysateLot);
  if (!merged) return null;
  const timepoints = getUniqueTimepoints(merged);
  const lastTp = timepoints[timepoints.length - 1];
  const filtered = filterToTimepoint(merged, lastTp);
  return aggregateByCondition(filtered);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  Excel Parsing — Synergy H1 Kinetic Export
//
//  Structure: Multiple wide sub-tables, each covering ~96 wells.
//  Header row has "Time" in col B, well IDs in cols D+.
//  Data rows follow until an empty cell in col B.
// ═══════════════════════════════════════════════════════════════════════════════

function parseExcelKinetic(arrayBuffer) {
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

  // Find all header rows (col B contains "Time")
  const headerRows = [];
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (row && String(row[1] || '').trim() === 'Time') {
      headerRows.push(i);
    }
  }

  if (headerRows.length === 0) {
    throw new Error('Could not find any data tables. Expected "Time" header in column B.');
  }

  const results = [];

  for (let h = 0; h < headerRows.length; h++) {
    const headerIdx = headerRows[h];
    const headerRow = data[headerIdx];

    // Well names start at column D (index 3)
    const wells = [];
    for (let j = 3; j < headerRow.length; j++) {
      const wellName = String(headerRow[j] || '').trim();
      if (wellName && /^[A-P]\d{1,2}$/.test(wellName)) {
        wells.push({ col: j, name: wellName });
      }
    }

    // Read data rows until empty Time cell
    for (let i = headerIdx + 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row[1] === null || row[1] === undefined || String(row[1]).trim() === '') break;

      const timeRaw = row[1];
      const timeStr = formatTime(timeRaw);

      for (const well of wells) {
        const val = parseFloat(row[well.col]);
        if (!isNaN(val)) {
          results.push({
            Well: well.name,
            Time: timeStr,
            Measurement: val
          });
        }
      }
    }
  }

  return results;
}

function formatTime(val) {
  if (typeof val === 'number') {
    // Excel time fraction (0.0 = 00:00:00, 0.5 = 12:00:00)
    const totalSeconds = Math.round(val * 86400);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }
  const str = String(val).trim();
  const match = str.match(/(\d{1,2}):(\d{2}):(\d{2})/);
  if (match) {
    return `${match[1].padStart(2,'0')}:${match[2]}:${match[3]}`;
  }
  return str;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  Layout CSV Parsing
// ═══════════════════════════════════════════════════════════════════════════════

function parseLayoutCSV(csvText) {
  const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });

  if (!parsed.data || parsed.data.length === 0) {
    throw new Error('Layout CSV is empty');
  }

  // Flexible column matching (case-insensitive)
  const firstRow = parsed.data[0];
  const colMap = {};

  for (const key in firstRow) {
    const lk = key.toLowerCase().trim();
    if (lk.includes('well') && !colMap['Well']) colMap['Well'] = key;
    if (lk.includes('mgglu') && !colMap['MgGlu']) colMap['MgGlu'] = key;
    if (lk.includes('kglu') && !colMap['KGlu']) colMap['KGlu'] = key;
  }

  if (!colMap['Well'] || !colMap['MgGlu'] || !colMap['KGlu']) {
    throw new Error('Layout CSV missing required columns: Well, MgGlu, KGlu');
  }

  return parsed.data.map(row => ({
    Well: normalizeWellID(row[colMap['Well']]),
    MgGlu: parseFloat(row[colMap['MgGlu']]) || 0,
    KGlu: parseFloat(row[colMap['KGlu']]) || 0
  })).filter(r => r.Well);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  Layout from in-browser builder (array of {Well, MgGlu, KGlu})
// ═══════════════════════════════════════════════════════════════════════════════

function parseLayoutFromBuilder(mgMap, kMap) {
  // mgMap: { "A1": 0, "A2": 0, ... }
  // kMap:  { "A1": 100, "A2": 120, ... }
  // Only include wells where both Mg and K are set
  const allWells = new Set([...Object.keys(mgMap), ...Object.keys(kMap)]);
  const results = [];
  allWells.forEach(well => {
    const mg = mgMap[well];
    const k = kMap[well];
    if (mg !== undefined && mg !== null && k !== undefined && k !== null) {
      results.push({ Well: normalizeWellID(well), MgGlu: mg, KGlu: k });
    }
  });
  return results;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  Merging
// ═══════════════════════════════════════════════════════════════════════════════

function mergeDataWithLayout(excelData, layoutData) {
  const layoutMap = {};
  layoutData.forEach(row => { layoutMap[normalizeWellID(row.Well)] = row; });

  const merged = [];
  const unmatchedWells = new Set();

  excelData.forEach(row => {
    const well = normalizeWellID(row.Well);
    const layout = layoutMap[well];
    if (layout) {
      merged.push({ ...row, Well: well, MgGlu: layout.MgGlu, KGlu: layout.KGlu });
    } else {
      unmatchedWells.add(row.Well);
    }
  });

  return { data: merged, unmatchedCount: unmatchedWells.size, unmatchedWells: [...unmatchedWells] };
}

function normalizeWellID(well) {
  const match = String(well || '').match(/^([A-P])0*(\d+)$/i);
  return match ? match[1].toUpperCase() + match[2] : String(well || '').toUpperCase().trim();
}

// ═══════════════════════════════════════════════════════════════════════════════
//  Timepoint Helpers
// ═══════════════════════════════════════════════════════════════════════════════

function getUniqueTimepoints(data) {
  return [...new Set(data.map(d => d.Time))].sort();
}

function filterToTimepoint(data, tp) {
  return data.filter(d => d.Time === tp);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  Aggregation — Group by Mg/K condition
// ═══════════════════════════════════════════════════════════════════════════════

function aggregateByCondition(data) {
  const groups = {};

  data.forEach(row => {
    const key = `${row.MgGlu}|||${row.KGlu}`;
    if (!groups[key]) groups[key] = { MgGlu: row.MgGlu, KGlu: row.KGlu, measurements: [] };
    groups[key].measurements.push(row.Measurement);
  });

  return Object.values(groups).map(g => {
    const n = g.measurements.length;
    const avg = calcMean(g.measurements);
    const sd = calcStdev(g.measurements);
    const cv = n > 1 && avg !== 0 ? (sd / avg * 100) : 0;

    return {
      MgGlu: g.MgGlu, KGlu: g.KGlu,
      mean: Math.round(avg),
      geoMean: Math.round(calcGeoMean(g.measurements)),
      sd: Math.round(sd * 10) / 10,
      cv: Math.round(cv * 10) / 10,
      n,
      min: Math.min(...g.measurements),
      max: Math.max(...g.measurements)
    };
  }).sort((a, b) => b.mean - a.mean);
}

function identifyTop3(aggregated) {
  return aggregated.slice(0, 3).map((row, i) => ({ ...row, rank: i + 1 }));
}

// ═══════════════════════════════════════════════════════════════════════════════
//  Stats helpers
// ═══════════════════════════════════════════════════════════════════════════════

function calcMean(arr) {
  if (arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function calcStdev(arr) {
  if (arr.length <= 1) return 0;
  const m = calcMean(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length);
}

function calcGeoMean(arr) {
  if (arr.length === 0) return 0;
  // Filter to positive values only (geometric mean requires positive numbers)
  const pos = arr.filter(v => v > 0);
  if (pos.length === 0) return 0;
  // Use log-sum-exp to avoid overflow/underflow
  const logSum = pos.reduce((s, v) => s + Math.log(v), 0);
  return Math.exp(logSum / pos.length);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  CSV Export
// ═══════════════════════════════════════════════════════════════════════════════

function generateAllDataCSV(mergedData) {
  const headers = ['Well', 'Time', 'Measurement', 'MgGlu [mM]', 'KGlu [mM]'];
  const rows = mergedData.map(r => [r.Well, r.Time, r.Measurement, r.MgGlu, r.KGlu]);
  return Papa.unparse({ fields: headers, data: rows });
}

function generateTop3CSV(top3) {
  const headers = ['Rank', 'MgGlu [mM]', 'KGlu [mM]', 'Mean RFU', 'SD', 'CV%', 'n'];
  const rows = top3.map(r => [r.rank, r.MgGlu, r.KGlu, r.mean, r.sd, r.cv, r.n]);
  return Papa.unparse({ fields: headers, data: rows });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  Full Pipeline
// ═══════════════════════════════════════════════════════════════════════════════

async function processSaltOptimizationData(excelBuffer, layoutData, targetTimepoint) {
  // Step 1: Parse Excel
  const excelData = parseExcelKinetic(excelBuffer);
  if (excelData.length === 0) throw new Error('No data found in Excel file.');

  // Step 2: Merge
  const mergeResult = mergeDataWithLayout(excelData, layoutData);
  const mergedData = mergeResult.data;
  if (mergedData.length === 0) throw new Error('No wells matched between Excel and layout.');

  // Step 3: Timepoints
  const timepoints = getUniqueTimepoints(mergedData);
  if (!targetTimepoint) targetTimepoint = timepoints[timepoints.length - 1]; // default to last
  if (!timepoints.includes(targetTimepoint)) {
    throw new Error(`Timepoint "${targetTimepoint}" not found. Available: ${timepoints.join(', ')}`);
  }

  // Step 4: Filter
  const filteredData = filterToTimepoint(mergedData, targetTimepoint);

  // Step 5: Aggregate
  const aggregatedData = aggregateByCondition(filteredData);

  // Step 6: Top 3
  const top3 = identifyTop3(aggregatedData);

  return {
    success: true,
    metadata: {
      excelRows: excelData.length,
      layoutRows: layoutData.length,
      mergedRows: mergedData.length,
      filteredRows: filteredData.length,
      conditions: aggregatedData.length,
      timepoints,
      targetTimepoint,
      unmatchedWells: mergeResult.unmatchedCount
    },
    mergedData,
    filteredData,
    aggregatedData,
    top3
  };
}
