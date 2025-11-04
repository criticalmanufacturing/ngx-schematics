const { readdirSync, readFileSync } = require("fs");
const { join } = require("path");

function getRootDir() {
    return join(__dirname, '..');
}

function getRootPackageJson() {
    return JSON.parse(readFileSync(join(getRootDir(), 'package.json'), { encoding: 'utf8' }));
}

function getPackages() {
    const packagesDir = join(getRootDir(), 'packages');
    return readdirSync(packagesDir);
}

function getPackagesDir() {
    return join(getRootDir(), 'packages');
}

function getPackageInfo() {
    const rootPackJson = getRootPackageJson();
    const packages = getPackages();
    const packagesDir = getPackagesDir();
    
    return packages.map(pack => {
        const packJson = JSON.parse(readFileSync(join(packagesDir, pack, 'package.json'), { encoding: 'utf8' }));
        return { name: packJson.name, version: rootPackJson.version };
    });
}

function generateTag(version) {
    const versionDigits = version.replace(/[^0-9]/g, '');
    
    if (version.includes('-')) {
        const prefix = version.split('-')[1].replace(/[^a-zA-Z]/g, '');
        return `${prefix}-${versionDigits}`;
    } else {
        return `release-${versionDigits}`;
    }
}

module.exports = {
    getRootDir,
    getRootPackageJson,
    getPackages,
    getPackagesDir,
    getPackageInfo,
    generateTag
};
