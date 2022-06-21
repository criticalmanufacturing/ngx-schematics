import { SchematicTestRunner, UnitTestTree } from "@angular-devkit/schematics/testing";
import { parse } from 'jsonc-parser';

describe('Test ng-add', () => {
    const schematicRunner = new SchematicTestRunner(
        '@criticalmanufacturing/ng-schematics',
        require.resolve('../collection.json'),
    );

    const workspaceOptions = {
        name: 'workspace',
        version: '10.0.0'
    };
    
    const appOptions = {
        name: 'application',
        inlineStyle: false,
        inlineTemplate: false,
        routing: false,
        skipTests: false,
        skipPackageJson: false,
    };

    const ngAddOptions = {
        project: 'application',
        registry: 'https://test.registry.npmjs.org',
    }

    let appTree: UnitTestTree;

    beforeEach(async () => {
        appTree = await schematicRunner
            .runExternalSchematicAsync('@schematics/angular', 'workspace', workspaceOptions)
            .toPromise();

        appTree = await schematicRunner
            .runExternalSchematicAsync('@schematics/angular', 'application', appOptions, appTree)
            .toPromise();
    });

    it('should have the necessary files', async () => {
        const tree = await schematicRunner
            .runSchematicAsync('ng-add', ngAddOptions, appTree)
            .toPromise();

        expect(tree.files).toEqual(
            jasmine.arrayContaining([
                '/angular.json',
                '/package.json',
                '/tsconfig.json',
                '/.eslintrc.json',
                '/.npmrc',
                '/application/tsconfig.app.json',
                '/application/tsconfig.spec.json',
                '/application/ngsw-config.json',
                '/application/.eslintrc.json',
                '/application/src/index.html',
                '/application/src/main.ts',
                '/application/src/polyfills.ts',
                '/application/src/manifest.webmanifest',
                '/application/src/assets/config.json',
                '/application/src/app/app.module.ts',
                '/application/src/app/app.component.html'
            ])
        );
    });

    it('should set the registry in .npmrc', async () => {
        const tree = await schematicRunner
            .runSchematicAsync('ng-add', ngAddOptions, appTree)
            .toPromise();

        const npmrcContent = tree.readContent('/.npmrc');
        expect(npmrcContent).toEqual(`registry=${ngAddOptions.registry}`);
    })

    it('should not create the .npmrc file', async () => {
        const tree = await schematicRunner
            .runSchematicAsync('ng-add', { ...ngAddOptions, registry: undefined }, appTree)
            .toPromise();

        expect(tree.files).not.toEqual(jasmine.arrayContaining(['/.npmrc']));
    })

    describe('- Generate angular.json', () => {

        it('should have @criticalmanufacturing/ng-schematics in schematicCollections', async () => {
            const tree = await schematicRunner
                .runSchematicAsync('ng-add', ngAddOptions, appTree)
                .toPromise();
    
            const angularJsonContent = JSON.parse(tree.readContent('/angular.json'));
            expect(angularJsonContent.cli.schematicCollections).toContain('@criticalmanufacturing/ng-schematics');
        })

        it('should set service worker', async() => {
            const tree = await schematicRunner
                .runSchematicAsync('ng-add', ngAddOptions, appTree)
                .toPromise();
    
            const angularJsonContent = JSON.parse(tree.readContent('/angular.json'));
            const buildOptions = angularJsonContent.projects.application.architect.build.options;
            expect(buildOptions.serviceWorker).toBeTrue();
            expect(buildOptions.ngswConfigPath).toBe('application/ngsw-config.json');
        })
    
        it('should have webmanifest in assets', async () => {
            const tree = await schematicRunner
                .runSchematicAsync('ng-add', ngAddOptions, appTree)
                .toPromise();
    
            const angularJsonContent = JSON.parse(tree.readContent('/angular.json'));
            expect(angularJsonContent.projects.application.architect.build.options.assets).toContain('application/src/manifest.webmanifest');
            expect(angularJsonContent.projects.application.architect.test.options.assets).toContain('application/src/manifest.webmanifest');
        })
    
        it('should have lint architect', async () => {
            const tree = await schematicRunner
                .runSchematicAsync('ng-add', ngAddOptions, appTree)
                .toPromise();
    
            const angularJsonContent = JSON.parse(tree.readContent('/angular.json'));
            expect(angularJsonContent.projects.application.architect.lint).toBeDefined();
            expect(angularJsonContent.projects.application.architect.lint.builder).toBe('@angular-eslint/builder:lint');
            expect(angularJsonContent.projects.application.architect.lint.options.lintFilePatterns).toEqual(
                jasmine.arrayContaining([
                    'application/**/*.ts',
                    'application/**/*.html'
                ])
            );
        })
    })

    describe('- Generate package.json', () => {
        it('should have the lint script', async() => {
            const tree = await schematicRunner
                .runSchematicAsync('ng-add', ngAddOptions, appTree)
                .toPromise();
    
            const packageJsonContent = JSON.parse(tree.readContent('/package.json'));
            expect(packageJsonContent.scripts.lint).toBeDefined();
            expect(packageJsonContent.scripts.lint).toBe('ng lint');
        })

        it('should have core packages in the dependencies', async () => {
            const tree = await schematicRunner
                .runSchematicAsync('ng-add', ngAddOptions, appTree)
                .toPromise();

            const packageJsonContent = JSON.parse(tree.readContent('/package.json'));
            expect(Object.getOwnPropertyNames(packageJsonContent.dependencies)).toEqual(
                jasmine.arrayContaining([
                    'cmf-core',
                    'cmf-core-shell'
                ])
            );
        })
    });

    describe('- Generate tsconfig.json', () => {
        it('should have the skipLibCheck flags set to true', async() => {
            const tree = await schematicRunner
                .runSchematicAsync('ng-add', ngAddOptions, appTree)
                .toPromise();
    
            const tsConfigJsonContent = parse(tree.readContent('/tsconfig.json'));
            expect(tsConfigJsonContent.compilerOptions.skipLibCheck).toBeTrue();
        })
    });

    describe('- Generate index.html', () => {
        it('should have the link for manifest', async() => {
            const tree = await schematicRunner
                .runSchematicAsync('ng-add', ngAddOptions, appTree)
                .toPromise();
    
            const indexHtmlContent = tree.readContent('/application/src/index.html');
            expect(indexHtmlContent).toContain('<link rel="manifest" href="manifest.webmanifest">');
        })

        it('should have the meta for theme-color', async() => {
            const tree = await schematicRunner
                .runSchematicAsync('ng-add', ngAddOptions, appTree)
                .toPromise();
    
            const indexHtmlContent = tree.readContent('/application/src/index.html');
            expect(indexHtmlContent).toContain('<meta name="theme-color" content="#1976d2">');
        })

        it('should have the style themes', async() => {
            const tree = await schematicRunner
                .runSchematicAsync('ng-add', ngAddOptions, appTree)
                .toPromise();

            const styleRegExp = new RegExp(
                `<style id="initial-theme">(\r*\n*(\\s*))` +
                    `@import url\\("cmf\\.style\\.gray\\.css"\\);(\r*\n*(\\s*))` +
                    `@import url\\("cmf\\.style\\.dark\\.css"\\);(\r*\n*(\\s*))` +
                    `@import url\\("cmf\\.style\\.blue\\.css"\\);(\r*\n*(\\s*))` +
                `</style>`,
                'gm')
    
            const indexHtmlContent = tree.readContent('/application/src/index.html');
            expect(indexHtmlContent).toMatch(styleRegExp);
        })

        it('should have the loading ', async() => {
            const tree = await schematicRunner
                .runSchematicAsync('ng-add', ngAddOptions, appTree)
                .toPromise();

            const styleRegExp = new RegExp(
                `<div id="loading-container" class="cmf-loading-container">(\r*\n*(\\s*))` +
                    `<div class="cmf-loading-center">(\r*\n*(\\s*))` +
                        `<div class="cmf-loading-cmf-logo"></div>(\r*\n*(\\s*))` +
                        `<div class="cmf-loading-spinner"></div>(\r*\n*(\\s*))` +
                    `</div>(\r*\n*(\\s*))` +
                `</div>`,
                'gm')
    
            const indexHtmlContent = tree.readContent('/application/src/index.html');
            expect(indexHtmlContent).toMatch(styleRegExp);
        })

        it('should have the noscript', async() => {
            const tree = await schematicRunner
                .runSchematicAsync('ng-add', ngAddOptions, appTree)
                .toPromise();
    
            const indexHtmlContent = tree.readContent('/application/src/index.html');
            expect(indexHtmlContent).toContain('<noscript>Please enable JavaScript to continue using this application.</noscript>');
        })
    });

    describe('- Generate main.ts', () => {
        it('should import the loadApplicationConfig from cmf-core', async() => {
            const tree = await schematicRunner
                .runSchematicAsync('ng-add', ngAddOptions, appTree)
                .toPromise();
    
            const mainContent = tree.readContent('/application/src/main.ts');
            expect(mainContent).toContain(`import { loadApplicationConfig } from 'cmf-core';`);
        })

        it('should call loadApplicationConfig and import AppModule', async() => {
            const tree = await schematicRunner
                .runSchematicAsync('ng-add', ngAddOptions, appTree)
                .toPromise();

            const functionRegExp = new RegExp(
                `loadApplicationConfig\\('assets\/config\\.json'\\)\\.then\\(\\(\\) => {(\r*\n*(\\s*))` +
                    `import\\(\\/\\* webpackMode: "eager" \\*\\/'\\.\\/app\\/app\\.module'\\)\\.then\\(\\(m\\) => {(\r*\n*(\\s*))` +
                        `platformBrowserDynamic\\(\\)\\.bootstrapModule\\(m\\.AppModule\\)(\r*\n*(\\s*))` +
                        `\\.catch\\(err => console\\.error\\(err\\)\\);(\r*\n*(\\s*))` +
                    `}\\);(\r*\n*(\\s*))` +
                `}\\);`,
                'gm'
            );
    
            const mainContent = tree.readContent('/application/src/main.ts');
            expect(mainContent).toMatch(functionRegExp);
        })
    });

    describe('- Generate polyfills.ts', () => {
        it('should import @angular/localize/init', async() => {
            const tree = await schematicRunner
                .runSchematicAsync('ng-add', ngAddOptions, appTree)
                .toPromise();
    
            const polyfillContent = tree.readContent('/application/src/polyfills.ts');
            expect(polyfillContent).toContain(`import '@angular/localize/init';`);
        });
    });

    describe('- Generate App component', () => {
        it('should have the router-outlet', async() => {
            const tree = await schematicRunner
                .runSchematicAsync('ng-add', ngAddOptions, appTree)
                .toPromise();
    
            const appComponentHtmlContent = tree.readContent('/application/src/app/app.component.html');
            expect(appComponentHtmlContent).toEqual('<router-outlet></router-outlet>');
        })

        it('should import the CoreModule and CoreShellMetadataModule', async() => {
            const tree = await schematicRunner
                .runSchematicAsync('ng-add', ngAddOptions, appTree)
                .toPromise();
    
            const appModuleContent = tree.readContent('/application/src/app/app.module.ts');
            expect(appModuleContent).toContain(`import { CoreModule } from 'cmf-core';`);
            expect(appModuleContent).toContain(`import { CoreShellMetadataModule } from 'cmf-core-shell/metadata';`);

            const appModuleImports = appModuleContent.match(/imports: \[((\W|\w|\n|\r|\s)*)\]/gm)?.[0];
            expect(appModuleImports).not.toBeNull();
            expect(appModuleImports).toContain('CoreModule');
            expect(appModuleImports).toContain('CoreShellMetadataModule');
        })
    });
});