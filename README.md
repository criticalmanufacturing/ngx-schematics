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

To publish, simply do:

Update the root package.json version:

Run the following:

```bash
npm run build
node ./scripts/publish.js [tag]
```
