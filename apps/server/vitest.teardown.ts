import { unlinkSync } from 'fs';
import { globSync } from 'glob';

export default function teardown() {
  // Clean up test database files
  const dbFiles = globSync('test-database-*.db', { cwd: __dirname });
  dbFiles.forEach((file) => {
    try {
      unlinkSync(`${__dirname}/${file}`);
      console.log(`Cleaned up test database: ${file}`);
    } catch (error) {
      // Ignore errors if file doesn't exist
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.error(`Failed to clean up ${file}:`, error);
      }
    }
  });
}
