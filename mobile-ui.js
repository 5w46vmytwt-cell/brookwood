/* Presentation adapter only: observes existing DOM, never requests or mutates game state. */
(() => {
  const content=document.getElementById('mobileContent');
  if(!content)return;
  const node=id=>document.getElementById(id);
  const text=(element,value)=>{if(element.textContent!==value)element.textContent=value;};
  const attr=(element,key,value)=>{if(element.getAttribute(key)!==value)element.setAttribute(key,value);};
  const visible=element=>!element.hidden&&!element.classList.contains('hidden');
  for(const select of content.querySelectorAll('select')){
    const hint=document.createElement('p');hint.className='selection-hint';hint.id=select.id+'Hint';hint.hidden=true;
    const detail=document.createElement('p');detail.className='selection-detail';detail.id=select.id+'Detail';detail.hidden=true;
    select.after(hint,detail);select.setAttribute('aria-describedby',hint.id+' '+detail.id);
  }
  function refresh(){
    // Existing polling may write its network error into an inactive panel.
    const errors=[...content.querySelectorAll('.error')].map(e=>e.textContent).join(' ');
    const status=!navigator.onLine?'offline':/network|connect|timeout|timed out|reach|fetch|unavailable/i.test(errors)?'reconnecting':'online';
    attr(node('mobileConnection'),'data-state',status);
    text(node('mobileConnectionText'),status==='offline'?'Offline':status==='reconnecting'?'Reconnecting':'Online');
    const player=visible(node('joinBox'))?'':node('playerName').textContent;
    text(node('mobileIdentity'),player||'Your private game screen');
    text(node('mobilePartner'),'Room 1031');
    for(const panel of content.querySelectorAll('.panel')){
      if(!visible(panel))continue;
      const selects=[...panel.querySelectorAll('select')].filter(visible),buttons=[...panel.querySelectorAll('button')].filter(visible);
      const confirmed=/VOTE RECORDED|PHOTO COMPLETE|✓ YOU.RE IN|✓ READ/.test(panel.textContent);
      attr(panel,'data-ui-state',buttons.some(b=>b.disabled)?'pending':confirmed?'confirmed':selects.some(s=>s.value)?'selected':'idle');
    }
    for(const select of content.querySelectorAll('select')){
      const selected=Boolean(select.value),hint=node(select.id+'Hint');
      attr(select,'data-selected',String(selected));
      if(hint.hidden!==(!selected||!visible(select)))hint.hidden=!selected||!visible(select);
      text(hint,select.id==='partner'?'Selected · confirm below':'Selected · not submitted');
      const detail=node(select.id+'Detail'),label=select.selectedOptions[0]?.textContent||'',showDetail=selected&&visible(select)&&label.length>60;
      if(detail.hidden===showDetail)detail.hidden=!showDetail;
      text(detail,showDetail?label:'');
    }
  }
  // Coalesce existing renderer mutations; no extra polling or animation loop.
  let queued=false;
  const schedule=()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;refresh();});};
  const observer=new MutationObserver(schedule);
  observer.observe(content,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class','hidden','disabled']});
  content.addEventListener('change',refresh);window.addEventListener('online',refresh);window.addEventListener('offline',refresh);
  window.addEventListener('pagehide',()=>observer.disconnect(),{once:true});
  window.addEventListener('pageshow',()=>{observer.observe(content,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class','hidden','disabled']});refresh();});
  refresh();
})();
