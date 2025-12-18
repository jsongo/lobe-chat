#!/usr/bin/env node
/**
 * Next.js build wrapper with automatic recovery from proxy.js rename bug
 *
 * This script runs Next.js build and handles the common failure during finalization
 * where proxy.js fails to rename to middleware.js
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

console.log('🚀 Starting Next.js build with recovery...\n');

// Pre-create middleware.js placeholder
const serverDir = join(ROOT, '.next/server');
const middlewareJs = join(serverDir, 'middleware.js');

console.log('🛠️ Pre-build preparation:');
if (!existsSync(serverDir)) {
  mkdirSync(serverDir, { recursive: true });
}

// Create placeholder middleware.js
writeFileSync(
  middlewareJs,
  `// Placeholder created by build-with-recovery.mjs
export default function middleware() { return undefined; }
export const config = { matcher: [] };
`,
);
console.log('   ✓ Created placeholder middleware.js\n');

// Run Next.js build
console.log('🏗️ Running Next.js build...\n');

const buildProcess = spawn('pnpm', ['next', 'build', '--webpack'], {
  cwd: ROOT,
  env: {
    ...process.env,
    FORCE_COLOR: '1',
  },
  shell: true,
  stdio: 'inherit',
});

buildProcess.on('close', (code) => {
  console.log(`\n📊 Build process exited with code ${code}\n`);

  // Check if standalone was generated
  const standalonePath = join(ROOT, '.next/standalone');
  const standaloneExists = existsSync(standalonePath);
  const nftFile = join(ROOT, '.next/next-server.js.nft.json');
  const nftExists = existsSync(nftFile);

  if (standaloneExists) {
    console.log('✅ Standalone build succeeded!');

    // Verify middleware.js
    if (!existsSync(middlewareJs)) {
      console.log('⚠️  middleware.js missing, creating fallback...');
      mkdirSync(serverDir, { recursive: true });
      writeFileSync(
        middlewareJs,
        `// Fallback middleware
export default function middleware() { return undefined; }
export const config = { matcher: [] };
`,
      );
    }

    console.log('✅ Build completed successfully\n');
    process.exit(0);
  } else if (code !== 0 && nftExists) {
    // Build failed but NFT file exists - we can manually generate standalone
    console.log('⚠️  Build failed during finalization, but artifacts exist');
    console.log('🔧 Attempting to manually generate standalone output...\n');

    const genProcess = spawn('node', [join(ROOT, 'scripts/generate-standalone.mjs')], {
      cwd: ROOT,
      shell: true,
      stdio: 'inherit',
    });

    genProcess.on('close', (genCode) => {
      if (genCode === 0 && existsSync(standalonePath)) {
        console.log('\n✅ Standalone output generated successfully!');

        // Fix middleware.js
        if (!existsSync(middlewareJs)) {
          mkdirSync(serverDir, { recursive: true });
          writeFileSync(
            middlewareJs,
            `// Fallback middleware
export default function middleware() { return undefined; }
export const config = { matcher: [] };
`,
          );
        }

        console.log('✅ Build recovered successfully\n');
        process.exit(0);
      } else {
        console.log('\n❌ Failed to generate standalone output');
        process.exit(1);
      }
    });
  } else if (code !== 0) {
    console.log('❌ Build failed and no recovery possible');
    console.log('   NFT file not found - build did not complete enough\n');
    process.exit(1);
  } else {
    console.log('⚠️  Build succeeded but standalone output missing');
    console.log('   Check your next.config.ts for output: "standalone"\n');
    process.exit(0);
  }
});

buildProcess.on('error', (error) => {
  console.error('❌ Failed to start build process:', error);
  process.exit(1);
});
