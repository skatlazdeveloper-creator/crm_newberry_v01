import {createHash} from 'node:crypto';
import {db,schema} from '../lib/db.js';
import {authorizedWebhook} from '../lib/security.js';
import {eventFacts} from '../lib/transform.js';
async function rawBody(req){
 if(Buffer.isBuffer(req.rawBody)) return req.rawBody;
 if(Buffer.isBuffer(req.body)) return req.body;
 if(typeof req.body==='string') return Buffer.from(req.body);
 if(req.body&&typeof req.body==='object') return null; // never reconstruct JSON for signature
 const chunks=[];for await(const chunk of req) chunks.push(Buffer.from(chunk));return Buffer.concat(chunks);
}
export default async function handler(req,res){
 if(req.method!=='POST') return res.status(405).json({error:'Use POST'});
 try{
  const raw=await rawBody(req);
  if(!authorizedWebhook(req,raw)) return res.status(401).json({error:'Webhook nao autorizado. Configure assinatura HMAC ou WEBHOOK_TOKEN na URL.'});
  const payload=req.body&&typeof req.body==='object'?req.body:JSON.parse(raw?.toString('utf8')||'{}');
  const f=eventFacts(payload);
  if(!f) return res.status(202).json({ok:true,ignored:true,reason:'Evento sem metrica mapeavel'});
  const s=schema(), client=await db().connect();
  try{
   await client.query('BEGIN');
   // One count per account/conversation/kind prevents retries and double counting.
   const eventKey=`${f.accountId}:${f.conversationId}:${f.kind}`;
   const hash=createHash('sha256').update(eventKey).digest('hex');
   const added=await client.query(`INSERT INTO ${s}.chatwoot_ingested_events (event_key,kind,payload_event) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING RETURNING event_key`,[hash,f.kind,f.event]);
   if(added.rowCount){
    if(f.kind==='created') await client.query(`INSERT INTO ${s}.conversation_traffic (traffic_date,hour_of_day,conversation_count) VALUES ($1,$2,1) ON CONFLICT (traffic_date,hour_of_day) DO UPDATE SET conversation_count=${s}.conversation_traffic.conversation_count+1,updated_at=now()`,[f.day,f.hour]);
    else await client.query(`INSERT INTO ${s}.resolution_heatmap (resolution_date,hour_of_day,resolution_count) VALUES ($1,$2,1) ON CONFLICT (resolution_date,hour_of_day) DO UPDATE SET resolution_count=${s}.resolution_heatmap.resolution_count+1,updated_at=now()`,[f.day,f.hour]);
   }
   await client.query('COMMIT');
   return res.status(200).json({ok:true,processed:!!added.rowCount,kind:f.kind});
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
 }catch(e){console.error('webhook error',e);return res.status(e instanceof SyntaxError?400:500).json({error:e instanceof SyntaxError?'JSON invalido':'Falha ao processar evento'});}
}
