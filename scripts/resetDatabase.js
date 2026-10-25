import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { connectDB } from '../config/db.js';

dotenv.config();

const KEEP = new Set(['planprices']);

const run = async () => {
  if (!process.argv.includes('--yes')) {
    console.error('This deletes every user, workspace, QR code, scan and payment. Re-run with --yes to confirm.');
    process.exit(1);
  }

  await connectDB();
  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();

  const backupDir = path.join(process.cwd(), 'backups', new Date().toISOString().replace(/[:.]/g, '-'));
  fs.mkdirSync(backupDir, { recursive: true });

  for (const { name } of collections) {
    if (name.startsWith('system.')) continue;

    const docs = await db.collection(name).find({}).toArray();
    fs.writeFileSync(path.join(backupDir, `${name}.json`), JSON.stringify(docs));

    if (KEEP.has(name)) {
      console.log(`kept     ${name} (${docs.length})`);
      continue;
    }

    await db.collection(name).drop();
    console.log(`dropped  ${name} (${docs.length}, backed up)`);
  }

  console.log(`\nBackup written to ${backupDir}`);
  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error('Reset failed:', error);
  await mongoose.disconnect();
  process.exit(1);
});
