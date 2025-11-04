# **Critical Manufacturing Schematics Repository**

**Critical Manufacturing Schematics** are meant to be a quick and easy way of getting started with CMF IoT Tasks and UI Customization projects, by providing a basic structure for the project and all the recommended tooling.

## **Schematics Packages**

- [**IoT Schematics**](./packages/ngx-iot-schematics/README.md) - Schematics for getting started with IoT Tasks Projects.

- [**UI Schematics**](./packages/ngx-schematics/README.md) - Schematics for getting started with UI Customization Projects.

## **Getting Started**

1. Clone this repository into your repository root.

2. Run:

```
npm install
```

## **Testing**

To test locally, install `@criticalmanufacturing/ngx-iot-schematics` globally and use the `schematics` command line tool. That tool acts the same as the `generate` command of the Angular CLI, but also has a debug mode.

Check the documentation with

```bash
schematics --help
```

## **Unit Testing**

`npm run test` will run the unit tests, using Jasmine as a runner and test framework.

## **Publishing**

1. Update the root package.json version
2. Build the packages:
   ```bash
   npm run build
   ```
3. Publish:
   ```bash
   node ./scripts/publish.js [tag1] [tag2] [...] [--dry-run]
   ```

**Options:**
- Tags are optional - if omitted, a tag is auto-generated based on version format
- Use `--dry-run` to test without actually publishing

**Examples:**
```bash
node ./scripts/publish.js                    # Auto-generate tag from version
node ./scripts/publish.js latest             # Publish with 'latest' tag
node ./scripts/publish.js beta-100 latest    # Multiple tags
node ./scripts/publish.js --dry-run          # Test run
```

**Note:** When publishing via GitHub Actions workflow, a GitHub release is automatically created for final versions (e.g., `1.0.0`), but not for pre-release versions (e.g., `1.0.0-beta`).
