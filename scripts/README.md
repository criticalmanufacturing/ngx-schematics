## publish.js

Publishes all packages in the monorepo with the version from root package.json.

**Usage:**
```bash
node ./scripts/publish.js [tag1] [tag2] [...] [--dry-run]
```

**Options:**
- `tag1, tag2, ...` - NPM dist-tags to add (optional, auto-generates if omitted)
- `--dry-run` - Simulate publish without actually publishing

**Auto-tag generation:**
- Pre-release versions (e.g., `1.0.0-beta`): `beta-100`
- Release versions (e.g., `1.0.0`): `release-100`

**Examples:**
```bash
node ./scripts/publish.js                    # Auto-generate tag
node ./scripts/publish.js latest             # Publish with 'latest' tag
node ./scripts/publish.js beta-100 latest    # Multiple tags
node ./scripts/publish.js --dry-run          # Test without publishing
```

## unpublish.js

Unpublishes a specific version of all packages in the monorepo.

**Usage:**
```bash
node ./scripts/unpublish.js <version> [--dry-run]
```

**Options:**
- `--dry-run` - Simulate unpublish without actually unpublishing

**Examples:**
```bash
node ./scripts/unpublish.js 1.0.0              # Unpublish version
node ./scripts/unpublish.js 1.0.0 --dry-run    # Test without unpublishing
```
