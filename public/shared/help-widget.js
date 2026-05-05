function toggleHelp(){
  var f=document.getElementById('helpFab'),
      o=document.getElementById('helpOverlay'),
      m=document.getElementById('helpModal');
  if(!m)return;
  var v=m.classList.contains('show');
  if(v){m.classList.remove('show');o.classList.remove('show');f.classList.remove('open');}
  else{m.classList.add('show');o.classList.add('show');f.classList.add('open');}
}
document.addEventListener('keydown',function(e){
  if(e.key==='Escape'){
    var m=document.getElementById('helpModal');
    if(m&&m.classList.contains('show')) toggleHelp();
  }
});
