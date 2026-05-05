// Shared GitHub API utilities for CFPS Dashboard toolkit
// Reads/writes gh_settings from localStorage

function getGHSettings() {
  try {
    return JSON.parse(localStorage.getItem('gh_settings') || '{}');
  } catch (e) { return {}; }
}

function hasGHSettings() {
  var s = getGHSettings();
  return !!(s.repo && s.token);
}

// Backward-compatible aliases
var getGLSettings = getGHSettings;
var hasGLSettings = hasGHSettings;

async function readRepoFile(filePath) {
  if (!hasGHSettings()) {
    var ok = await showGHSettingsModal();
    if (!ok) throw new Error('GitHub settings required.');
  }
  var s = getGHSettings();
  var branch = s.branch || 'main';
  var encodedPath = encodeURIComponent(filePath);
  var resp = await fetch('https://api.github.com/repos/' + s.repo + '/contents/' + encodedPath + '?ref=' + branch, {
    headers: { 'Authorization': 'Bearer ' + s.token, 'Accept': 'application/vnd.github.v3+json' }
  });
  if (resp.status === 404) return null;
  if (!resp.ok) throw new Error('GitHub API error (' + resp.status + ')');
  var data = await resp.json();
  return atob(data.content.replace(/\n/g, ''));
}

async function _getFileSha(filePath) {
  var s = getGHSettings();
  var branch = s.branch || 'main';
  var encodedPath = encodeURIComponent(filePath);
  try {
    var resp = await fetch('https://api.github.com/repos/' + s.repo + '/contents/' + encodedPath + '?ref=' + branch, {
      headers: { 'Authorization': 'Bearer ' + s.token, 'Accept': 'application/vnd.github.v3+json' }
    });
    if (resp.ok) {
      var data = await resp.json();
      return data.sha;
    }
  } catch (e) {}
  return null;
}

async function commitRepoFile(filePath, content, commitMessage) {
  if (!hasGHSettings()) {
    var ok = await showGHSettingsModal();
    if (!ok) throw new Error('GitHub settings required.');
  }
  var s = getGHSettings();
  var branch = s.branch || 'main';
  var encodedPath = encodeURIComponent(filePath);

  var sha = await _getFileSha(filePath);

  var body = {
    message: commitMessage,
    content: btoa(unescape(encodeURIComponent(content))),
    branch: branch
  };
  if (sha) body.sha = sha;

  var resp = await fetch('https://api.github.com/repos/' + s.repo + '/contents/' + encodedPath, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + s.token,
      'Accept': 'application/vnd.github.v3+json'
    },
    body: JSON.stringify(body)
  });
  if (!resp.ok) {
    var err = await resp.json().catch(function () { return {}; });
    throw new Error(err.message || resp.statusText);
  }
  return await resp.json();
}

// Experiment descriptions: read from cfps.db, write via GitHub API

var _descCache = null;

