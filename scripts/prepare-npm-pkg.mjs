import fs from 'node:fs';
import path from 'node:path';

const pkgPath = path.resolve('package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

// Replace workspace:* with current version
const version = pkg.version;
const fixDeps = (deps) => {
  if (!deps) return;
  for (const [name, value] of Object.entries(deps)) {
    if (value === 'workspace:*') {
      deps[name] = version;
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
