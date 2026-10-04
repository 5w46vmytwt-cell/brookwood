// Requests are never automatically retried: a failed response may follow a committed write.
async function lobbyRequest(url,body){
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),10000);
  try{
    const r=await fetch(url,{method:body===undefined?'GET':'POST',headers:body===undefined?{}:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),cache:'no-store',signal:controller.signal});
    let data;
    try{data=await r.json()}catch{throw new Error('Brookwood returned an invalid response. Please try again.')}
    if(!r.ok){const e=new Error(data.error||'Brookwood could not complete the request. Please try again.');e.status=r.status;throw e}
    return data;
  }catch(e){
    if(e.status)throw e;
    if(e.name==='AbortError')throw new Error('Brookwood took too long to respond. Check your connection and try again.');
    if(e instanceof TypeError)throw new Error('Could not connect to Brookwood. Check your connection and try again.');
    throw e;
  }finally{clearTimeout(timeout)}
}
