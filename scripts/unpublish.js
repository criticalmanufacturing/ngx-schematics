const concurrently = require("concurrently");
const { readdirSync, readFileSync, writeFileSync } = require("fs");
const { join } = require("path");
const { argv } = require("process");

const args = argv.slice(2);
const dryRun = args.includes('--dry-run');
const version = args.find(arg => arg !== '--dry-run');

if (!version) {
    console.error('Error: Missing version argument.');
    process.exit(1);
}

const rootDir = join(__dirname, '..');
const packagesDir = join(rootDir, 'packages');
const packages = readdirSync(packagesDir);
const packsInfo = [];

packages.forEach(pack => {
    const packJson = JSON.parse(readFileSync(join(packagesDir, pack, 'package.json'), { encoding: 'utf8' }));
    packsInfo.push({ name: packJson.name });
});

(async () => {
    const unpublishCmds = packsInfo.map(pack => `npm unpublish ${pack.name}@${version}`);
    
    if (dryRun) {
        console.log('[DRY RUN] Would run unpublish commands:');
        unpublishCmds.forEach(cmd => console.log(`  ${cmd}`));
    } else {
        console.log('Running unpublish commands:');
        unpublishCmds.forEach(cmd => console.log(`  ${cmd}`));
        await concurrently(unpublishCmds, { raw: true }).result;
    }
})();
