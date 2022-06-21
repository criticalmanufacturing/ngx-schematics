import { strings } from "@angular-devkit/core";
import { SchematicTestRunner, UnitTestTree } from "@angular-devkit/schematics/testing";
import { nameify } from "../utility/string";
import { getAllFilesFromDir } from "../utility/test";

describe('Generate Entity Page', () => {
    const schematicRunner = new SchematicTestRunner(
        '@criticalmanufacturing/ng-schematics',
        require.resolve('../collection.json'),
    );

    const workspaceOptions = {
        name: 'workspace',
        newProjectRoot: 'projects',
        version: '10.0.0'
    };

    const appOptions = {
        name: 'app',
        inlineStyle: false,
        inlineTemplate: false,
        routing: false,
        skipTests: false,
        skipPackageJson: false,
    };

    const libraryOptions = {
        name: 'testlib',
        skipPackageJson: false,
        skipTsConfig: false,
        skipInstall: false,
    };

    const entityPageOptions = {
        name: 'TestEntityType',
        project: libraryOptions.name,
        namespace: 'TestNamespace'
    }

    const pageEntityTypePath = `projects/${libraryOptions.name}/src/lib/page-${strings.dasherize(entityPageOptions.name)}`;
    const pageEntityTypeDetailsViewPath = `projects/${libraryOptions.name}/src/lib/page-${strings.dasherize(entityPageOptions.name)}/page-${strings.dasherize(entityPageOptions.name)}-details-view`;

    let appTree: UnitTestTree;

    beforeEach(async () => {
        appTree = await schematicRunner
            .runExternalSchematicAsync('@schematics/angular', 'workspace', workspaceOptions)
            .toPromise();

        appTree = await schematicRunner
            .runExternalSchematicAsync('@schematics/angular', 'application', appOptions, appTree)
            .toPromise();

        appTree = await schematicRunner
            .runSchematicAsync('library', libraryOptions, appTree)
            .toPromise();
    });

    it('should create the entity page files', async () => {
        const tree = await schematicRunner
            .runSchematicAsync('entity-page', entityPageOptions, appTree)
            .toPromise();

        const dasherizedEntityName = strings.dasherize(entityPageOptions.name);
        const files = getAllFilesFromDir(`projects/${libraryOptions.name}/src/lib/page-${dasherizedEntityName}`, tree);

        expect(files).toEqual(
            jasmine.arrayContaining([
                `${pageEntityTypePath}/page-${dasherizedEntityName}-routing.module.ts`,
                `${pageEntityTypePath}/page-${dasherizedEntityName}.component.html`,
                `${pageEntityTypePath}/page-${dasherizedEntityName}.component.ts`,
                `${pageEntityTypeDetailsViewPath}/page-${dasherizedEntityName}-details-view.component.html`,
                `${pageEntityTypeDetailsViewPath}/page-${dasherizedEntityName}-details-view.component.ts`
            ])
        );
    });

    it('should generate the html file with `cmf-core-business-controls-entityPage` component selector', async () => {
        const tree = await schematicRunner
            .runSchematicAsync('entity-page', entityPageOptions, appTree)
            .toPromise();

        const templateRegExp = new RegExp(
            `<cmf-core-business-controls-entityPage\\s*` +
                `\\[mainTitle\\]="epEntity\\?.Name!"\\s*` +
                `\\entityType="${strings.classify(entityPageOptions.name)}"\\s*` +
                `i18n-entityTypeName="@@${strings.dasherize(entityPageOptions.project)}/page-${strings.dasherize(entityPageOptions.name)}#ENTITY_TYPE"\\s*` +
                `entityTypeName="${nameify(entityPageOptions.name)}">\\s*` +
            `<\/cmf-core-business-controls-entityPage>`, 'gm');

        const entityPageTemplateContent = tree.readContent(`${pageEntityTypePath}/page-${strings.dasherize(entityPageOptions.name)}.component.html`);
        expect(entityPageTemplateContent).toMatch(templateRegExp);
    });

    it('should have the Component decorator with properties selector, providers, templateUrl, and viewProviders', async () => {

        const tree = await schematicRunner
            .runSchematicAsync('entity-page', entityPageOptions, appTree)
            .toPromise();

        const entityPageContent = tree.readContent(`${pageEntityTypePath}/page-${strings.dasherize(entityPageOptions.name)}.component.ts`);
        expect(entityPageContent).toMatch(/@Component\(/);
        expect(entityPageContent).toContain(`selector: '${strings.dasherize(entityPageOptions.project)}-page-${strings.dasherize(entityPageOptions.name)}'`);
        expect(entityPageContent).toContain(`providers: [EntityPageService]`);
        expect(entityPageContent).toContain(`templateUrl: './page-${strings.dasherize(entityPageOptions.name)}.component.html'`);
        expect(entityPageContent).toContain(`viewProviders: [{ provide: HOST_VIEW_COMPONENT, useExisting: forwardRef(() => Page${strings.classify(entityPageOptions.name)}Component) }]`);
    });

    it('should extend CustomizableComponent', async () => {
        const tree = await schematicRunner
            .runSchematicAsync('entity-page', entityPageOptions, appTree)
            .toPromise();

        const entityPageContent = tree.readContent(`${pageEntityTypePath}/page-${strings.dasherize(entityPageOptions.name)}.component.ts`);
        expect(entityPageContent).toContain(`export class Page${strings.classify(entityPageOptions.name)}Component extends CustomizableComponent`);
    });

    it('should implement EntityPageInterface and LevelsToLoad', async () => {
        const tree = await schematicRunner
            .runSchematicAsync('entity-page', entityPageOptions, appTree)
            .toPromise();

        const entityPageContent = tree.readContent(`${pageEntityTypePath}/page-${strings.dasherize(entityPageOptions.name)}.component.ts`);
        expect(entityPageContent).toContain(`implements EntityPageInterface<Cmf.${entityPageOptions.namespace}.BusinessObjects.${strings.classify(entityPageOptions.name)}>, LevelsToLoad`);
        expect(entityPageContent).toContain(`public epLevelsToLoad: number = 1;`);
        expect(entityPageContent).toContain(`public epEntity!: Cmf.${entityPageOptions.namespace}.BusinessObjects.${strings.classify(entityPageOptions.name)};`);
    });

    it('should have the constructor receiving the ViewContainerRef and providing it to the super', async () => {
        const tree = await schematicRunner
            .runSchematicAsync('entity-page', entityPageOptions, appTree)
            .toPromise();

        const entityPageContent = tree.readContent(`${pageEntityTypePath}/page-${strings.dasherize(entityPageOptions.name)}.component.ts`);
        expect(entityPageContent).toMatch(/constructor\(viewContainerRef: ViewContainerRef\) {\s*super\(viewContainerRef\);\s*}/gm)
    });

    it('should import CommonModule and EntityPageModule in NgModule', async () => {
        const tree = await schematicRunner
            .runSchematicAsync('entity-page', entityPageOptions, appTree)
            .toPromise();

        const entityPageContent = tree.readContent(`${pageEntityTypePath}/page-${strings.dasherize(entityPageOptions.name)}.component.ts`);
        expect(entityPageContent).toMatch(/imports: \[\s*((CommonModule|EntityPageModule)\s*,?\s*){2}\]/gm);
    });

    it('should be declared and exported in NgModule', async () => {
        const tree = await schematicRunner
            .runSchematicAsync('entity-page', entityPageOptions, appTree)
            .toPromise();

        const entityPageContent = tree.readContent(`${pageEntityTypePath}/page-${strings.dasherize(entityPageOptions.name)}.component.ts`);
        expect(entityPageContent).toContain(`declarations: [Page${strings.classify(entityPageOptions.name)}Component]`);
        expect(entityPageContent).toContain(`exports: [Page${strings.classify(entityPageOptions.name)}Component]`);
        expect(entityPageContent).toContain(`export class Page${strings.classify(entityPageOptions.name)}Module { }`);
    });

    it('should have defined the path `` for the main component in Routing Module', async() => {
        const tree = await schematicRunner
            .runSchematicAsync('entity-page', entityPageOptions, appTree)
            .toPromise();

        const pathRegExp = new RegExp(`path: '',\\s*component: Page${strings.classify(entityPageOptions.name)}Component`, 'gm');

        const routingModuleContent = tree.readContent(`${pageEntityTypePath}/page-${strings.dasherize(entityPageOptions.name)}-routing.module.ts`);
        expect(routingModuleContent).toMatch(pathRegExp);
    });

    it('should have children routes defined in Routing Module', async () => {

        const tree = await schematicRunner
            .runSchematicAsync('entity-page', entityPageOptions, appTree)
            .toPromise();

        const routingModuleContent = tree.readContent(`${pageEntityTypePath}/page-${strings.dasherize(entityPageOptions.name)}-routing.module.ts`);
        const routingModuleChildren = routingModuleContent.match(/children: \[(\r*\n*\s*)(\W|\w)+\]/gm)?.[0];
        expect(routingModuleChildren).not.toBeNull();

        // Details View
        const detailsViewRedirectRouteRegExp = new RegExp(`{\\s*path: '',\\s*redirectTo: 'View/Details',\\s*pathMatch: 'full'\\s*}`, 'gm');
        expect(routingModuleChildren).toMatch(detailsViewRedirectRouteRegExp);
        const detailsViewRouteRegExp = new RegExp(`{\\s*path: 'View/Details',\\s*component: Page${strings.classify(entityPageOptions.name)}DetailsViewComponent\\s*}`, 'gm');
        expect(routingModuleChildren).toMatch(detailsViewRouteRegExp);

        // References View
        const referencesViewRouteRegExp = new RegExp(`{\\s*path: 'View/References',\\s*component: ReferencesView\\s*}`, 'gm');
        expect(routingModuleChildren).toMatch(referencesViewRouteRegExp);

        // History View
        const historyViewRouteRegExp = new RegExp(`{\\s*path: 'View/History',\\s*component: HistoryView\\s*}`, 'gm');
        expect(routingModuleChildren).toMatch(historyViewRouteRegExp);
    });

    it('should import RouterModule, DetailsView, HistoryViewModule, and ReferencesViewModule in Routing Module', async () => {
        const tree = await schematicRunner
            .runSchematicAsync('entity-page', entityPageOptions, appTree)
            .toPromise();

        const routingModuleContent = tree.readContent(`${pageEntityTypePath}/page-${strings.dasherize(entityPageOptions.name)}-routing.module.ts`);

        const routingModulesImportsRegExp = new RegExp(`imports: \\[\\s*((RouterModule\\.forChild\\(routes\\)|Page${strings.classify(entityPageOptions.name)}DetailsViewModule|HistoryViewModule|ReferencesViewModule)\\s*,?\\s*){4}\\]`, 'gm')
        expect(routingModuleContent).toMatch(routingModulesImportsRegExp);
    });

    it('should provide ViewGuard in Routing Module', async () => {
        const tree = await schematicRunner
            .runSchematicAsync('entity-page', entityPageOptions, appTree)
            .toPromise();

        const routingModuleContent = tree.readContent(`${pageEntityTypePath}/page-${strings.dasherize(entityPageOptions.name)}-routing.module.ts`);
        expect(routingModuleContent).toContain(`providers: [ViewGuard]`);
    });

    it('should export the Routing Module', async () => {
        const tree = await schematicRunner
            .runSchematicAsync('entity-page', entityPageOptions, appTree)
            .toPromise();

        const routingModuleContent = tree.readContent(`${pageEntityTypePath}/page-${strings.dasherize(entityPageOptions.name)}-routing.module.ts`);
        expect(routingModuleContent).toContain(`export class Page${strings.classify(entityPageOptions.name)}RoutingModule { }`);
    });

    describe('- Generate Details View', () => {
        it('should generate the html file with `cmf-core-business-controls-detailsView` component selector', async () => {
            const tree = await schematicRunner
                .runSchematicAsync('entity-page', entityPageOptions, appTree)
                .toPromise();
    
            const entityPageDetailsViewTemplateContent = tree.readContent(`${pageEntityTypeDetailsViewPath}/page-${strings.dasherize(entityPageOptions.name)}-details-view.component.html`);
            expect(entityPageDetailsViewTemplateContent).toMatch(/<cmf-core-business-controls-detailsView \*ngIf="epEntity">\s*<\/cmf-core-business-controls-detailsView>/gm);
        });

        it('should have the Component decorator with properties selector and templateUrl', async () => {

            const tree = await schematicRunner
                .runSchematicAsync('entity-page', entityPageOptions, appTree)
                .toPromise();
    
            const entityPageContent = tree.readContent(`${pageEntityTypeDetailsViewPath}/page-${strings.dasherize(entityPageOptions.name)}-details-view.component.ts`);
            expect(entityPageContent).toMatch(/@Component\(/);
            expect(entityPageContent).toContain(`selector: '${strings.dasherize(entityPageOptions.project)}-page-${strings.dasherize(entityPageOptions.name)}-details-view'`);
            expect(entityPageContent).toContain(`templateUrl: './page-${strings.dasherize(entityPageOptions.name)}-details-view.component.html'`);
        });

        it('should extend CustomizableComponent', async () => {
            const tree = await schematicRunner
                .runSchematicAsync('entity-page', entityPageOptions, appTree)
                .toPromise();
    
            const entityPageDetailsViewContent = tree.readContent(`${pageEntityTypeDetailsViewPath}/page-${strings.dasherize(entityPageOptions.name)}-details-view.component.ts`);
            expect(entityPageDetailsViewContent).toContain(`export class Page${strings.classify(entityPageOptions.name)}DetailsViewComponent extends CustomizableComponent`);
        });
    
        it('should implement OnDestroy', async () => {
            const tree = await schematicRunner
                .runSchematicAsync('entity-page', entityPageOptions, appTree)
                .toPromise();
    
            const entityPageDetailsViewContent = tree.readContent(`${pageEntityTypeDetailsViewPath}/page-${strings.dasherize(entityPageOptions.name)}-details-view.component.ts`);
            expect(entityPageDetailsViewContent).toContain(`implements OnDestroy`);
            expect(entityPageDetailsViewContent).toContain(`public ngOnDestroy(): void {`);
        });

        it('should have the properties _epEntityLoadedSubscription and epEntity declared', async () => {
            const tree = await schematicRunner
                .runSchematicAsync('entity-page', entityPageOptions, appTree)
                .toPromise();
    
            const entityPageDetailsViewContent = tree.readContent(`${pageEntityTypeDetailsViewPath}/page-${strings.dasherize(entityPageOptions.name)}-details-view.component.ts`);
            expect(entityPageDetailsViewContent).toContain(`private _epEntityLoadedSubscription: Subscription;`);
            expect(entityPageDetailsViewContent).toContain(`public epEntity!: Cmf.${entityPageOptions.namespace}.BusinessObjects.${strings.classify(entityPageOptions.name)};`);
        });

        it('should have the constructor receiving the ViewContainerRef and EntityPageService', async () => {
            const tree = await schematicRunner
                .runSchematicAsync('entity-page', entityPageOptions, appTree)
                .toPromise();
    
            const entityPageDetailsViewContent = tree.readContent(`${pageEntityTypeDetailsViewPath}/page-${strings.dasherize(entityPageOptions.name)}-details-view.component.ts`);
            expect(entityPageDetailsViewContent).toMatch(/constructor\(viewContainerRef: ViewContainerRef, private entityPage: EntityPageService\)/gm);
            expect(entityPageDetailsViewContent).toContain('super(viewContainerRef);');
            expect(entityPageDetailsViewContent).toContain('this.epOnEntityLoaded();');
            expect(entityPageDetailsViewContent).toContain('this._epEntityLoadedSubscription = this.entityPage.epEntityLoaded.subscribe(this.epOnEntityLoaded.bind(this));');
        });

        it('should have the epOnEntityLoaded method', async () => {
            const tree = await schematicRunner
                .runSchematicAsync('entity-page', entityPageOptions, appTree)
                .toPromise();

            const entityPageDetailsViewContent = tree.readContent(`${pageEntityTypeDetailsViewPath}/page-${strings.dasherize(entityPageOptions.name)}-details-view.component.ts`);
            const epOnEntityLoadedMethodRegExp = new RegExp(
                `public epOnEntityLoaded\\(\\) {\\s*` +
                    `this\\.epEntity = this\\.entityPage\\.epEntity as Cmf\\.${entityPageOptions.namespace}\\.BusinessObjects\\.${strings.classify(entityPageOptions.name)};` +
                `\\s*}`,
                'gm'
            )
            expect(entityPageDetailsViewContent).toMatch(epOnEntityLoadedMethodRegExp);
        });

        it('should import CommonModule and DetailsViewModule in NgModule', async () => {
            const tree = await schematicRunner
                .runSchematicAsync('entity-page', entityPageOptions, appTree)
                .toPromise();
    
            const entityPageDetailsViewContent = tree.readContent(`${pageEntityTypeDetailsViewPath}/page-${strings.dasherize(entityPageOptions.name)}-details-view.component.ts`);
            expect(entityPageDetailsViewContent).toMatch(/imports: \[\s*((CommonModule|DetailsViewModule)\s*,?\s*){2}\]/gm);
        });
    
        it('should be declared and exported in NgModule', async () => {
            const tree = await schematicRunner
                .runSchematicAsync('entity-page', entityPageOptions, appTree)
                .toPromise();
    
            const entityPageDetailsViewContent = tree.readContent(`${pageEntityTypeDetailsViewPath}/page-${strings.dasherize(entityPageOptions.name)}-details-view.component.ts`);
            expect(entityPageDetailsViewContent).toContain(`declarations: [Page${strings.classify(entityPageOptions.name)}DetailsViewComponent]`);
            expect(entityPageDetailsViewContent).toContain(`exports: [Page${strings.classify(entityPageOptions.name)}DetailsViewComponent]`);
            expect(entityPageDetailsViewContent).toContain(`export class Page${strings.classify(entityPageOptions.name)}DetailsViewModule { }`);
        });
    });
});