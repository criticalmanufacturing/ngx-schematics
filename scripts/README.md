## publish.js

Publishes all packages in the monorepo with the version from root package.json.

**Usage:**
```bash
node ./scripts/publish.js [--dry-run]
```

**Options:**
- `--dry-run` - Simulate publish without actually publishing

**Examples:**
```bash
node ./scripts/publish.js              # Publish packages
node ./scripts/publish.js --dry-run    # Test without publishing
```

**Note:** This script only publishes packages. Use `add-tags.js` to add NPM dist-tags.

## add-tags.js

Adds NPM dist-tags to all packages in the monorepo.

**Usage:**
```bash
node ./scripts/add-tags.js [tag1] [tag2] [...] [--dry-run]
```

**Options:**
- `tag1, tag2, ...` - NPM dist-tags to add (optional, auto-generates if omitted)
- `--dry-run` - Simulate adding tags without actually adding them

**Auto-tag generation:**

When no tags are provided, a tag is automatically generated based on the version format:

- **Release versions** (no dash): Uses `release-` prefix followed by version digits
  - `1.0.0` → `release-100`
  - `11.2.3` → `release-1123`
  
- **Pre-release versions** (with dash): Extracts the pre-release identifier and uses it as prefix
  - `1.0.0-beta` → `beta-100`
  - `11.2.1-alpha` → `alpha-1121`
  - `2.5.0-rc.1` → `rc-250`
  - `1.0.0-Beta.1` → `Beta-100`

The tag format is: `{prefix}-{versionDigits}` where:
- `prefix`: Pre-release identifier (letters only) or "release" for stable versions
- `versionDigits`: All digits from the base version (before the dash)

**Examples:**
```bash
node ./scripts/add-tags.js                    # Auto-generate tag
node ./scripts/add-tags.js latest             # Add 'latest' tag
node ./scripts/add-tags.js latest beta-100    # Add multiple tags
node ./scripts/add-tags.js --dry-run          # Test without adding tags
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
