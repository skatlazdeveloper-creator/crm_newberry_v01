import pg from 'pg';
let pool;
export function schema() {
 const s=process.env.DB_SCHEMA||'core';
 if (!/^[a-z_][a-z0-9_]*$/.test(s)) throw new Error('DB_SCHEMA invalido');
 return `"${s}"`;
}
export function db() {
 if(!process.env.DATABASE_URL) throw new Error('DATABASE_URL nao configurada');
 if(!pool) pool=new pg.Pool({connectionString:process.env.DATABASE_URL, max:2, idleTimeoutMillis:10000, connectionTimeoutMillis:10000, ssl:process.env.PGSSL_DISABLE==='true'?false:{rejectUnauthorized:true}});
 return pool;
}
