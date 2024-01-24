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

Creates a new, generic IoT Tasks Library project in the current workspace

#### **Arguments:**

| Name   | Description              | Value Type |
| ------ | ------------------------ | ---------- |
| `name` | The name of the library. | `string`   |

#### **Options:**

| Name                  | Description                                                              | Value Type | Default Value |
| --------------------- | ------------------------------------------------------------------------ | ---------- | ------------- |
| `--prefix`            | A prefix to apply to generated selectors.                                | `string`   | `lib`         |
| `--skip-package-json` | Do not add dependencies to the "package.json" file.                      | `boolean`  | `false`       |
| `--skip-install`      | Do not install dependency packages.                                      | `boolean`  | `false`       |
| `--skip-ts-config`    | Do not update "tsconfig.json" to add a path mapping for the new library. | `boolean`  | `false`       |
| `--skip-metadata`     | Do not generate metadata for the new library.                            | `boolean`  | `false`       |
| `--namespace`         | The package namespace to use.                                            | `string`   |               |

#### **Usage:**

```
ng generate library [name]
```
