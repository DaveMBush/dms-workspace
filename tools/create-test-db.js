#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const child = require('child_process');

// Usage: node tools/create-test-db.js <dest-path>
const dest = process.argv[2] || '../../test-database.db';
const destPath = path.resolve(process.cwd(), dest);
const dir = path.dirname(destPath);

try {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  // Remove existing file if any
  if (fs.existsSync(destPath)) {
    fs.unlinkSync(destPath);
  }

  // Ensure a blank file exists so Prisma can open it
  fs.writeFileSync(destPath, Buffer.from(''));
  console.log(`Created empty test database file at ${destPath}`);

  // Apply Prisma schema to the new SQLite file using Prisma CLI
  // This will push the schema (no migrations required) so the DB has the correct tables.
  const env = Object.assign({}, process.env, {
    DATABASE_URL: `file:${destPath}`
  });

  console.log('Applying Prisma schema to test database...');
  // Use npx so local workspace Prisma is used if available
  child.execSync('npx prisma db push --schema=prisma/schema.prisma', {
    stdio: 'inherit',
    env
  });

  console.log('Prisma schema applied successfully.');
  process.exit(0);
} catch (err) {
  console.error('Failed to create or prepare test database', err);
  process.exit(2);
}
