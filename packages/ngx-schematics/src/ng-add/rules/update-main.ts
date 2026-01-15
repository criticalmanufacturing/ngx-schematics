import { Tree } from '@angular-devkit/schematics';
import { SyntaxKind } from 'ts-morph';
import {
  createSourceFile,
  insertImport,
  getMainPath
} from '@criticalmanufacturing/schematics-devkit';

/**
 * Updates main.ts file adding the load config method
 */
export function updateMain(options: { project: string }) {
  return async (host: Tree) => {
    const mainPath = await getMainPath(host, options.project);

    if (!mainPath) {
      return;
    }

    // add imports
    const source = createSourceFile(host, mainPath);

    if (!source) {
      return;
    }

    const loadAppConfigCall = source
      .getDescendantsOfKind(SyntaxKind.CallExpression)
      .find((node) => node.getExpression().getText().endsWith('loadApplicationConfig'));

    // already added -> nothing to do
    if (loadAppConfigCall) {
      return;
    }

    const bootstrapCall = source.getDescendantsOfKind(SyntaxKind.CallExpression).find((node) => {
      const name = node.getExpression().getText();
      return name.endsWith('bootstrapModule') || name.endsWith('bootstrapApplication');
    });

    if (!bootstrapCall) {
      return;
    }

    const bootstrapStatement = bootstrapCall.getFirstAncestorByKind(SyntaxKind.ExpressionStatement);
    const moduleIdentifier = bootstrapCall.getExpression().getText().endsWith('bootstrapModule')
      ? bootstrapCall.getArguments()[0]?.asKind(SyntaxKind.Identifier)
      : bootstrapCall.getArguments()[1]?.asKind(SyntaxKind.Identifier);

    if (!bootstrapStatement || !moduleIdentifier) {
      return;
    }

    // remove app module import declaration
    const appImport = source
      .getDescendantsOfKind(SyntaxKind.Identifier)
      .filter((node) => node.getText() === moduleIdentifier.getText())
      .find((node) => node.getFirstAncestorByKind(SyntaxKind.ImportDeclaration))
      ?.getFirstAncestorByKindOrThrow(SyntaxKind.ImportDeclaration);

    const appModulePath = appImport?.getModuleSpecifierValue();
    appImport?.remove();

    // add load application config statement
    bootstrapStatement.replaceWithText(`\
loadApplicationConfig('assets/config.json').then(() => {
    import(/* webpackMode: "eager" */ '${appModulePath ?? './app/app.module'}').then(({ ${moduleIdentifier.getText()} }) => {
        ${bootstrapStatement.getText(true)}
    });
});`);

    insertImport(source, 'loadApplicationConfig', 'cmf-core/init');

    source.formatText({ indentSize: 2 });

    host.overwrite(mainPath, source.getFullText());
  };
}
