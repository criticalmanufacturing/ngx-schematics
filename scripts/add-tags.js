// @ts-check
const concurrently = require('concurrently').default;
const { argv } = require('process');
const { getRootPackageJson, getPackageInfo, generateTag } = require('./utils');

const args = argv.slice(2);
const dryRun = args.includes('--dry-run');
const tags = args.filter((arg) => arg !== '--dry-run');

const rootPackJson = getRootPackageJson();
const packsInfo = getPackageInfo();

// Auto-generate tag if none provided
if (tags.length === 0) {
  try {
    tags.push(generateTag(rootPackJson.version));
  } catch (error) {
    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(error);
    }
    process.exit(1);
  }
}

(async () => {
  for (const tag of tags) {
    if (dryRun) {
      for (const { name, version } of packsInfo) {
        console.log(`[DRY RUN] Would add tag: npm dist-tag add ${name}@${version} ${tag}`);
      }
    } else {
      const tagCmds = packsInfo.map(
        ({ name, version }) =>
          `npm dist-tag add ${name}@${version} ${tag} --registry https://registry.npmjs.org/`
      );

      console.log(`Adding tag '${tag}':`);
      tagCmds.forEach((cmd) => console.log(`  ${cmd}`));

      await concurrently(tagCmds, { raw: true }).result;
    }
  }
})();
