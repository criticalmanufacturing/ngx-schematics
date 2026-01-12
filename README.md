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

`npm run test` will run the unit tests, using Vitest as a runner and test framework.

## **Publishing**

1. Update the root package.json version
2. Build the packages:
   ```bash
   npm run build
   ```
3. Publish:
   ```bash
   npm run publish [-- --dry-run]
   ```
4. Add tags (optional):
   ```bash
   npm run add-tags [-- tag1 tag2 ...] [-- --dry-run]
   ```

**Examples:**

```bash
npm run publish                           # Publish packages
npm run publish -- --dry-run              # Test without publishing
npm run add-tags                          # Add auto-generated tag
npm run add-tags -- latest                # Add 'latest' tag
npm run add-tags -- latest beta-100       # Add multiple tags
```

**Note:** When publishing via GitHub Actions workflow, a GitHub release is automatically created for final versions (e.g., `1.0.0`), but not for pre-release versions (e.g., `1.0.0-beta`).
