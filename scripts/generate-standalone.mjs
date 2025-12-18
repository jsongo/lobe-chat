#!/usr/bin/env node
/**
 * Manually generate Next.js standalone output
 *
 * This script is used when Next.js build fails at the finalization stage
 * but all the necessary build artifacts are already generated
 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const NEXT_DIR = join(ROOT, '.next');
const STANDALONE_DIR = join(NEXT_DIR, 'standalone');

console.log('🔧 Manually generating standalone output...\n');

// Check if NFT files exist
const nftFile = join(NEXT_DIR, 'next-server.js.nft.json');
if (!existsSync(nftFile)) {
  console.error('❌ next-server.js.nft.json not found - build did not complete enough');
  process.exit(1);
}

console.log('✓ Found NFT file');

// Create standalone directory
if (!existsSync(STANDALONE_DIR)) {
  mkdirSync(STANDALONE_DIR, { recursive: true });
  console.log('✓ Created standalone directory');
}

// Read NFT file to get list of required files
const nft = JSON.parse(readFileSync(nftFile, 'utf8'));
console.log(`✓ Found ${nft.files.length} files to copy\n`);

// Copy required files
console.log('📦 Copying required files...');
let copiedCount = 0;

for (const file of nft.files) {
  const sourcePath = join(ROOT, file);
  const destPath = join(STANDALONE_DIR, file);

  if (existsSync(sourcePath)) {
    const destDir = dirname(destPath);
    if (!existsSync(destDir)) {
      mkdirSync(destDir, { recursive: true });
    }

    try {
      copyFileSync(sourcePath, destPath);
      copiedCount++;
      if (copiedCount % 100 === 0) {
        process.stdout.write(`\r   Copied ${copiedCount}/${nft.files.length} files...`);
      }
    } catch {
      // Skip files that can't be copied (like symlinks)
    }
  }
}

console.log(`\r   Copied ${copiedCount}/${nft.files.length} files ✓\n`);

// Copy .next directory
console.log('📦 Copying .next directory...');
const standaloneNextDir = join(STANDALONE_DIR, '.next');
if (!existsSync(standaloneNextDir)) {
  mkdirSync(standaloneNextDir, { recursive: true });
}

// Copy essential .next files and directories
const essentialPaths = [
  'BUILD_ID',
  'routes-manifest.json',
  'prerender-manifest.json',
  'required-server-files.json',
  'server',
  'static',
];

for (const path of essentialPaths) {
  const source = join(NEXT_DIR, path);
  const dest = join(standaloneNextDir, path);

  if (existsSync(source)) {
    if (statSync(source).isDirectory()) {
      copyDirRecursive(source, dest);
    } else {
      copyFileSync(source, dest);
    }
  }
}

console.log('✓ Copied .next directory\n');

// Create server.js entry point
console.log('📝 Creating server.js entry point...');

// Read next config from required-server-files.json
const requiredServerFiles = JSON.parse(
  readFileSync(join(NEXT_DIR, 'required-server-files.json'), 'utf8'),
);
const nextConfigJson = JSON.stringify(requiredServerFiles.config, null, 2);

const serverJs = join(STANDALONE_DIR, 'server.js');
writeFileSync(
  serverJs,
  `// Next.js Standalone Server
process.env.NODE_ENV = 'production';
process.chdir(__dirname);
const NextServer = require('next/dist/server/next-server').default;
const http = require('http');
const path = require('path');

const nextConfig = ${nextConfigJson};

const server = new NextServer({
  hostname: process.env.HOSTNAME || '0.0.0.0',
  port: parseInt(process.env.PORT, 10) || 3000,
  dir: path.join(__dirname),
  dev: false,
  customServer: false,
  conf: nextConfig,
});

const requestHandler = server.getRequestHandler();

server.prepare().then(() => {
  http.createServer(async (req, res) => {
    try {
      await requestHandler(req, res);
    } catch (err) {
      console.error('Error handling request:', err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  }).listen(parseInt(process.env.PORT, 10) || 3000, process.env.HOSTNAME || '0.0.0.0', () => {
    console.log(\`> Ready on http://\${process.env.HOSTNAME || '0.0.0.0'}:\${process.env.PORT || 3000}\`);
  });
});
`,
);

console.log('✓ Created server.js\n');

console.log('✅ Standalone output generated successfully!\n');
console.log('   Location:', STANDALONE_DIR);

/**
 * Recursively copy directory
 */
function copyDirRecursive(src, dest) {
  if (!existsSync(dest)) {
    mkdirSync(dest, { recursive: true });
  }

  const entries = readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      try {
        copyFileSync(srcPath, destPath);
      } catch {
        // Skip files that can't be copied
      }
    }
  }
}
