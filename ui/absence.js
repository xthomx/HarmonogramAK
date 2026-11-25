// Przeciągnięcie wiadomości e-mail (lub zaznaczonego tekstu) na okno programu dodaje nieobecność do planu.
(function(){
const overlay=document.createElement('div');
overlay.id='drop-overlay';overlay.hidden=true;
overlay.innerHTML='<div><b>Upuść wiadomość o nieobecności</b><span>Program doda zadanie '+ABSENCE_TOPIC+' dla wskazanej osoby w podanym okresie.</span></div>';
document.body.appendChild(overlay);

const accepts=e=>{const t=e.dataTransfer&&e.dataTransfer.types;return !!t&&(['Files','text/plain','text/html'].some(x=>Array.from(t).includes(x)))};
let depth=0;
const hide=()=>{depth=0;overlay.hidden=true};

window.addEventListener('dragenter',e=>{if(!accepts(e))return;e.preventDefault();depth++;overlay.hidden=false});
window.addEventListener('dragover',e=>{if(!accepts(e))return;e.preventDefault();e.dataTransfer.dropEffect='copy'});
window.addEventListener('dragleave',e=>{if(!accepts(e))return;depth=Math.max(0,depth-1);if(!depth)overlay.hidden=true});
window.addEventListener('drop',e=>{
 if(!accepts(e))return;
 e.preventDefault();hide();
 handleDrop(e.dataTransfer).catch(err=>alert('Nie udało się odczytać wiadomości: '+(err&&err.message||err)));
});

async function fileTexts(file){
 const buffer=await file.arrayBuffer(),head=new Uint8Array(buffer,0,Math.min(8,buffer.byteLength));
 const isCfb=head.length===8&&head[0]===0xd0&&head[1]===0xcf&&head[2]===0x11&&head[3]===0xe0;
 if(isCfb)return msgTexts(buffer);
 const text=absenceDecode(new Uint8Array(buffer));
 return /^(received|from|mime-version|content-type|return-path|date|subject|message-id|x-[\w-]+):/im.test(text)?emlTexts(text).concat([text]):[text];
}

async function handleDrop(transfer){
 // Dane z przeciągania są dostępne tylko synchronicznie — odczyt tekstu i listy plików przed pierwszym await.
 const files=Array.from(transfer.files||[]),texts=['text/html','text/plain'].map(t=>transfer.getData(t)).filter(Boolean),problems=[];
 for(const file of files){
  try{texts.push(...await fileTexts(file))}
  catch(err){problems.push('Plik „'+file.name+'”: '+(err&&err.message||'nie udało się odczytać.'))}
 }
 const parsed=parseAbsences(texts);
 problems.push(...parsed.errors);
 if(!parsed.items.length){
  alert((problems.length?problems.join('\n')+'\n\n':'')+'W upuszczonej wiadomości nie znaleziono informacji o nieobecności.\n\nOczekiwane zdanie:\nDla pracownika Jan Nowak wprowadzono w okresie 2026-11-25 - 2026-11-27 nieobecność zwolnienie chorobowe.');
  return;
 }
 const result=applyAbsences(data,parsed.items,uid);
 problems.push(...result.problems);
 if(result.added.length){
  save();
  const line=a=>a.person+', '+a.start+' – '+a.end+' ('+a.note+')';
  toast((result.added.length===1?'Dodano nieobecność: '+line(result.added[0]):'Dodano nieobecności: '+result.added.length)+'. Kliknij 💾 Zapisz, aby zapisać plik');
 }
 const lines=[];
 if(result.skipped.length)lines.push('Pominięto (już istnieje): '+result.skipped.map(a=>a.person+' '+a.start+' – '+a.end).join('; '));
 if(problems.length)lines.push(...problems);
 if(lines.length)alert((result.added.length?'Dodano: '+result.added.length+'.\n\n':'Nic nie dodano.\n\n')+lines.join('\n'));
}
window.handleAbsenceDrop=handleDrop;
})();
