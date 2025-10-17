import { indentBy } from '@angular-devkit/core/src/utils/literals';
import { ClassDeclaration, SourceFile, SyntaxKind } from 'ts-morph';
import { Rule, Tree } from '@angular-devkit/schematics';
import { ProjectDefinition } from '@schematics/angular/utility';
import {
  createSourceFile,
  getFilePathFromEntryPoint,
  updateObjectArrayProperty,
  strings,
  insertImport
} from '@criticalmanufacturing/schematics-devkit';

export enum MetadataProperty {
  Route = 'routes',
  Action = 'actions',
  ActionGroup = 'actionGroups',
  ActionButton = 'actionButtons',
  ActionButtonGroup = 'actionButtonGroups',
  ActionBar = 'actionBars',
  MenuItem = 'menuItems',
  MenuSubGroup = 'menuSubGroups',
  MenuGroup = 'menuGroups',
  EntityType = 'entityTypes',
  Table = 'tables',
  StaticType = 'staticTypes',
  FileViewer = 'fileViewers',
  SideBarTab = 'sideBarTabs',
  UserMenu = 'userMenus',
  Credit = 'credits',
  FlexComponent = 'flexComponents'
}

const PROPERTY_REFERENCE = {
  [MetadataProperty.Route]: { RouteConfig: 'cmf-core' },
  [MetadataProperty.Action]: { Action: 'cmf-core' },
  [MetadataProperty.ActionGroup]: { ActionGroup: 'cmf-core' },
  [MetadataProperty.ActionButton]: { ActionButton: 'cmf-core' },
  [MetadataProperty.ActionButtonGroup]: { ActionButtonGroup: 'cmf-core' },
  [MetadataProperty.ActionBar]: { ActionBar: 'cmf-core' },
  [MetadataProperty.MenuItem]: { MenuItem: 'cmf-core' },
  [MetadataProperty.MenuSubGroup]: { MenuSubGroup: 'cmf-core' },
  [MetadataProperty.MenuGroup]: { MenuGroup: 'cmf-core' },
  [MetadataProperty.EntityType]: { EntityTypeMetadata: 'cmf-core' },
  [MetadataProperty.Table]: { Table: 'cmf-core' },
  [MetadataProperty.StaticType]: { StaticType: 'cmf-core' },
  [MetadataProperty.FileViewer]: { FileViewerMetadata: 'cmf-core' },
  [MetadataProperty.SideBarTab]: { SideBarTab: 'cmf-core' },
  [MetadataProperty.UserMenu]: { UserMenu: 'cmf-core' },
  [MetadataProperty.Credit]: { Credit: 'cmf-core' },
  [MetadataProperty.FlexComponent]: { FlexComponent: 'cmf-core' }
};

export interface PackageInfo {
  package: string;
  widgets?: string[];
  converters?: string[];
  dataSources?: string[];
  components?: string[];
}

/**
 * Update Metadata Options
 */
export interface UpdateMetadataOptions {
  imports: Record<string, string>;
  identifier: MetadataProperty;
  toInsert: string;
}

function getMetadataClassDeclaration(source: SourceFile): ClassDeclaration | undefined {
  return source
    .getClasses()
    .find((classNode) => classNode.getExtends()?.getText().endsWith('PackageMetadata'));
}

function insertImports(source: SourceFile, imports: Record<string, string>): void {
  for (const key in imports) {
    insertImport(source, key, imports[key]);
  }
}

/**
 * Inserts content in the metadata file.
 * @param source Metadata file
 * @param requiredImports Required Import of the content to insert
 * @param propertyIdentifier Identifier of the content
 * @param toInsert Content to insert
 */
export function insertMetadata(
  source: SourceFile,
  requiredImports: Record<string, string>,
  propertyIdentifier: MetadataProperty,
  toInsert: string
): void {
  const metadataClass = getMetadataClassDeclaration(source);

  if (!metadataClass) {
    return;
  }

  const allAccessors = metadataClass.getGetAccessors();
  const accessor = allAccessors.find((accessor) => accessor.getName() === propertyIdentifier);

  // add all required imports
  insertImports(source, {
    ...requiredImports,
    ...PROPERTY_REFERENCE[propertyIdentifier]
  });

  if (!accessor) {
    // Accessor not found, lets create the acessor in the metadata with the element to insert
    const memberToInsert = `\
/**
 * ${strings.nameify(propertyIdentifier)}
 */
override get ${propertyIdentifier}(): ${Object.keys(PROPERTY_REFERENCE[propertyIdentifier])[0]}[] {
  return [
    ${toInsert}
  ];
}`;

    metadataClass.addMember(memberToInsert).formatText({ indentSize: 2 });

    return;
  }

  // Lets add the new element to the array of the metadata getter
  const returnStatement = accessor.getFirstDescendantByKind(SyntaxKind.ReturnStatement);
  const array = returnStatement?.getFirstChildByKind(SyntaxKind.ArrayLiteralExpression);

  // just give up at this point
  if (!array) {
    return;
  }

  array.addElement(toInsert);
  array.formatText({ indentSize: 2 });
}

/**
 * Inserts page routes information in the metadata class.
 * @param source Metadata file
 * @param requiredImports required imports by the text to insert
 * @param toInsert text to insert
 */
