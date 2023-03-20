import { indentBy } from '@angular-devkit/core/src/utils/literals';
import { ClassDeclaration, SourceFile, SyntaxKind, StructureKind, ObjectLiteralExpression } from 'ts-morph';
import { insertImport } from './ast';
import { nameify } from './string';

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
    [MetadataProperty.Route]: { 'RouteConfig': 'cmf-core' },
    [MetadataProperty.Action]: { 'Action': 'cmf-core' },
    [MetadataProperty.ActionGroup]: { 'ActionGroup': 'cmf-core' },
    [MetadataProperty.ActionButton]: { 'ActionButton': 'cmf-core' },
    [MetadataProperty.ActionButtonGroup]: { 'ActionButtonGroup': 'cmf-core' },
    [MetadataProperty.ActionBar]: { 'ActionBar': 'cmf-core' },
    [MetadataProperty.MenuItem]: { 'MenuItem': 'cmf-core' },
    [MetadataProperty.MenuSubGroup]: { 'MenuSubGroup': 'cmf-core' },
    [MetadataProperty.MenuGroup]: { 'MenuGroup': 'cmf-core' },
    [MetadataProperty.EntityType]: { 'EntityTypeMetadata': 'cmf-core' },
    [MetadataProperty.Table]: { 'Table': 'cmf-core' },
    [MetadataProperty.StaticType]: { 'StaticType': 'cmf-core' },
    [MetadataProperty.FileViewer]: { 'FileViewerMetadata': 'cmf-core' },
    [MetadataProperty.SideBarTab]: { 'SideBarTab': 'cmf-core' },
    [MetadataProperty.UserMenu]: { 'UserMenu': 'cmf-core' },
    [MetadataProperty.Credit]: { 'Credit': 'cmf-core' },
    [MetadataProperty.FlexComponent]: { 'FlexComponent': 'cmf-core' }
};

export interface PackageInfo {
    package: string;
    widgets?: string[];
    converters?: string[];
    dataSources?: string[];
    components?: string[];
}

function getMetadataClassDeclaration(source: SourceFile): ClassDeclaration | undefined {
    return source.getClasses().find(classNode => classNode.getExtends()?.getText().endsWith('PackageMetadata'));
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
    insertImports(source, { ...requiredImports, ...PROPERTY_REFERENCE[propertyIdentifier] });

    if (!accessor) {
        // Accessor not found, lets create the acessor in the metadata with the element to insert
        const memberToInsert = `\
/**
 * ${nameify(propertyIdentifier)}
 */
public override get ${propertyIdentifier}(): ${Object.keys(PROPERTY_REFERENCE[propertyIdentifier])[0]}[] {
    return [
        ${toInsert}
    ];
}`;

        metadataClass.addMember(memberToInsert).formatText();

        return;
    }

    // Lets add the new element to the array of the metadata getter
    const returnStatement = accessor.getFirstDescendantByKind(SyntaxKind.ReturnStatement);
    const array = returnStatement?.getFirstChildByKind(SyntaxKind.ArrayLiteralExpression);

    // just give up at this point
    if (!array) {
        return;
    }

    array.addElement(toInsert).formatText();
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

    const returnStatement = routesAccessor
        ?.getFirstDescendantByKind(SyntaxKind.ReturnStatement);
    const pageRoutes = returnStatement
        ?.getFirstChildByKind(SyntaxKind.ArrayLiteralExpression)
        ?.getElements()
        .map(elem => elem.asKind(SyntaxKind.ObjectLiteralExpression))
        .find(elem => elem?.getProperty('id')?.getText().endsWith('Page'));

    if (!routesAccessor || !pageRoutes) {
        const routeToInsert = `\
{
    id: KnownRoutes.Page,
    routes: [
        ${toInsert}
    ]
}`;

        return insertMetadata(
            source,
            {
                ...requiredImports,
                'KnownRoutes': 'cmf-core'
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
    routes.addElement(toInsert).formatText();
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
      dataSources: [${options.dataSources.length > 0 ? `\n'${options.dataSources.join(`',\n'`)}'\n` : ''}],
      converters: [${options.converters.length > 0 ? `\n'${options.converters.join(`',\n'`)}'\n` : ''}],
      components: [${options.components.length > 0 ? `\n'${options.components.join(`',\n'`)}'\n` : ''}]
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
 * Updates the package info object property addding new elements
 * @param objectExpression ObjectLiteralExpression
 * @param elements elements to add
 * @returns 
 */
function updateInfoObjectProperty(objectExpression: ObjectLiteralExpression, propertyName: string, elements: string[]) {
    if (!objectExpression.getProperty(propertyName)) {
        objectExpression.addProperty({
            kind: StructureKind.PropertyAssignment,
            name: propertyName,
            initializer: '[]'
        });
    }

    const property = objectExpression.getProperty(propertyName)?.asKind(SyntaxKind.PropertyAssignment);

    if (!property) {
        return;
    }

    const array = property.getInitializer()?.asKind(SyntaxKind.ArrayLiteralExpression);

    if (!array) {
        return;
    }

    const elementsToAdd = elements.filter(e => !array.getElements().map(node => node.getText()).includes(e));

    if (elementsToAdd.length === 0) {
        return;
    }

    array.addElements(elementsToAdd.map(e => "'" + e + "'"), { useNewLines: true });

    const loader = objectExpression.getProperty('loader');

    if (!loader) {
        return;
    }

    const loaderText = loader.getText();
    const exportsMatch = /webpackExports\s*:\s*\[([^\]]*?)(\s*\])/.exec(loaderText);

    if (exportsMatch) {
        const insertIndex = exportsMatch.index + exportsMatch[0].length - exportsMatch[2].length;
        const baseIndentation = loader.getIndentationText().length / loader.getIndentationLevel();
        const indentation = loader.getIndentationText() + ' '.repeat(baseIndentation * 2);
        loader.replaceWithText(
            loaderText.slice(0, insertIndex) + // ... webpackExports: [...
            (exportsMatch[1].trim().length > 0 ? ',' : '') +
            `\n${indentation}"${elementsToAdd.join(`",\n${indentation}"`)}"` +
            (exportsMatch[2].length === 1 ? `\n${loader.getIndentationText() + ' '.repeat(baseIndentation)}` : '') +
            loaderText.slice(insertIndex, loaderText.length) // ] ...
        );
    }

    loader.formatText();
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

    updateInfoObjectProperty(objectExpression, 'widgets', options.widgets);
    updateInfoObjectProperty(objectExpression, 'converters', options.converters);
    updateInfoObjectProperty(objectExpression, 'dataSources', options.dataSources);
    updateInfoObjectProperty(objectExpression, 'components', options.components);
}