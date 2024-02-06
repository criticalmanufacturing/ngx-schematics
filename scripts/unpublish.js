const concurrently = require("concurrently");
const { readdirSync, readFileSync, writeFileSync } = require("fs");
const { join } = require("path");
const { argv } = require("process");

const version = argv[2];

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
    // publish package as latest
    await concurrently(packsInfo.map(pack => `npm unpublish ${pack.name}@${version}`), { raw: true }).result;
})();
