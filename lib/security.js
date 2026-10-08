import { createHmac, timingSafeEqual } from 'node:crypto';
export function same(a,b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const x=Buffer.from(a), y=Buffer.from(b);
  return x.length===y.length && timingSafeEqual(x,y);
}
export function authorizedWebhook(req,raw) {
  const secret=process.env.CHATWOOT_WEBHOOK_SECRET;
  const sig=req.headers['x-chatwoot-signature'];
  const ts=req.headers['x-chatwoot-timestamp'];
  if (secret && sig && ts && raw) {
    const n=Number(ts);
    if(!Number.isFinite(n) || Math.abs(Date.now()/1000-n)>300) return false;
    const computed='sha256='+createHmac('sha256',secret).update(Buffer.concat([Buffer.from(`${ts}.`),raw])).digest('hex');
    return same(sig,computed);
  }
  const token = new URL(req.url,'https://localhost').searchParams.get('token');
  return !!process.env.WEBHOOK_TOKEN && same(token,process.env.WEBHOOK_TOKEN);
}
export function authorizedImport(req) {
  return !!process.env.SYNC_TOKEN && same(req.headers['x-sync-token'],process.env.SYNC_TOKEN);
}
