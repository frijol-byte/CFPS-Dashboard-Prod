// Shared data loading module for CFPS Dashboard
// Handles IndexedDB caching with automatic freshness checking against cfps.db

function odb() {
  return new Promise(function(r, j) {
    var q = indexedDB.open('cfps', 1);
    q.onupgradeneeded = function() { q.result.createObjectStore('c'); };
    q.onsuccess = function() { r(q.result); };
    q.onerror = function() { j(q.error); };
  });
}

function saveCSV(csv, fn, dbVersion, source) {
  return odb().then(function(db) {
    var tx = db.transaction('c', 'readwrite');
    tx.objectStore('c').put({
      csv: csv, fn: fn, ts: Date.now(),
      dbVersion: dbVersion || null,
      source: source || 'db'
    }, 'k');
    return new Promise(function(r) { tx.oncomplete = r; });
  }).catch(function() {});
}

function getCSV() {
  return odb().then(function(db) {
    var tx = db.transaction('c', 'readonly');
    var rq = tx.objectStore('c').get('k');
    return new Promise(function(r) {
      rq.onsuccess = function() { r(rq.result || null); };
      rq.onerror = function() { r(null); };
    });
  }).catch(function() { return null; });
}

function delCSV() {
  return odb().then(function(db) {
    var tx = db.transaction('c', 'readwrite');
    tx.objectStore('c').delete('k');
  }).catch(function() {});
}

function _dbToCSV(sqlDb) {
  var tables = sqlDb.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='P902_Results'");
  if (!tables.length || !tables[0].values.length) return null;
  var result = sqlDb.exec("SELECT * FROM P902_Results");
  if (!result.length || !result[0].values.length) return null;
  var cols = result[0].columns, rows = result[0].values;
  var csv = cols.join(',') + '\n';
  for (var i = 0; i < rows.length; i++) {
    csv += rows[i].map(function(v) {
      if (v === null) return '';
      var s = String(v);
      if (s.indexOf(',') >= 0 || s.indexOf('"') >= 0 || s.indexOf('\n') >= 0)
        return '"' + s.replace(/"/g, '""') + '"';
      return s;
    }).join(',') + '\n';
  }
  return { csv: csv, rowCount: rows.length };
}

async function _refreshFromDB(version) {
  var SQL = await initSqlJs({
    locateFile: function(f) { return 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/' + f; }
  });
  var resp = await fetch('cfps.db', { cache: 'reload' });
  if (!resp.ok) return null;
  var buf = await resp.arrayBuffer();
  var db = new SQL.Database(new Uint8Array(buf));
  var result = _dbToCSV(db);
  db.close();
  if (!result) return null;
  var fn = 'cfps.db \u2192 auto-loaded (' + result.rowCount + ' rows)';
  await saveCSV(result.csv, fn, version, 'db');
  return { csv: result.csv, fn: fn, ts: Date.now(), dbVersion: version, source: 'db' };
}

async function loadData() {
  var cached = await getCSV();

  // If user manually uploaded a CSV via load.html, respect that choice
  if (cached && cached.source === 'file') return cached;

  // Check db_meta.json for freshness
  try {
    var metaResp = await fetch('db_meta.json', { cache: 'no-cache' });
    if (metaResp.ok) {
      var meta = await metaResp.json();
      var version = meta.built_at;

      // Cache matches current DB version — use it
      if (cached && cached.dbVersion && cached.dbVersion === version) return cached;

      // DB has been updated (or first load) — refresh from cfps.db
      var fresh = await _refreshFromDB(version);
      if (fresh) return fresh;
    }
  } catch (e) {
    // db_meta.json missing or network error — fall through
  }

  // Fallback: no db_meta.json yet (pipeline hasn't been updated).
  // If we have no cache at all, try loading directly from cfps.db once.
  if (!cached) {
    try {
      var fresh = await _refreshFromDB('unknown');
      if (fresh) return fresh;
    } catch (e) {}
  }

  return cached;
}