async function loadAllDescriptions() {
  if (_descCache) return _descCache;
  try {
    var SQL = await initSqlJs({ locateFile: function (f) { return 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/' + f; } });
    var resp = await fetch('cfps.db', { cache: 'no-cache' });
    if (!resp.ok) return {};
    var buf = await resp.arrayBuffer();
    var db = new SQL.Database(new Uint8Array(buf));
    var tables = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='experiment_meta'");
    if (!tables.length || !tables[0].values.length) { db.close(); return {}; }
    var result = db.exec("SELECT exp_id, description, updated_by, updated_at FROM experiment_meta");
    db.close();
    if (!result.length) return {};
    var map = {};
    result[0].values.forEach(function (row) {
      map[row[0]] = { description: row[1] || '', updatedBy: row[2] || '', updatedAt: row[3] || '' };
    });
    _descCache = map;
    return map;
  } catch (e) { return {}; }
}

function getDescription(descs, expId) {
  return descs && descs[expId] ? descs[expId].description : '';
}

async function saveDescription(expId, description, operatorInitials) {
  var META_PATH = 'data/experiment_meta.csv';
  var raw = await readRepoFile(META_PATH);
  var rows = [];
  var found = false;
  var now = new Date().toISOString();
  var by = operatorInitials || '';

  if (raw) {
    var lines = raw.trim().split('\n');
    var header = lines[0];
    for (var i = 1; i < lines.length; i++) {
      var parts = parseCSVLine(lines[i]);
      if (parts.length < 2) continue;
      if (parts[0] === expId) {
        parts[1] = description;
        parts[2] = by;
        parts[3] = now;
        found = true;
      }
      rows.push(parts);
    }
  }
  if (!found) {
    rows.push([expId, description, by, now]);
  }

  rows.sort(function (a, b) { return a[0].localeCompare(b[0]); });
  var csv = 'exp_id,description,updated_by,updated_at\n';
  rows.forEach(function (r) {
    csv += csvEscape(r[0]) + ',' + csvEscape(r[1]) + ',' + csvEscape(r[2] || '') + ',' + csvEscape(r[3] || '') + '\n';
  });

  await commitRepoFile(META_PATH, csv, '[Meta] Update description for ' + expId);
  _descCache = null;
}

function parseCSVLine(line) {
  var result = []; var field = ''; var inQ = false;
  for (var i = 0; i < line.length; i++) {
    var c = line[i];
    if (inQ) {
      if (c === '"' && line[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') { inQ = false; }
      else { field += c; }
    } else {
      if (c === '"') { inQ = true; }
      else if (c === ',') { result.push(field.trim()); field = ''; }
      else { field += c; }
    }
  }
  result.push(field.trim());
  return result;
}

function csvEscape(v) {
  var s = String(v == null ? '' : v);
  if (s.indexOf(',') >= 0 || s.indexOf('"') >= 0 || s.indexOf('\n') >= 0)
    return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

// Shared GitHub settings modal — usable from any page
function _ghModalCSS() {
  if (document.getElementById('gh-modal-css')) return;
  var st = document.createElement('style'); st.id = 'gh-modal-css';
  st.textContent = [
    '#gh-cfg-overlay{position:fixed;inset:0;z-index:9500;background:rgba(0,0,0,.4);backdrop-filter:blur(2px);display:flex;align-items:center;justify-content:center}',
    '#gh-cfg-modal{background:#fff;border-radius:14px;box-shadow:0 20px 60px rgba(0,0,0,.25);width:92vw;max-width:420px;padding:24px 28px;font-family:"DM Sans",system-ui,sans-serif;position:relative}',
    '#gh-cfg-modal h3{font-size:1rem;font-weight:700;margin:0 0 4px}',
    '#gh-cfg-modal p{font-size:.78rem;color:#6b6b65;margin:0 0 14px;line-height:1.45}',
    '.gh-cfg-field{margin-bottom:10px}',
    '.gh-cfg-field label{display:block;font-size:.7rem;font-weight:600;color:#8a8a83;text-transform:uppercase;letter-spacing:.03em;margin-bottom:2px}',
    '.gh-cfg-field input{width:100%;padding:7px 10px;border:1.5px solid #DAD8D2;border-radius:8px;font-size:.82rem;font-family:"JetBrains Mono",monospace;color:#1a1a18;outline:none;background:#FAFAF8}',
    '.gh-cfg-field input:focus{border-color:#0D7D8A}',
    '.gh-cfg-row{display:flex;gap:10px}',
    '.gh-cfg-row .gh-cfg-field{flex:1}',
    '.gh-cfg-btns{display:flex;gap:8px;margin-top:16px}',
    '.gh-cfg-save{padding:8px 20px;border:none;border-radius:8px;background:#1B6B4A;color:#fff;font-size:.82rem;font-weight:600;cursor:pointer;font-family:inherit}',
    '.gh-cfg-save:hover{background:#0F4A32}',
    '.gh-cfg-cancel{padding:8px 16px;border:1.5px solid #DAD8D2;border-radius:8px;background:#fff;color:#6b6b65;font-size:.82rem;font-weight:500;cursor:pointer;font-family:inherit}',
    '.gh-cfg-cancel:hover{border-color:#1B6B4A;color:#1B6B4A}'
  ].join('\n');
  document.head.appendChild(st);
}

var _ghResolve = null;

function showGHSettingsModal() {
  return new Promise(function (resolve) {
    _ghResolve = resolve;
    _ghModalCSS();
    if (document.getElementById('gh-cfg-overlay')) { document.getElementById('gh-cfg-overlay').style.display = 'flex'; _populateGHModal(); return; }
    var ov = document.createElement('div'); ov.id = 'gh-cfg-overlay';
    ov.innerHTML = '<div id="gh-cfg-modal">' +
      '<h3>GitHub Settings</h3>' +
      '<p>Required for saving descriptions and pushing data. Stored in your browser only.</p>' +
      '<div class="gh-cfg-row"><div class="gh-cfg-field" style="flex:2"><label>Repository</label><input id="ghCfgRepo" placeholder="owner/repo-name"></div>' +
      '<div class="gh-cfg-field"><label>Branch</label><input id="ghCfgBranch" value="main"></div></div>' +
      '<div class="gh-cfg-field"><label>Personal Access Token <span style="font-weight:400;text-transform:none;letter-spacing:0;color:#aaa">(repo scope)</span></label><input id="ghCfgToken" type="password" placeholder="ghp_xxxxxxxxxxxx"></div>' +
      '<div class="gh-cfg-btns"><button class="gh-cfg-save" id="ghCfgSave">Save</button><button class="gh-cfg-cancel" id="ghCfgCancel">Cancel</button></div>' +
      '</div>';
    document.body.appendChild(ov);
    _populateGHModal();
    document.getElementById('ghCfgSave').onclick = function () {
      var s = {
        repo: document.getElementById('ghCfgRepo').value.trim(),
        branch: document.getElementById('ghCfgBranch').value.trim() || 'main',
        token: document.getElementById('ghCfgToken').value.trim()
      };
      if (!s.repo || !s.token) { document.getElementById('ghCfgRepo').style.borderColor = s.repo ? '' : '#dc2626'; document.getElementById('ghCfgToken').style.borderColor = s.token ? '' : '#dc2626'; return; }
      try { localStorage.setItem('gh_settings', JSON.stringify(s)); } catch (e) {}
      ov.style.display = 'none';
      if (_ghResolve) { _ghResolve(true); _ghResolve = null; }
    };
    document.getElementById('ghCfgCancel').onclick = function () {
      ov.style.display = 'none';
      if (_ghResolve) { _ghResolve(false); _ghResolve = null; }
    };
    ov.addEventListener('click', function (e) { if (e.target === ov) { ov.style.display = 'none'; if (_ghResolve) { _ghResolve(false); _ghResolve = null; } } });
  });
}

// Backward-compatible alias
var showGLSettingsModal = showGHSettingsModal;

function _populateGHModal() {
  var s = getGHSettings();
  var p = document.getElementById('ghCfgRepo'); if (p) { p.value = s.repo || ''; p.style.borderColor = ''; }
  var b = document.getElementById('ghCfgBranch'); if (b) b.value = s.branch || 'main';
  var t = document.getElementById('ghCfgToken'); if (t) { t.value = s.token || ''; t.style.borderColor = ''; }
}

async function ensureGHSettings() {
  if (hasGHSettings()) return true;
  return await showGHSettingsModal();
}

// Backward-compatible alias
var ensureGLSettings = ensureGHSettings;

// Auto-inject a "GitHub Settings" link into help modals on any page
(function () {
  function injectGHHelpLink() {
    var body = document.querySelector('.help-modal-body');
    if (!body || body.querySelector('.gh-help-link')) return;
    var btn = document.createElement('button');
    btn.className = 'gh-help-link';
    btn.innerHTML = '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24" style="vertical-align:middle;margin-right:4px"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>GitHub Settings' + (hasGHSettings() ? ' <span style="color:#16a34a;font-size:.7rem">(configured)</span>' : ' <span style="color:#dc2626;font-size:.7rem">(not set)</span>');
    btn.style.cssText = 'display:flex;align-items:center;gap:4px;padding:8px 14px;border-radius:8px;border:1.5px solid #DAD8D2;background:#FAFAF8;color:#4A4A45;font-size:.78rem;font-weight:600;cursor:pointer;font-family:inherit;transition:all .2s;margin-bottom:12px;width:100%';
    btn.onmouseover = function () { btn.style.borderColor = '#1B6B4A'; btn.style.color = '#1B6B4A'; };
    btn.onmouseout = function () { btn.style.borderColor = '#DAD8D2'; btn.style.color = '#4A4A45'; };
    btn.onclick = function (e) {
      e.preventDefault();
      var hm = document.getElementById('helpModal'); if (hm) hm.classList.remove('show');
      var ho = document.getElementById('helpOverlay'); if (ho) ho.classList.remove('show');
      var hf = document.getElementById('helpFab'); if (hf) hf.classList.remove('open');
      showGHSettingsModal().then(function () {
        btn.querySelector('span').textContent = hasGHSettings() ? '(configured)' : '(not set)';
        btn.querySelector('span').style.color = hasGHSettings() ? '#16a34a' : '#dc2626';
      });
    };
    body.insertBefore(btn, body.firstChild);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(injectGHHelpLink, 600); });
  else setTimeout(injectGHHelpLink, 600);
})();
