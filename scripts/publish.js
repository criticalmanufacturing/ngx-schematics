// @ts-check
const concurrently = require('concurrently').default;
const { readFileSync, writeFileSync } = require('fs');
const { join } = require('path');
const { argv } = require('process');
const { getRootPackageJson, getPackages, getPackagesDir, generateTag } = require('./utils');

const args = argv.slice(2);
const dryRun = args.includes('--dry-run');
const tagIndex = args.indexOf('--tag');
const tagOverride = tagIndex !== -1 ? args[tagIndex + 1] : null;

const rootPackJson = getRootPackageJson();
const packages = getPackages();
const packagesDir = getPackagesDir();
const angularVersion = rootPackJson.dependencies['@schematics/angular'].replace(
  /^(.\d+)\.\d+\.\d+/,
  '$1.0.0'
);
packages.forEach((pack) => {
  const packJson = JSON.parse(
    readFileSync(join(packagesDir, pack, 'package.json'), { encoding: 'utf8' })
  );

  packJson.version = rootPackJson.version;
  packJson.peerDependencies ??= {};
  packJson.peerDependencies = { '@angular/cli': angularVersion, ...packJson.peerDependencies };

  delete packJson.scripts;

  Object.keys(packJson.dependencies).forEach((dep) => {
    if (packages.some((pack) => dep === '@criticalmanufacturing/' + pack)) {
      packJson.dependencies[dep] = rootPackJson.version;
      return;
    }

    if (!rootPackJson.dependencies[dep]) {
      throw new Error('Unable to get root dependency ' + dep);
    }

    packJson.dependencies[dep] = rootPackJson.dependencies[dep];
  });

  writeFileSync(join(packagesDir, pack, 'package.json'), JSON.stringify(packJson, null, 2));
});

(async () => {
  // Derive npm dist-tag: use CLI override, then auto-detect from pre-release version
  const version = rootPackJson.version;
  const isPrerelease = version.includes('-');
  const resolvedTag = tagOverride ?? (isPrerelease ? generateTag(version) : null);
  const tagArg = resolvedTag ? ` --tag ${resolvedTag}` : '';

  // Publish packages
  const publishCmd = packages.map(
    (pack) =>
      `npm publish ${join(packagesDir, pack)}${tagArg} --registry https://registry.npmjs.org/${dryRun ? ' --dry-run' : ''}`
  );

  if (dryRun) {
    console.log('[DRY RUN] Would publish packages');
  }

  console.log('Running publish commands:');
  publishCmd.forEach((cmd) => console.log(`  ${cmd}`));

  await concurrently(publishCmd, { raw: true }).result;
})();
