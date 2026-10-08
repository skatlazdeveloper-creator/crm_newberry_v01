import {db,schema} from '../lib/db.js';
export default async function handler(req,res){
 if(req.method!=='GET')return res.status(405).json({error:'Use GET'});
 try{await db().query(`SELECT 1 FROM ${schema()}.agent_report LIMIT 1`);return res.status(200).json({ok:true,database:'connected'});}
 catch(e){console.error(e);return res.status(503).json({ok:false,database:'unavailable'});}
}
