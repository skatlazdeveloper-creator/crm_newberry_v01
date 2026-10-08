import {db,schema} from '../lib/db.js';
import {authorizedImport} from '../lib/security.js';
import {specs,validateRow} from '../lib/transform.js';
export default async function handler(req,res){
 if(req.method!=='POST')return res.status(405).json({error:'Use POST'});
 if(!authorizedImport(req))return res.status(401).json({error:'Token invalido'});
 try{
  const body=typeof req.body==='string'?JSON.parse(req.body):req.body;
  if(!body||typeof body!=='object')return res.status(400).json({error:'JSON necessario'});
  const s=schema(); const client=await db().connect();const counts={};
  try{
   await client.query('BEGIN');
   for(const [type,rows] of Object.entries(body)){
    if(!specs[type]||!Array.isArray(rows)||rows.length>1000)throw Error('Tabela invalida ou limite de 1000 linhas ultrapassado');
    const spec=specs[type]; counts[type]=0;
    for(const data of rows){
     const row=validateRow(type,data);const columns=spec.fields.filter(c=>Object.hasOwn(row,c));
     const identifiers=columns.map(c=>`"${c}"`).join(',');
     const placeholders=columns.map((_,i)=>`$${i+1}`).join(',');
     const updates=columns.filter(c=>!spec.key.includes(c)).map(c=>`"${c}"=EXCLUDED."${c}"`).concat(['updated_at=now()']);
     await client.query(`INSERT INTO ${s}."${type}" (${identifiers}) VALUES (${placeholders}) ON CONFLICT (${spec.key.map(c=>`"${c}"`).join(',')}) DO UPDATE SET ${updates.join(',')}`,columns.map(c=>row[c]));counts[type]++;
    }
   }
   await client.query('COMMIT');return res.status(200).json({ok:true,imported:counts});
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
 }catch(e){console.error('import error',e.message);return res.status(400).json({error:e.message});}
}
