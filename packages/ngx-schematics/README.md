# **Critical Manufacturing UI Schematics Package**

**Critical Manufacturing UI Schematics** is the base of any CMF MES HTML Graphical User Interface customization project. This repository is meant to be a quick and easy way of getting started with CMF MES GUI customization, by providing a basic structure for the project and all the recommended tooling.

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
- [page](#page)

## **Project Startup Commands**

### **ng-add**

Update an application with HTML defaults.

#### **Arguments:**

_No arguments available._

#### **Options:**

| Name            | Description                      | Value Type | Default Value |
| --------------- | -------------------------------- | ---------- | ------------- |
| `--project`     | The name of the project.         | `string`   |               |
| `--registry`    | The npm registry to use.         | `string`   |               |
| `--lint`        | Adds eslint to the project.      | `boolean`  | `true`        |
| `--application` | The base application to be used. | `string`   | `MES`         |
| `--version`     | The version to be used.          | `string`   |               |

#### **Usage:**

```
ng add
```

## **Generate Commands**

### **converter**

Creates a new, generic Converter definition in the given or default project

#### **Arguments:**

| Name   | Description                | Value Type |
| ------ | -------------------------- | ---------- |
| `name` | The name of the converter. | `string`   |

#### **Options:**

| Name        | Description              | Value Type |
| ----------- | ------------------------ | ---------- |
| `--project` | The name of the project. | `string`   |

#### **Usage:**

```
ng generate converter [name]
```

### **data-source**

Creates a new, generic Data Source definition in the given or default project

#### **Arguments:**

| Name   | Description                  | Value Type |
| ------ | ---------------------------- | ---------- |
| `name` | The name of the data source. | `string`   |

#### **Options:**

| Name        | Description                           | Value Type | Default Value |
| ----------- | ------------------------------------- | ---------- | ------------- |
| `--project` | The name of the project.              | `string`   |               |
| `--style`   | The processor to use for style files. | `string`   | `less`        |

#### **Usage:**

```
ng generate data-source [name]
```

### **entity-page**

Creates a new, generic Entity Page definition in the given or default project

#### **Arguments:**

| Name   | Description                  | Value Type |
| ------ | ---------------------------- | ---------- |
| `name` | The name of the entity page. | `string`   |

#### **Options:**

| Name            | Description                       | Value Type |
| --------------- | --------------------------------- | ---------- |
| `--project`     | The name of the project.          | `string`   |
| `--entity-type` | The name of the entity type.      | `string`   |
| `--namespace`   | The namespace of the entity type. | `string`   |

#### **Usage:**

```
ng generate entity-page [name]
```

### **execution-view**

Creates a new, generic Execution View definition in the given or default project

#### **Arguments:**

| Name          | Description                                                  | Value Type |
| ------------- | ------------------------------------------------------------ | ---------- |
| `name`        | The name of the action that the execution view will perform. | `string`   |
| `entity-type` | The name of the entity type to be performed.                 | `string`   |

#### **Options:**

| Name          | Description                           | Value Type | Default Value |
| ------------- | ------------------------------------- | ---------- | ------------- |
| `--project`   | The name of the project.              | `string`   |               |
| `--namespace` | The namespace of the entity type.     | `string`   |               |
| `--style`     | The processor to use for style files. | `string`   | `less`        |

#### **Usage:**

```
ng generate execution-view [name] --entity-type [entityType]
```

### **library**

Creates a new, generic Library project in the current workspace

#### **Arguments:**

| Name   | Description              | Value Type |
| ------ | ------------------------ | ---------- |
| `name` | The name of the library. | `string`   |

#### **Options:**

| Name                  | Description                                                                                | Value Type | Default Value |
| --------------------- | ------------------------------------------------------------------------------------------ | ---------- | ------------- |
| `--entry-file`        | The path at which to create the library's public API file, relative to the workspace root. | `string`   | `public-api`  |
| `--prefix`            | A prefix to apply to generated selectors.                                                  | `string`   | `lib`         |
| `--skip-package-json` | Do not add dependencies to the "package.json" file.                                        | `boolean`  | `false`       |
| `--skip-install`      | Do not install dependency packages.                                                        | `boolean`  | `false`       |
| `--skip-ts-config`    | Do not update "tsconfig.json" to add a path mapping for the new library.                   | `boolean`  | `false`       |
| `--skip-metadata`     | Do not generate metadata for the new library.                                              | `boolean`  | `false`       |

#### **Usage:**

```
ng generate library [name]
```

### **package-info**

Generate the package information in the given or default project

#### **Arguments:**

| Name      | Description              | Value Type |
| --------- | ------------------------ | ---------- |
| `project` | The name of the project. | `string`   |

#### **Options:**

_No options available._

#### **Usage:**

```
ng generate package-info [project]
```

### **widget**

Creates a new, generic Widget definition in the given or default project

#### **Arguments:**

| Name   | Description             | Value Type |
| ------ | ----------------------- | ---------- |
| `name` | The name of the widget. | `string`   |

#### **Options:**

| Name        | Description                           | Value Type | Default Value |
| ----------- | ------------------------------------- | ---------- | ------------- |
| `--project` | The name of the project.              | `string`   |               |
| `--style`   | The processor to use for style files. | `string`   | `less`        |

#### **Usage:**

```
ng generate widget [name]
```

### **wizard**

Creates a new, generic Wizard definition in the given or default project

#### **Arguments:**

| Name          | Description                                          | Value Type |
| ------------- | ---------------------------------------------------- | ---------- |
| `name`        | The name of the action that the wizard will perform. | `string`   |
| `entity-type` | The name of the entity type to be performed.         | `string`   |

#### **Options:**

| Name          | Description                           | Value Type | Default Value |
| ------------- | ------------------------------------- | ---------- | ------------- |
| `--project`   | The name of the project.              | `string`   |               |
| `--namespace` | The namespace of the entity type.     | `string`   |               |
| `--style`     | The processor to use for style files. | `string`   | `less`        |

#### **Usage:**

```
ng generate wizard [name] --entity-type [entityType]
```

### **wizard-create-edit**

Creates a new, generic Wizard Create Edit definition in the given or default project

#### **Arguments:**

| Name   | Description                         | Value Type |
| ------ | ----------------------------------- | ---------- |
| `name` | The name of the wizard create edit. | `string`   |

#### **Options:**

| Name            | Description                           | Value Type | Default Value |
| --------------- | ------------------------------------- | ---------- | ------------- |
| `--project`     | The name of the project.              | `string`   |               |
| `--entity-type` | The name of the entity type.          | `string`   |               |
| `--namespace`   | The namespace of the entity type.     | `string`   |               |
| `--style`       | The processor to use for style files. | `string`   | `less`        |

#### **Usage:**

```
ng generate wizard-create-edit [name]
```

### **page**

Creates a new, generic page in the given or default project

#### **Arguments:**

| Name   | Description           | Value Type |
| ------ | --------------------- | ---------- |
| `name` | The name of the page. | `string`   |

#### **Options:**

| Name                  | Description                                                                                    | Value Type | Default Value             |
| --------------------- | ---------------------------------------------------------------------------------------------- | ---------- | ------------------------- |
| `--project`           | The name of the project.                                                                       | `string`   |                           |
| `--page-id`           | The id of the action used to access the page.                                                  | `string`   |                           |
| `--icon-class`        | The class for the icon displayed on the page.                                                  | `string`   | `icon-core-st-lg-generic` |
| `--entrypoint`        | Defines how the page will be available to the user.                                            | `string`   | `Menu Item`               |
| `--menu-group-id`     | In case the entrypoint is "Menu Item", specifies the parent Menu Group Id.                     | `string`   |                           |
| `--menu-sub-group-id` | In case the entrypoint is "Menu Item", specifies the parent Menu Sub Group Id (if applicable). | `string`   |                           |
| `--style`             | The processor to use for style files.                                                          | `string`   | `less`                    |

#### **Usage:**

```
ng generate page [name]
```

