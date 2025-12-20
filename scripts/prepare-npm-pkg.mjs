import fs from 'node:fs';
import path from 'node:path';

const pkgPath = path.resolve('package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

// Replace workspace:* with current version
// IMPORTANT: We REMOVE workspace dependencies because they are local packages and not on npm.
// Next.js standalone mode already includes their code.
const fixDeps = (deps) => {
  if (!deps) return;
  for (const [name, value] of Object.entries(deps)) {
    if (value && value.toString().startsWith('workspace:')) {
      // Remove all workspace dependencies regardless of naming convention
      console.log(`Removing local workspace dependency: ${name}`);
      delete deps[name];
    }
  }
};

fixDeps(pkg.dependencies);
fixDeps(pkg.devDependencies);
fixDeps(pkg.optionalDependencies);

// Also remove fields that might interfere with npm install in CI
delete pkg.pnpm;
delete pkg.scripts;
delete pkg.devDependencies; // We only need prod deps in the final container

// IMPORTANT: Do NOT set type: module in the root package.json.
// Next.js standalone server.js is CommonJS.
// We will handle ESM selectively in subdirectories.
delete pkg.type;

fs.writeFileSync('package.json.npm', JSON.stringify(pkg, null, 2));
console.log('Generated package.json.npm with flattened workspace dependencies (CJS mode)');
