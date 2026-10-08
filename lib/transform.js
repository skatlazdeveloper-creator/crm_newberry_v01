export const specs={
 agent_report:{key:['period_start','period_end','agent_name'], fields:['period_start','period_end','agent_name','assigned_conversations','avg_first_response','avg_resolution','avg_customer_wait','resolution_count']},
 label_report:{key:['period_start','period_end','label_name'], fields:['period_start','period_end','label_name','conversation_count','avg_first_response','avg_resolution','avg_response','resolution_count']},
 conversation_traffic:{key:['traffic_date','hour_of_day'], fields:['traffic_date','hour_of_day','conversation_count','timezone_name']},
 resolution_heatmap:{key:['resolution_date','hour_of_day'], fields:['resolution_date','hour_of_day','resolution_count']}
};
export function validateRow(type,row){
 const spec=specs[type];
 if (!spec||!row||typeof row!=='object'||Array.isArray(row)) throw Error('Tipo de tabela ou linha invalida');
 for(const k of spec.key) if(row[k]===undefined||row[k]===null||row[k]==='') throw Error(`Campo obrigatorio: ${k}`);
 for(const [k,v] of Object.entries(row)) {
  if(!spec.fields.includes(k)) throw Error(`Coluna nao permitida: ${k}`);
  if(['assigned_conversations','conversation_count','resolution_count','hour_of_day'].includes(k) && v!=null && (!Number.isInteger(v)||v<0||(k==='hour_of_day'&&v>23))) throw Error(`Inteiro invalido: ${k}`);
  if((k.endsWith('_date')||k.startsWith('period_'))&& !/^\d{4}-\d{2}-\d{2}$/.test(String(v))) throw Error(`Data invalida: ${k}`);
 }
 return row;
}
export function eventFacts(payload) {
 if(!payload||typeof payload!=='object') return null;
 const event=String(payload.event||'');
 const c=payload.conversation||payload;
 const id=c.id??payload.conversation_id;
 const accountId=payload.account?.id??c.account_id??payload.account_id;
 if(!id||!accountId) return null;
 const created=event==='conversation_created';
 const resolved=(event==='conversation_status_changed'||event==='conversation_updated') && (c.status==='resolved'||payload.status==='resolved');
 if(!created&&!resolved) return null;
 const source=created?(c.created_at??payload.created_at):(c.resolved_at??payload.created_at);
 const d=typeof source==='number'?new Date(source*1000):new Date(source||Date.now());
 if(Number.isNaN(d.getTime())) throw Error('Timestamp invalido');
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(d);
 const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));
 return { event, accountId:String(accountId), conversationId:String(id), kind:created?'created':'resolved', day:`${p.year}-${p.month}-${p.day}`, hour:Number(p.hour) };
}
