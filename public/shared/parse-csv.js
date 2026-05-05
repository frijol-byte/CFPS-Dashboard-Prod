function parseCSV(text){
  var lines=text.trim().split('\n');var hdr=lines[0].split(',').map(function(h){return h.trim().replace(/"/g,'').toUpperCase()});var rows=[];
  for(var i=1;i<lines.length;i++){var vals=lines[i].split(',');var r={};for(var j=0;j<hdr.length;j++)r[hdr[j]]=(vals[j]||'').trim().replace(/"/g,'');rows.push(r)}
  var all=rows.map(function(r){return{well:r.WELL||'',meas:parseFloat(r.MEASUREMENT)||0,rn:parseInt(r.ROW_NUMBER)||0,rl:r.ROW_LETTER||'',cn:parseInt(r.COLUMN_NUMBER)||0,key:r.KEY||'',lys:r.LYSATE||'',mm:r.MASTER_MIX||'',prod:r.PRODUCT||'',tmpl:r.TEMPLATE||'',op:r.OPERATOR||'',rv:parseFloat(r.REACTION_VOLUME)||0,dil:parseFloat(r.DILUTION)||0,eid:r.EXP_ID||'',tc:r.TEST_CONDITION||'',conc:parseFloat(r.FINAL_CONCENTRATION_WITH_DILUTION)||null,label:r.LABEL||'',vessel:r.VESSEL||'',stdConc:parseFloat(r.CONCENTRATION)||null,calcConc:parseFloat(r.CALCULATED_CONCENTRATION)||null}});
  var samples=all.filter(function(r){return r.conc!==null&&r.key.indexOf('Standard')<0&&r.key.indexOf('spike-in')<0});
  var std={};all.forEach(function(r){var isS=r.key.indexOf('Standard')>=0||r.label.indexOf('Standard')>=0;if(isS&&r.stdConc!=null&&isFinite(r.stdConc)){if(!std[r.eid])std[r.eid]=[];std[r.eid].push([r.stdConc,Math.round(r.meas)])}});
  var spk={};all.forEach(function(r){if(r.key.indexOf('spike-in')>=0&&r.meas>0){if(!spk[r.eid])spk[r.eid]=[];spk[r.eid].push({meas:Math.round(r.meas),dil:r.dil,conc:r.conc,calcConc:r.calcConc})}});
  var samplePts={};samples.forEach(function(r){if(!samplePts[r.eid])samplePts[r.eid]=[];samplePts[r.eid].push(r.meas)});
  var plate={};var eids2={};all.forEach(function(r){eids2[r.eid]=1});
  Object.keys(eids2).sort().forEach(function(e){plate[e]=all.filter(function(r){return r.eid===e}).map(function(r){var iS=r.key.indexOf('Standard')>=0||r.label.indexOf('Standard')>=0;return r.rn+','+r.cn+','+Math.round(r.meas)+(iS?',1':'')}).join(';')});
  var meta={};var sE={};samples.forEach(function(r){sE[r.eid]=1});
  Object.keys(sE).sort().forEach(function(e){var sub=samples.filter(function(r){return r.eid===e});var ops={},lys={},tms={},vols={};sub.forEach(function(r){if(r.op)ops[r.op]=1;if(r.lys)lys[r.lys]=1;if(r.tmpl)tms[r.tmpl]=1;if(r.rv)vols[r.rv]=1});meta[e]={o:Object.keys(ops),l:Object.keys(lys),t:Object.keys(tms),v:Object.keys(vols).map(Number).sort(function(a,b){return a-b}),n:sub.length}});
  return{samples:samples,std:std,spk:spk,samplePts:samplePts,plate:plate,meta:meta}
}
loadData().then(function(c){
  if(c){window.__CSV=c.csv;window.PARSED=parseCSV(window.__CSV);window.dispatchEvent(new CustomEvent('data-ready'))}
  else{window.location.href='load.html'}
});
