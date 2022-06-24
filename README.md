**Critical Manufacturing Schematics Repository**
========= 

**Critical Manufacturing Schematics** is the base of any CMF MES HTML Graphical User Interface customization project. This repository is meant to be a quick and easy way of getting started with CMF MES GUI customization, by providing a basic structure for the project and all the recommended tooling.

## **Schematics**

- [ng-add](#ng-add)
- [converter](#converter)
- [data-source](#data-source)
- [entity-page](#entity-page)
- [execution-view](#execution-view)
- [library](#library)
- [package-info](#package-info)
- [widget](#widget)
- [wizard](#wizard)
- [wizard-create-edit](#wizard-create-edit)

## **Project Startup Commands**

---------

### **ng-add**

Update an application with HTML defaults.

#### **Arguments:** 

*No arguments available.*

#### **Options:** 

| Name             | Description                      | Value Type  | Default Value |
| ---------------- | -------------------------------- | ----------- | ------------- |
| `--project`      | The name of the project.         | `string`    |               |
| `--registry`     | The npm registry to use.         | `string`    |               |
| `--lint`         | Adds eslint to the project.      | `boolean`   | `true`        |
| `--baseApp`      | The base app to be used.         | `string`    | `Core`        |
| `--packages`     | The packages to install.         | `array`     |               |

#### **Usage:**
```
ng add
```

## **Generate Commands**

---------

### **converter**

Creates a new, generic Converter definition in the given or default project

#### **Arguments:** 

| Name          | Description                      | Value Type  |
| ------------- | -------------------------------- | ----------- |
| `name`        | The name of the converter.       | `string`    |

#### **Options:** 

| Name            | Description                      | Value Type  |
| --------------- | -------------------------------- | ----------- |
| `--project`     | The name of the project.         | `string`    |

#### **Usage:**
```
ng generate converter [name]
```

### **data-source**

Creates a new, generic Data Source definition in the given or default project

#### **Arguments:** 

| Name          | Description                        | Value Type  |
| ------------- | ---------------------------------- | ----------- |
| `name`        | The name of the data source.       | `string`    |

#### **Options:** 

| Name            | Description                           | Value Type  | Default Value  |
| --------------- | ------------------------------------- | ----------- | -------------- |
| `--project`     | The name of the project.              | `string`    |                |
| `--style`       | The processor to use for style files. | `string`    | `less`         |

#### **Usage:**
```
ng generate data-source [name]
```

### **entity-page**

Creates a new, generic Entity Page definition in the given or default project

#### **Arguments:** 

| Name          | Description                        | Value Type  |
| ------------- | ---------------------------------- | ----------- |
| `name`        | The name of the entity type.       | `string`    |

#### **Options:** 

| Name            | Description                          | Value Type  |
| -------------   | ------------------------------------ | ----------- |
| `--project`     | The name of the project.             | `string`    |
| `--namespace`   | The namespace of the entity type.    | `string`    |

#### **Usage:**
```
ng generate entity-page [name]
```

### **execution-view**

Creates a new, generic Execution View definition in the given or default project

#### **Arguments:** 

| Name          | Description                                                        | Value Type  |
| ------------- | ------------------------------------------------------------------ | ----------- |
| `name`        | The name of the action that the execution view will perform.       | `string`    |
| `entityType`  | The name of the entity type to be performed.                       | `string`    |

#### **Options:** 

| Name            | Description                           | Value Type  | Default Value  |
| --------------- | ------------------------------------- | ----------- | -------------- |
| `--project`     | The name of the project.              | `string`    |                |
| `--namespace`   | The namespace of the entity type.     | `string`    |                |
| `--style`       | The processor to use for style files. | `string`    | `less`         |

#### **Usage:**
```
ng generate execution-view [name] --entityType [entityType]
```

### **library**

Creates a new, generic Library project in the current workspace

#### **Arguments:** 

| Name          | Description               | Value Type  |
| ------------- | ------------------------- | ----------- |
| `name`        | The name of the library.  | `string`    |

#### **Options:** 

| Name                 | Description                                                                                | Value Type  | Default Value  |
| -------------------- | ------------------------------------------------------------------------------------------ | ----------- | -------------- |
| `--entry-file`       | The path at which to create the library's public API file, relative to the workspace root. | `string`    | `public-api`   |
| `--prefix`           | A prefix to apply to generated selectors.                                                  | `string`    | `lib`          |
| `--skipPackageJson`  | Do not add dependencies to the "package.json" file.                                        | `boolean`   | `false`        |
| `--skipInstall`      | Do not install dependency packages.                                                        | `boolean`   | `false`        |
| `--skipTsConfig`     | Do not update "tsconfig.json" to add a path mapping for the new library.                   | `boolean`   | `false`        |
| `--lint`             | Adds eslint to the library.                                                                | `boolean`   |                |

#### **Usage:**
```
ng generate library [name]
```

### **package-info**

Generate the package information in the given or default project

#### **Arguments:** 

| Name          | Description               | Value Type  |
| ------------- | ------------------------- | ----------- |
| `project`     | The name of the project.  | `string`    |

#### **Options:** 

*No options available.*

#### **Usage:**
```
ng generate package-info [project]
```

### **widget**

Creates a new, generic Widget definition in the given or default project

#### **Arguments:** 

| Name          | Description                   | Value Type  |
| ------------- | ----------------------------- | ----------- |
| `name`        | The name of the widget.       | `string`    |

#### **Options:** 

| Name            | Description                           | Value Type  | Default Value  |
| --------------- | ------------------------------------- | ----------- | -------------- |
| `--project`     | The name of the project.              | `string`    |                |
| `--style`       | The processor to use for style files. | `string`    | `less`         |

#### **Usage:**
```
ng generate widget [name]
```

### **wizard**

Creates a new, generic Wizard definition in the given or default project

#### **Arguments:** 

| Name          | Description                                          | Value Type  |
| ------------- | ---------------------------------------------------- | ----------- |
| `name`        | The name of the action that the wizard will perform. | `string`    |
| `entityType`  | The name of the entity type to be performed.         | `string`    |

#### **Options:** 

| Name            | Description                           | Value Type  | Default Value  |
| --------------- | ------------------------------------- | ----------- | -------------- |
| `--project`     | The name of the project.              | `string`    |                |
| `--namespace`   | The namespace of the entity type.     | `string`    |                |
| `--style`       | The processor to use for style files. | `string`    | `less`         |

#### **Usage:**
```
ng generate wizard [name] --entityType [entityType]
```

### **wizard-create-edit**

Creates a new, generic Wizard Create Edit definition in the given or default project

#### **Arguments:** 

| Name          | Description                  | Value Type  |
| ------------- | ---------------------------- | ----------- |
| `name`        | The name of the entity type. | `string`    |

#### **Options:** 

| Name            | Description                           | Value Type  | Default Value  |
| --------------- | ------------------------------------- | ----------- | -------------- |
| `--project`     | The name of the project.              | `string`    |                |
| `--namespace`   | The namespace of the entity type.     | `string`    |                |
| `--style`       | The processor to use for style files. | `string`    | `less`         |

#### **Usage:**
```
ng generate wizard-create-edit [name]
```

## **Getting Started**

---------

1. Clone this repository into your repository root.

2. Run:

```
npm install
```

## **Testing**

---------

To test locally, install `@criticalmanufacturing/ng-schematics` globally and use the `schematics` command line tool. That tool acts the same as the `generate` command of the Angular CLI, but also has a debug mode.

Check the documentation with

```bash
schematics --help
```

## **Unit Testing**

---------

`npm run test` will run the unit tests, using Jasmine as a runner and test framework.

## **Publishing**

---------

To publish, simply do:

```bash
npm run build
npm publish
```
