import fs from 'node:fs';
import path from 'node:path';

const pkgPath = path.resolve('package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

// Replace workspace:* with current version
// IMPORTANT: We REMOVE @lobechat/* workspace dependencies because they are not on npm.
// Next.js standalone mode already includes their code.
const fixDeps = (deps) => {
  if (!deps) return;
  for (const [name, value] of Object.entries(deps)) {
    if (value.startsWith('workspace:')) {
      if (name.startsWith('@lobechat/') || name.startsWith('@lobehub/')) {
        // Check if it's one of our local packages
        console.log(`Removing local workspace dependency: ${name}`);
        delete deps[name];
      } else {
        // Fallback for other workspace deps if any
        deps[name] = pkg.version;
      }
    }
  }
};

fixDeps(pkg.dependencies);
fixDeps(pkg.devDependencies);
fixDeps(pkg.optionalDependencies);

// Also remove pnpm specific config that might annoy npm
delete pkg.pnpm;

fs.writeFileSync('package.json.npm', JSON.stringify(pkg, null, 2));
console.log('Generated package.json.npm with flattened workspace dependencies');
