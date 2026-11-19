# **Critical Manufacturing IoT Schematics Package**

**Critical Manufacturing IoT Schematics** is the base of any CMF MES HTML IoMT Tasks project. This repository is meant to be a quick and easy way of getting started with IoT Tasks, by providing a basic structure for the project and all the recommended tooling.

## **Schematics**

- [ng-add](#ng-add)
- [converter](#converter)
- [task](#task)
- [library](#library)

## **Project Startup Commands**

### **ng-add**

Installs the IoT Schematics.

#### **Arguments:**

_No arguments available._

#### **Options:**

| Name         | Description                 | Value Type | Default Value |
| ------------ | --------------------------- | ---------- | ------------- |
| `--project`  | The name of the project.    | `string`   |               |
| `--registry` | The npm registry to use.    | `string`   |               |
| `--lint`     | Adds eslint to the project. | `boolean`  | `true`        |
| `--version`  | The version to be used.     | `string`   |               |

#### **Usage:**

```
ng add
```

## **Generate Commands**

### **converter**

Creates a new, generic IoT Converter definition in the given or default project

#### **Arguments:**

| Name   | Description                | Value Type |
| ------ | -------------------------- | ---------- |
| `name` | The name of the converter. | `string`   |

#### **Options:**

| Name            | Description                       | Value Type | Default Value |
| --------------- | --------------------------------- | ---------- | ------------- |
| `--project`     | The name of the project.          | `string`   |               |
| `--input-type`  | The input type of the converter.  | `boolean`  | `false`       |
| `--output-type` | The output type of the converter. | `boolean`  | `false`       |

#### **Usage:**

```
ng generate converter [name]
```

### **task**

Creates a new, generic IoT Task definition in the given or default project

#### **Arguments:**

| Name   | Description                  | Value Type |
| ------ | ---------------------------- | ---------- |
| `name` | The name of the data source. | `string`   |

#### **Options:**

| Name                | Description                                    | Value Type | Default Value |
| ------------------- | ---------------------------------------------- | ---------- | ------------- |
| `--project`         | The name of the project.                       | `string`   |               |
| `--style`           | The processor to use for style files.          | `string`   | `less`        |
| `--has-inputs`      | Do not generate dynamic inputs for this task.  | `boolean`  | `false`       |
| `--has-outputs`     | Do not generate dynamic outputs for this task. | `boolean`  | `false`       |
| `--is-for-protocol` | Do not generate task protocol for this task.   | `boolean`  | `false`       |

#### **Usage:**

```
ng generate task [name]
```

### **library**

Creates an IoT tasks library using the workspace's Angular CLI. Angular CLI 22.0 through 22.2 uses `ng-packagr` and `ng-package.json` for the designer build. From 22.3, Angular uses `@angular/build:library` and reads entry points from the library's `package.json` exports.

#### **Arguments:**

| Name   | Description              | Value Type |
| ------ | ------------------------ | ---------- |
| `name` | The name of the library. | `string`   |

#### **Options:**

| Name                  | Description                                                                        | Value Type | Default Value                       |
| --------------------- | ---------------------------------------------------------------------------------- | ---------- | ----------------------------------- |
| `--prefix`            | Prefix for generated selectors.                                                    | `string`   | Library name                        |
| `--skip-package-json` | Skip adding Angular build dependencies to the workspace `package.json`.            | `boolean`  | `false`                             |
| `--skip-install`      | Skip automatic package installation.                                               | `boolean`  | `false`                             |
| `--skip-ts-config`    | Skip adding library path mappings and references to the workspace `tsconfig.json`. | `boolean`  | `false`                             |
| `--project-root`      | Library directory relative to the workspace root.                                  | `string`   | Workspace `newProjectRoot` and name |
| `--test-runner`       | Runner for `ng test`. Accepts `vitest` or `karma`. Angular deprecates this option. | `string`   | `vitest`                            |
| `--namespace`         | Package scope. The scope in a name such as `@scope/my-lib` takes precedence.       | `string`   | Prompt for an unscoped name         |

Run `npm test` from the generated library directory to run the IoT task tests with Mocha. Use `ng test` for Angular specs you add to the library.

#### **Usage:**

```
ng generate library [name]
```
