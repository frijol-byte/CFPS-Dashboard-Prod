// Tutorial engine for CFPS Dashboard toolkit
(function() {
  'use strict';
  var PREFIX = 'cfps_tutorial_';
  var spot, tip, isOn = false, steps = [], idx = 0, pageKey = '';

  var STEPS = {
    load: [
      { s: '#da', t: 'Upload CSV', d: 'Drag-and-drop or click to upload a processed results CSV. The file is cached in your browser so you can switch between tabs without re-uploading.' },
      { s: '#dbSection', t: 'Load from Database', d: 'Pull data directly from the P902_Results table in cfps.db. No file needed \u2014 the database is built automatically by the CI pipeline whenever new data is pushed.' },
      { s: '#rebuildSection', t: 'Rebuild Database', d: 'Rebuilds cfps.db in your browser from all CSVs in data/P902_Results/. Use this after pushing new data from AbsQuant if the pipeline hasn\u2019t run yet.' }
    ],
    dashboard: [
      { s: '.nav', t: 'Navigation', d: 'Switch between dashboard views: Overview, Curves & Lots, Experiment deep dive, Raw Data, and Reproducibility.' },
      { s: '[style*="Filters"]', f: function() { return findByText('button', 'Filters'); }, t: 'Filters', d: 'Toggle the filter panel to narrow your data by Experiment ID, Template, Reaction Volume, Lysate, Master Mix, Product, Operator, or Test Condition.' },
      { s: '[style*="gridTemplateColumns: repeat(6"]', f: function() { return document.querySelector('#app div[style]') && findGrid(6); }, t: 'Key Metrics', d: 'At-a-glance KPIs: filtered sample count, mean and median concentration, CV%, number of experiments, and outlier count.' }
    ],
    experiment: [
      { s: 'select[style*="fontSize"]', f: function() { return findByText('span', 'EXPERIMENT:') && findByText('span', 'EXPERIMENT:').parentElement.querySelector('select'); }, t: 'Experiment Selector', d: 'Choose which experiment to analyze. All charts and tables below update to show data from this experiment only.' },
      { f: function() { return findByText('span', 'Op:') && findByText('span', 'Op:').parentElement; }, t: 'Experiment Metadata', d: 'Quick reference for this experiment\u2019s operator, lysate lot, template type, reaction volume, and sample count.' },
      { f: function() { return findByText('span', 'Group:') && findByText('span', 'Group:').parentElement.parentElement; }, t: 'Group & Subgroup', d: 'Change how data is grouped in the chart below. Group by Product, Lysate, Operator, Template, or other metadata. Add a subgroup for two-level breakdowns.' },
      { f: function() { return findByText('span', 'Concentration by Group') && findByText('span', 'Concentration by Group').closest('div[style*="border"]'); }, t: 'Concentration Chart', d: 'Mean \u00b1 SD bar chart with individual data points. Large dots are group means, vertical bars show \u00b11 SD, small dots are individual wells. Hover for details.' },
      { f: function() { return findByText('span', 'Summary Stats') && findByText('span', 'Summary Stats').closest('div[style*="border"]'); }, t: 'Summary Stats', d: 'Per-group statistics table showing sample count, mean concentration, standard deviation, and CV%. High CV% values are highlighted in red.' },
      { f: function() { return findByText('span', 'Plate Heatmap') && findByText('span', 'Plate Heatmap').closest('div[style*="border"]'); }, t: 'Plate Heatmap', d: 'Full 384-well plate visualization. Color intensity shows RFU values (Viridis scale). Standard wells are dimmed with purple borders. Hover any well for its value.' },
      { f: function() { return findByText('span', 'Standard Curve') && findByText('span', 'Standard Curve').closest('div[style*="border"]'); }, t: 'Standard Curve', d: 'Linear regression of standard points. Shows R\u00b2 quality (green = good, yellow = acceptable, red = poor). Blue dots are standards, orange are spike-ins, gray X marks are samples.' },
      { f: function() { return findByText('span', 'Well Data') && findByText('span', 'Well Data').closest('div[style*="border"]'); }, t: 'Well Data Table', d: 'Paginated table of all wells in this experiment. Click column headers to sort. Use the search box to filter, or click Export to download as CSV.' },
      { f: function() { return findByText('span', 'Spatial Analysis') && findByText('span', 'Spatial Analysis').closest('div[style*="border"]'); }, t: 'Spatial Analysis', d: 'Checks for plate edge effects by comparing mean concentration across rows and columns. Systematic gradients may indicate evaporation or temperature issues.' }
    ],
    curves: [
      { s: '.nav', t: 'Navigation', d: 'You\u2019re on the Curves & Lots tab. Use the nav bar to switch between views.' },
      { f: function() { return findByText('button', 'Filters'); }, t: 'Filters', d: 'Filter data by experiment, template, lysate, and other metadata. All charts update in real time.' }
    ],
    raw: [
      { s: '.nav', t: 'Navigation', d: 'You\u2019re on the Raw Data tab. This shows the full unprocessed dataset in a sortable, searchable table.' },
      { f: function() { return findByText('button', 'Filters'); }, t: 'Filters', d: 'Filter the raw data table by any metadata field.' }
    ],
    repro: [
      { s: '.nav', t: 'Navigation', d: 'You\u2019re on the Reproducibility tab. This view helps you assess consistency across experiments.' },
      { f: function() { return findByText('button', 'Filters'); }, t: 'Filters', d: 'Filter which experiments and conditions to include in the reproducibility analysis.' }
    ],
    plate_reader_analyzer: [
      { s: '#uploadResults', t: 'Results File', d: 'Upload your plate reader Excel (.xlsx) or CSV file containing raw fluorescence measurements. The tool auto-detects the data layout.' },
      { s: '#uploadLayout', t: 'Plate Layout', d: 'Upload a CSV mapping each well to its sample key, known concentration (for standards), and dilution factor. Analysis starts automatically once both files are loaded.' },
      { s: '#statsRow', t: 'Regression Stats', d: 'After analysis runs, these cards show the standard curve R\u00b2, slope, intercept, and number of sample groups.', w: true },
      { s: '#tabsRow', t: 'Analysis Tabs', d: 'Switch between views: Standard Curve regression plot, Experiment Summary (mean \u00b1 SD), Violin Plot (distributions), and Summary Table.', w: true },
      { s: '#exportPanel', t: 'Export', d: 'Download your results as CSV: all data, outlier-cleaned data, or summary statistics. Charts can be saved as PNG.', w: true },
      { s: '#dbPanel', t: 'Push to Database', d: 'Validates your output columns against the existing P902_Results table, then commits the CSV directly to your GitLab repo. The CI pipeline rebuilds cfps.db automatically.', w: true }
    ],
    so_tool: [
      { s: '#expId', t: 'Experiment ID', d: 'Enter the experiment identifier (e.g. E236). This is used to tag and retrieve your salt optimization data.' },
      { s: '#lysateLot', t: 'Lysate Lot', d: 'Enter the lysate lot number (e.g. 17-L). Together with Exp ID, this uniquely identifies a salt optimization experiment.' },
      { s: '#excelZone', t: 'Excel Results', d: 'Upload your Synergy H1 kinetic export Excel file. The tool extracts fluorescence readings across all timepoints and wells.' },
      { s: '#csvZone', t: 'Layout CSV (Optional)', d: 'Upload a CSV mapping wells to Mg/K concentrations. Or use the plate builder on the left to define your layout visually.' },
      { s: '.sidebar', t: 'Plate Builder', d: 'Define your Mg/K screening layout visually. Set concentration ranges for Mg (by row) and K (by column), then click Fill to populate the plate map. You can also set recipe volumes and stock concentrations.' },
      { s: '.bb-btn.primary', f: function() { return findByText('button', 'Process'); }, t: 'Process', d: 'Runs the full pipeline: parses Excel, merges with layout, aggregates by Mg/K condition, and identifies the top 3 conditions. Results are cached in your browser.' }
    ],
    so_heatmap: [
      { s: '#expSelect', t: 'Experiment Selector', d: 'Choose which salt optimization experiment to view. The dropdown lists all experiments from your local cache and the database.' },
      { s: '#lysateSelect', t: 'Lysate Lot', d: 'Select the lysate lot for this experiment. Each experiment may have been run with different lysate lots.' },
      { s: '#metricSelect', t: 'Metric', d: 'Choose which statistic to display in the heatmap: Mean, Geometric Mean, Max, or Min fluorescence.' },
      { s: '#heatmapContainer', t: 'Heatmap', d: 'A 2D grid showing fluorescence for each Mg/K combination. Rows are Mg concentrations, columns are K concentrations. Top 3 conditions are starred. Hover cells for exact values.' },
      { s: '#top3Table', t: 'Top 3 Conditions', d: 'The three best-performing Mg/K combinations ranked by the selected metric, with mean, SD, CV%, and replicate count.' },
      { s: '.actions', t: 'Export', d: 'Download the heatmap as SVG or PNG, or export the raw data and top 3 conditions as CSV.' }
    ],
    so_timecourse: [
      { s: '#expSelect', t: 'Experiment', d: 'Select an experiment to view its kinetic time-course data.' },
      { s: '#lysateSelect', t: 'Lysate Lot', d: 'Choose the lysate lot for this experiment.' },
      { s: '#yAxisMode', t: 'Y-Axis Scaling', d: 'Shared mode uses the same Y-axis range across all wells for easy comparison. Individual mode scales each well independently to show detail.' },
      { s: '#plateGrid', t: 'Well Selector', d: 'Click individual wells or drag to select a region. Selected wells are shown in the chart. Color indicates Mg/K condition.' },
      { s: '.chart-panel', t: 'Time-Course Chart', d: 'Fluorescence over time for each selected well. Inflection points (growth rate peaks) and asymptotes (plateau values) are marked when enabled.' }
    ],
    gantt_tool: [
      { s: '.toolbar', t: 'Toolbar', d: 'The toolbar contains all your main actions: Import CSV, download a template, add tasks, clear data, zoom controls, and export options (SVG, PNG, CSV).' },
      { s: '#tablePanel', t: 'Task Table', d: 'Your task list. Each row has an Activity name, Description, Start/End dates, Product, Assignee, and Status. Click any cell to edit inline — changes save automatically.' },
      { s: '#legendBar', t: 'Legend Bar', d: 'Use the “Color by” dropdown to group chart bars by Product, Assignee, Status, or Activity Type. The legend updates to show which colors map to which values.' },
      { s: '.chart-panel', t: 'Gantt Chart', d: 'The timeline view. Bars represent task durations, colored by the selected grouping. Hover any bar for details. Dashed arrows show task dependencies.' },
      { s: '#addBtn', t: 'Add Task', d: 'Click to add a new task row. You can also type directly into the ghost row at the bottom of the table.' },
      { s: '.zoom-group', t: 'Zoom Controls', d: 'Adjust the timeline scale with + and − buttons. Useful for viewing long-range projects or zooming into a specific week.' }
    ],
    report_generator: [
      { f: function() { return document.querySelector('.rpt-template-card'); }, t: 'Choose Template', d: 'Pick a report template: Quick QC for routine pass/fail checks, Full Analysis for comprehensive reports with all charts, or Executive Summary for high-level KPIs only. Each pre-selects the right sections.' },
      { f: function() { return document.querySelector('.rpt-exp-chip'); }, t: 'Select Experiments', d: 'Click experiment chips to select one or more experiments. Multi-select creates a batch report with page breaks between each experiment.' },
      { f: function() { return findByText('div', '3. Filter Data') || findByText('div', '3.'); }, t: 'Filter Data', d: 'Expand filters to exclude unwanted data before the report generates. For example, filter to only 400x dilution or remove neg/control products. Filters apply across all selected experiments.' },
      { f: function() { return document.querySelector('.rpt-gs'); }, t: 'Group & Sub-group', d: 'Control how statistics and charts are broken down. Pick a primary group (e.g. Product) and optionally a sub-group (e.g. Operator) for cross-tabulated labels like "Premium / JC".' },
      { f: function() { return findByText('div', '5. Report Sections') || findByText('div', '5.'); }, t: 'Report Sections', d: 'Toggle individual sections on or off. Templates pre-select sensible defaults, but you can customize further.' },
      { f: function() { return findByText('button', 'Generate'); }, t: 'Generate Report', d: 'Click to preview your report. From the preview, export as standalone HTML or use Print / PDF via the browser dialog.' },
      { f: function() { return findByText('button', 'Add comment'); }, t: 'Custom Comments', d: 'Each report section has an "Add comment" button. Type notes with bold, italic, font sizes, and bullet/numbered lists. Comments appear in exports and printed reports.', w: true }
    ],
    graph_builder: [
      { s: '.sidebar', t: 'Sidebar', d: 'Data sources from cfps.db are listed here. Click a table to load it, then its columns appear as draggable chips below. Blue chips are numeric, red are categorical.' },
      { s: '#toolbar', t: 'Chart Types', d: 'Choose from 10 chart types: Scatter, Bar, Box Plot, Histogram, Violin, Line, Area, Heatmap, Pie, and Treemap. Each adapts to the variables you assign.' },
      { s: '[data-zone="x"]', t: 'X Axis Drop Zone', d: 'Drag a column chip here to set the X axis variable. For categorical columns, each unique value becomes a group.' },
      { s: '[data-zone="y"]', t: 'Y Axis Drop Zone', d: 'Drag a column chip here to set the Y axis variable. Typically a numeric measurement like concentration or fluorescence.' },
      { s: '[data-zone="color"]', t: 'Color Drop Zone', d: 'Drag a column here to color-code data points by group. Great for comparing products, lysates, or operators within the same chart.' },
      { s: '[data-zone="wrap"]', t: 'Wrap (Facet)', d: 'Drag a column here to create small multiples \u2014 one mini-chart per unique value. Useful for comparing across experiments or conditions.' },
      { s: '#filterBar', t: 'Filters', d: 'Filter which rows are plotted. Click column names in the filter bar to select/deselect specific values. Supports both categorical and numeric range filters.' },
      { s: '.sb-section.scroll', t: 'Properties', d: 'Fine-tune your chart: add statistics (mean, median), error bars (SD, SEM, CI), jitter, overlays (smoother, line of fit), and control axes, opacity, and point size.' }
    ]
  };

  function findByText(tag, text) {
    var els = document.querySelectorAll(tag);
    for (var i = 0; i < els.length; i++) {
      if (els[i].textContent.trim().indexOf(text) === 0) return els[i];
    }
    return null;
  }
  function findGrid(n) {
    var all = document.querySelectorAll('div[style]');
    for (var i = 0; i < all.length; i++) {
      var s = all[i].getAttribute('style') || '';
      if (s.indexOf('repeat(' + n) >= 0 && s.indexOf('grid') >= 0) return all[i];
    }
    return null;
  }

  function getEl(step) {
    if (step.f) { try { return step.f(); } catch (e) { return null; } }
    if (step.s) return document.querySelector(step.s);
    return null;
  }

  function createUI() {
    if (document.getElementById('tut-spot')) return;
    spot = document.createElement('div'); spot.id = 'tut-spot';
    tip = document.createElement('div'); tip.id = 'tut-tip';
    tip.innerHTML = '<div id="tut-title"></div><div id="tut-desc"></div><div id="tut-step"></div><div id="tut-btns"><button id="tut-prev">Previous</button><button id="tut-next">Next</button><button id="tut-skip">Skip tutorial</button></div>';
    document.body.appendChild(spot);
    document.body.appendChild(tip);
    addCSS();
    document.getElementById('tut-prev').onclick = prev;
    document.getElementById('tut-next').onclick = next;
    document.getElementById('tut-skip').onclick = skip;
  }

  function addCSS() {
    if (document.getElementById('tut-css')) return;
    var st = document.createElement('style'); st.id = 'tut-css';
    st.textContent = [
      '#tut-spot{position:fixed;z-index:10000;border-radius:6px;box-shadow:0 0 0 9999px rgba(0,0,0,.55);pointer-events:none;transition:all .35s ease;display:none}',
      '#tut-tip{position:fixed;z-index:10001;background:#fff;border-radius:14px;padding:20px 24px 16px;box-shadow:0 12px 40px rgba(0,0,0,.25);max-width:360px;width:90vw;font-family:"DM Sans",system-ui,sans-serif;display:none;transition:opacity .25s}',
      '#tut-title{font-size:.95rem;font-weight:700;color:#141413;margin-bottom:6px;letter-spacing:-.01em}',
      '#tut-desc{font-size:.82rem;color:#4a4a45;line-height:1.55;margin-bottom:14px}',
      '#tut-step{font-size:.7rem;color:#8a8a83;margin-bottom:10px;font-weight:600;letter-spacing:.03em}',
      '#tut-btns{display:flex;gap:8px;align-items:center}',
      '#tut-prev,#tut-next,#tut-skip{border:none;border-radius:8px;padding:7px 16px;font-size:.78rem;font-weight:600;cursor:pointer;font-family:inherit;transition:all .15s}',
      '#tut-prev{background:#f0efe9;color:#4a4a45}#tut-prev:hover{background:#e0ddd5}#tut-prev:disabled{opacity:.3;cursor:default}',
      '#tut-next{background:#1B6B4A;color:#fff}#tut-next:hover{background:#0F4A32}',
      '#tut-skip{background:transparent;color:#8a8a83;margin-left:auto;padding:7px 10px;font-size:.72rem}#tut-skip:hover{color:#B5342E}',
      '#tut-arrow{position:fixed;z-index:10001;width:0;height:0;pointer-events:none;display:none;transition:all .35s ease}',
      '#tut-arrow.up{border-left:9px solid transparent;border-right:9px solid transparent;border-bottom:11px solid #fff}',
      '#tut-arrow.down{border-left:9px solid transparent;border-right:9px solid transparent;border-top:11px solid #fff}',
      '#tut-arrow.left{border-top:9px solid transparent;border-bottom:9px solid transparent;border-right:11px solid #fff}',
      '#tut-arrow.right{border-top:9px solid transparent;border-bottom:9px solid transparent;border-left:11px solid #fff}',
      '.tut-help-btn{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:8px;border:1.5px solid #1B6B4A;background:#E8F5EE;color:#0F4A32;font-size:.8rem;font-weight:600;cursor:pointer;font-family:inherit;transition:all .2s;margin-bottom:12px;width:100%}',
      '.tut-help-btn:hover{background:#1B6B4A;color:#fff}'
    ].join('\n');
    document.body.appendChild(st);
    var arr = document.createElement('div'); arr.id = 'tut-arrow';
    document.body.appendChild(arr);
  }

  function show(i) {
    idx = i;
    var step = steps[i];
    var el = getEl(step);
    if (!el) {
      if (step.w) { hide(); return; }
      if (i < steps.length - 1) { show(i + 1); return; }
      finish(); return;
    }
    createUI();
    var r = el.getBoundingClientRect();
    var pad = 6;
    spot.style.display = 'block';
    spot.style.left = (r.left - pad) + 'px';
    spot.style.top = (r.top - pad) + 'px';
    spot.style.width = (r.width + pad * 2) + 'px';
    spot.style.height = (r.height + pad * 2) + 'px';

    document.getElementById('tut-title').textContent = step.t;
    document.getElementById('tut-desc').textContent = step.d;
    document.getElementById('tut-step').textContent = 'Step ' + (i + 1) + ' of ' + steps.length;
    document.getElementById('tut-prev').disabled = (i === 0);
    document.getElementById('tut-next').textContent = (i === steps.length - 1) ? 'Finish' : 'Next';
    tip.style.display = 'block';

    positionTip(r);
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function positionTip(r) {
    var tw = tip.offsetWidth, th = tip.offsetHeight;
    var vw = window.innerWidth, vh = window.innerHeight;
    var arrow = document.getElementById('tut-arrow');
    arrow.style.display = 'block';
    arrow.className = '';

    var gap = 14;
    var cx = r.left + r.width / 2;
    var tx, ty, ax, ay;

    // prefer below
    if (r.bottom + gap + th + 20 < vh) {
      ty = r.bottom + gap;
      tx = Math.max(12, Math.min(cx - tw / 2, vw - tw - 12));
      arrow.className = 'up';
      ax = Math.max(tx + 16, Math.min(cx - 9, tx + tw - 34));
      ay = r.bottom + gap - 11;
    }
    // above
    else if (r.top - gap - th > 20) {
      ty = r.top - gap - th;
      tx = Math.max(12, Math.min(cx - tw / 2, vw - tw - 12));
      arrow.className = 'down';
      ax = Math.max(tx + 16, Math.min(cx - 9, tx + tw - 34));
      ay = r.top - gap;
    }
    // right
    else if (r.right + gap + tw + 12 < vw) {
      tx = r.right + gap;
      ty = Math.max(12, Math.min(r.top + r.height / 2 - th / 2, vh - th - 12));
      arrow.className = 'left';
      ax = r.right + gap - 11;
      ay = Math.max(ty + 10, Math.min(r.top + r.height / 2 - 9, ty + th - 28));
    }
    // left
    else {
      tx = Math.max(12, r.left - gap - tw);
      ty = Math.max(12, Math.min(r.top + r.height / 2 - th / 2, vh - th - 12));
      arrow.className = 'right';
      ax = r.left - gap;
      ay = Math.max(ty + 10, Math.min(r.top + r.height / 2 - 9, ty + th - 28));
    }

    tip.style.left = tx + 'px';
    tip.style.top = ty + 'px';
    arrow.style.left = ax + 'px';
    arrow.style.top = ay + 'px';
  }

  function next() {
    if (idx < steps.length - 1) show(idx + 1);
    else finish();
  }
  function prev() { if (idx > 0) show(idx - 1); }
  function skip() { finish(); }

  function finish() {
    localStorage.setItem(PREFIX + pageKey, '1');
    hide();
  }

  function hide() {
    isOn = false;
    if (spot) spot.style.display = 'none';
    if (tip) tip.style.display = 'none';
    var arr = document.getElementById('tut-arrow');
    if (arr) arr.style.display = 'none';
    document.removeEventListener('keydown', onKey);
  }

  function onKey(e) {
    if (!isOn) return;
    if (e.key === 'Escape') { e.preventDefault(); skip(); }
    else { e.preventDefault(); next(); }
  }

  function start(key, force) {
    pageKey = key;
    steps = STEPS[key];
    if (!steps || !steps.length) return;
    if (!force && localStorage.getItem(PREFIX + key)) return;
    isOn = true;
    createUI();
    document.addEventListener('keydown', onKey);
    show(0);
  }

  function restart() {
    if (!pageKey || !STEPS[pageKey]) return;
    isOn = true;
    steps = STEPS[pageKey];
    createUI();
    document.addEventListener('keydown', onKey);
    show(0);
    var helpModal = document.getElementById('helpModal');
    if (helpModal) helpModal.classList.remove('show');
    var helpOverlay = document.getElementById('helpOverlay');
    if (helpOverlay) helpOverlay.classList.remove('show');
    var helpFab = document.getElementById('helpFab');
    if (helpFab) helpFab.classList.remove('open');
  }

  function injectHelpBtn() {
    var body = document.querySelector('.help-modal-body');
    if (!body || body.querySelector('.tut-help-btn')) return;
    var key = getKey();
    if (!STEPS[key]) return;
    var btn = document.createElement('button');
    btn.className = 'tut-help-btn';
    btn.innerHTML = '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg> Restart Tutorial';
    btn.onclick = function(e) { e.preventDefault(); restart(); };
    body.insertBefore(btn, body.firstChild);
  }

  function getKey() {
    var path = window.location.pathname;
    var file = path.split('/').pop().replace('.html', '');
    if (!file || file === '' || file === 'index') return 'index';
    return file;
  }

  // Auto-init
  var reactPages = ['dashboard', 'experiment', 'curves', 'raw', 'repro', 'report_generator'];

  function autoInit() {
    var key = getKey();
    if (!STEPS[key]) return;
    pageKey = key;

    if (reactPages.indexOf(key) >= 0) {
      window.addEventListener('data-ready', function() {
        setTimeout(function() { start(key); }, 600);
      });
    } else {
      setTimeout(function() { start(key); }, 800);
    }
  }

  window.addEventListener('DOMContentLoaded', function() {
    setTimeout(injectHelpBtn, 500);
    autoInit();
  });

  window.addEventListener('resize', function() {
    if (isOn && steps[idx]) {
      var el = getEl(steps[idx]);
      if (el) {
        var r = el.getBoundingClientRect();
        var pad = 6;
        spot.style.left = (r.left - pad) + 'px';
        spot.style.top = (r.top - pad) + 'px';
        spot.style.width = (r.width + pad * 2) + 'px';
        spot.style.height = (r.height + pad * 2) + 'px';
        positionTip(r);
      }
    }
  });

  window.Tutorial = { start: start, restart: restart };
})();