export function insertRoutesMetadata(
  source: SourceFile,
  requiredImports: Record<string, string>,
  toInsert: string
): void {
  const metadataClass = getMetadataClassDeclaration(source);

  if (!metadataClass) {
    return;
  }

  const allAccessors = metadataClass.getGetAccessors();
  const routesAccessor = allAccessors.find((accessor) => accessor.getName() === 'routes');

  const returnStatement = routesAccessor?.getFirstDescendantByKind(SyntaxKind.ReturnStatement);
  const pageRoutes = returnStatement
    ?.getFirstChildByKind(SyntaxKind.ArrayLiteralExpression)
    ?.getElements()
    .map((elem) => elem.asKind(SyntaxKind.ObjectLiteralExpression))
    .find((elem) => elem?.getProperty('id')?.getText().endsWith('Page'));

  if (!routesAccessor || !pageRoutes) {
    const routeToInsert = `
{
  id: KnownRoutes.Page,
  routes: [${toInsert}]
}
`;

    return insertMetadata(
      source,
      {
        ...requiredImports,
        KnownRoutes: 'cmf-core'
      },
      MetadataProperty.Route,
      routeToInsert
    );
  }

  const routes = pageRoutes
    .getProperty('routes')
    ?.asKind(SyntaxKind.PropertyAssignment)
    ?.getInitializerIfKind(SyntaxKind.ArrayLiteralExpression);

  if (!routes) {
    return;
  }

  insertImports(source, requiredImports);
  routes.addElement(toInsert);
  routes.formatText({ indentSize: 2 });
}

/**
 * Updates the package info getter in the metadata class
 * @param source Souce file to update
 * @param options Package info
 * @returns
 */
export function setPackageInfoMetadata(source: SourceFile, options: Required<PackageInfo>): void {
  const metadataClass = getMetadataClassDeclaration(source);

  if (!metadataClass) {
    return;
  }

  const allAccessors = metadataClass.getGetAccessors();
  const packageInfoAccessor = allAccessors.find((accessor) => accessor.getName() === 'packageInfo');
  const toInsert = `\
  /**
   * Package Info
   */
  public override get packageInfo(): PackageInfo {
    return {
      name: '${options.package}',
      loader: () => import(
        /* webpackExports: [
${indentBy(12)`"${[
  ...options.widgets,
  ...options.dataSources,
  ...options.converters,
  ...options.components
].join(`",\n"`)}"`}
        ] */
        '${options.package}'),
      widgets: [${options.widgets.length > 0 ? `\n'${options.widgets.join(`',\n'`)}'\n` : ''}],
      dataSources: [${
        options.dataSources.length > 0 ? `\n'${options.dataSources.join(`',\n'`)}'\n` : ''
      }],
      converters: [${
        options.converters.length > 0 ? `\n'${options.converters.join(`',\n'`)}'\n` : ''
      }],
      components: [${
        options.components.length > 0 ? `\n'${options.components.join(`',\n'`)}'\n` : ''
      }]
    };
  }`;

  insertImport(source, 'PackageInfo', 'cmf-core');

  if (!packageInfoAccessor) {
    metadataClass.addMember(toInsert).formatText();
  } else {
    packageInfoAccessor.replaceWithText(toInsert).formatText();
  }
}
/**
 * Update the package info properties
 * @param source source file
 * @param options info to add
 * @returns
 */
export function updatePackageInfo(source: SourceFile, options: PackageInfo): void {
  const metadataClass = getMetadataClassDeclaration(source);

  if (!metadataClass) {
    return;
  }

  const allAccessors = metadataClass.getGetAccessors();
  const packageInfoAccessor = allAccessors.find((accessor) => accessor.getName() === 'packageInfo');

  options.widgets ??= [];
  options.components ??= [];
  options.converters ??= [];
  options.dataSources ??= [];

  if (!packageInfoAccessor) {
    return setPackageInfoMetadata(source, options as Required<typeof options>);
  }

  // Lets add the new element to the array of the metadata getter
  const returnStatement = packageInfoAccessor.getFirstDescendantByKind(SyntaxKind.ReturnStatement);
  const objectExpression = returnStatement?.getFirstChildByKind(SyntaxKind.ObjectLiteralExpression);

  // just give up at this point
  if (!objectExpression) {
    return;
  }

  updateObjectArrayProperty(objectExpression, 'widgets', options.widgets);
  updateObjectArrayProperty(objectExpression, 'converters', options.converters);
  updateObjectArrayProperty(objectExpression, 'dataSources', options.dataSources);
  updateObjectArrayProperty(objectExpression, 'components', options.components);
}

/**
 * Inserts in the metadata the information provided in the update options
 * @param project project definition from which the metadata will be updated
 * @param options Update options with the information to insert in the metadata
 */
export function updateMetadata(project: ProjectDefinition, options: UpdateMetadataOptions): Rule {
  return async (tree: Tree) => {
    const metadataPath = getMetadataFilePath(tree, project);

    if (!metadataPath) {
      return;
    }

    const source = createSourceFile(tree, metadataPath);

    if (!source) {
      return;
    }

    insertMetadata(source, options.imports, options.identifier, options.toInsert);

    tree.overwrite(metadataPath, source.getFullText());
  };
}

/**
 * Updates the metadata package info properties
 * @param project project definition from which the metadata will be updated
 * @param options Update options with the information to insert in the metadata
 * @returns
 */
export function updateMetadataPackageInfo(project: ProjectDefinition, options: PackageInfo): Rule {
  return async (tree: Tree) => {
    const metadataPath = getMetadataFilePath(tree, project);

    if (!metadataPath) {
      return;
    }

    const source = createSourceFile(tree, metadataPath);

    if (!source) {
      return;
    }

    updatePackageInfo(source, options);

    tree.overwrite(metadataPath, source.getFullText());
  };
}

/**
 * Finds the metadata file path in the root given the public api
 * @param content File content to search the metadata on
 * @param fileName Metadata File Name
 */
export function getMetadataFilePath(tree: Tree, project: ProjectDefinition): string | undefined {
  return getFilePathFromEntryPoint(tree, project, 'metadata', (m) =>
    m.endsWith('metadata.service')
  );
}
