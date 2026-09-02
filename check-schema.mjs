import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';

// Read DATABASE_URL from .env
const envContent = readFileSync('.env', 'utf-8');
const dbUrl = envContent.split('\n').find(l => l.startsWith('DATABASE_URL='))?.replace('DATABASE_URL=', '').trim();

const conn = await mysql.createConnection(dbUrl);
const [rows] = await conn.execute('DESCRIBE post_wrap_options');
console.log('post_wrap_options columns:', rows.map(r => r.Field).join(', '));
const [rows2] = await conn.execute('SHOW TABLES LIKE "post_wrap%"');
console.log('Tables:', rows2.map(r => Object.values(r)[0]).join(', '));
await conn.end();
