import {createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
const COOKIE='brookwood-maze-host';
export const HOST_SESSION_MS=12*60*60*1000;
const secret=()=>String(process.env.HOST_KEY||'1031');
const sign=value=>createHmac('sha256',secret()).update('brookwood-chapter6-host:'+value).digest('base64url');
export function issueHostSession(req,res,now=Date.now()){
 const payload=Buffer.from(JSON.stringify({expires:now+HOST_SESSION_MS,nonce:randomBytes(24).toString('hex')})).toString('base64url');
 const secure=process.env.VERCEL||req.headers?.['x-forwarded-proto']==='https';
 res.setHeader('Set-Cookie',`${COOKIE}=${payload}.${sign(payload)}; Path=/api/host; HttpOnly; SameSite=Strict; Max-Age=${HOST_SESSION_MS/1000}${secure?'; Secure':''}`);
}
export function validHostSession(req,now=Date.now()){
 try{
  // Strict cookies plus same-origin JSON requests prevent cross-site actions.
  const origin=req.headers?.origin,host=req.headers?.['x-forwarded-host']||req.headers?.host;
  if(origin&&(!host||new URL(origin).host!==host))return false;
  const cookies=String(req.headers?.cookie||'').split(';').map(x=>x.trim());
  const value=cookies.find(x=>x.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);
  if(!value||value.length>1024)return false;
  const [payload,signature,...extra]=value.split('.');if(extra.length||!signature)return false;
  const actual=Buffer.from(signature,'base64url'),expected=Buffer.from(sign(payload),'base64url');
  if(actual.length!==expected.length||!timingSafeEqual(actual,expected))return false;
  const data=JSON.parse(Buffer.from(payload,'base64url').toString());
  return Number.isFinite(data.expires)&&data.expires>now&&data.expires<=now+HOST_SESSION_MS&&typeof data.nonce==='string'&&data.nonce.length===48;
 }catch{return false;}
}
