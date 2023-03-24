import { SchematicContext, Tree } from '@angular-devkit/schematics';
import { SyntaxKind } from 'ts-morph';
import { createSourceFile, insertImport } from '../../utility/ast';
import { getMainPath } from '../../utility/workspace';

/**
 * Updates main.ts file adding the load config method
 */
export function updateMain() {
  return async (host: Tree, _context: SchematicContext) => {
    const mainPath = await getMainPath(host);

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
      .find((node) =>
        node.getExpression().getText().endsWith('loadApplicationConfig')
      );

    // already added -> nothing to do
    if (loadAppConfigCall) {
      return;
    }

    const bootstrapCall = source
      .getDescendantsOfKind(SyntaxKind.CallExpression)
      .find((node) =>
        node.getExpression().getText().endsWith('bootstrapModule')
      );

    if (!bootstrapCall) {
      return;
    }

    const bootstrapStatement = bootstrapCall.getFirstAncestorByKind(
      SyntaxKind.ExpressionStatement
    );
    const moduleIdentifier = bootstrapCall
      .getArguments()[0]
      ?.asKind(SyntaxKind.Identifier);

    if (!bootstrapStatement || !moduleIdentifier) {
      return;
    }

    // remove app module import declaration
    source
      .getDescendantsOfKind(SyntaxKind.Identifier)
      .filter((node) => node.getText() === moduleIdentifier.getText())
      .find((node) => node.getFirstAncestorByKind(SyntaxKind.ImportDeclaration))
      ?.getFirstAncestorByKindOrThrow(SyntaxKind.ImportDeclaration)
      .remove();

    // add load application config statement
    moduleIdentifier.replaceWithText(`m.${moduleIdentifier.getText()}`);
    bootstrapStatement.replaceWithText(`\
loadApplicationConfig('assets/config.json').then(() => {
    import(/* webpackMode: "eager" */'./app/app.module').then((m) => {
        ${bootstrapStatement.getText(true)}
    });
});`);

    insertImport(source, 'loadApplicationConfig', 'cmf-core/init');

    source.formatText({ indentSize: 2 });

    host.overwrite(mainPath, source.getFullText());
  };
}
