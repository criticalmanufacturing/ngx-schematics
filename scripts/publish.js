const concurrently = require("concurrently");
const { readdirSync, readFileSync, writeFileSync } = require("fs");
const { join } = require("path");
const { argv } = require("process");

const tag = argv[2];

if (!tag) {
    console.error('Error: Missing tag argument.');
    process.exit(1);
}

const rootDir = join(__dirname, '..');
const packagesDir = join(rootDir, 'packages');
const packages = readdirSync(packagesDir);
const rootPackJson = JSON.parse(readFileSync(join(rootDir, 'package.json'), { encoding: 'utf8' }));
const angularVersion = rootPackJson.dependencies['@schematics/angular'].replace(/^(.\d+)\.\d+\.\d+/, '$1.0.0');

packages.forEach(pack => {
    const packJson = JSON.parse(readFileSync(join(packagesDir, pack, 'package.json'), { encoding: 'utf8' }));

    packJson.version = rootPackJson.version;

    packJson.peerDependencies ??= {};
    packJson.peerDependencies = { "@angular/cli": angularVersion, ...packJson.peerDependencies }

    delete packJson.scripts;

    Object.keys(packJson.dependencies).forEach((dep) => {
        if (packages.some(pack => dep === '@criticalmanufacturing/' + pack)) {
            packJson.dependencies[dep] = rootPackJson.version;
            return;
        }

        if (!rootPackJson.dependencies[dep]) {
            throw new Error('Unable to get root dependency ', dep);
        }

        packJson.dependencies[dep] = rootPackJson.dependencies[dep];
    });

    writeFileSync(join(packagesDir, pack, 'package.json'), JSON.stringify(packJson, null, 2));
});

concurrently(packages.map(pack => `npm publish ${join(packagesDir, pack)} --tag ${tag}`), { raw: true });
