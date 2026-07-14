import { Rule, Tree } from '@angular-devkit/schematics';
import { readWorkspace } from '@schematics/angular/utility';
import { join, normalize } from 'path';
import { SyntaxKind, ObjectLiteralExpression } from 'ts-morph';
import {
  getObjectProperty,
  addSymbolToArrayLiteral,
  createSourceFile
} from '@criticalmanufacturing/schematics-devkit';

// Disable rules that commonly fire in generated IoT library code
const TS_RULES_TO_DISABLE: Record<string, string> = {
  '@angular-eslint/prefer-on-push-component-change-detection': 'warn',
  '@typescript-eslint/no-explicit-any': 'off'
};

/**
 * Adds "*.d.ts" to ignorePatterns and disables common IoT rules in the project's eslint.config.js
 */
export function updateEslintConfig(options: { project: string }): Rule {
  return async (tree: Tree) => {
    const workspace = await readWorkspace(tree);
    const project = workspace.projects.get(options.project);

    if (!project) {
      return;
    }

    const eslintConfigPath = join(normalize(project.root), 'eslint.config.js');

    if (!tree.exists(eslintConfigPath)) {
      return;
    }

    const source = createSourceFile(tree, eslintConfigPath);
    if (!source) {
      return;
    }

    // Find the defineConfig([...]) call
    const defineConfigCall = source
      .getDescendantsOfKind(SyntaxKind.CallExpression)
      .find((call) => call.getExpression().getText() === 'defineConfig');

    if (!defineConfigCall) {
      return;
    }

    const arrayArg = defineConfigCall.getArguments()[0]?.asKind(SyntaxKind.ArrayLiteralExpression);
    if (!arrayArg) {
      return;
    }

    // Exclude compiled declaration files — merge into existing ignores block if present
    const ignoresBlock = arrayArg
      .getElements()
      .map((elem) => elem.asKind(SyntaxKind.ObjectLiteralExpression))
      .filter((obj): obj is ObjectLiteralExpression => obj != null)
      .find((obj) => getObjectProperty(obj, 'ignores') != null);

    if (!ignoresBlock) {
      addSymbolToArrayLiteral(arrayArg, `{ ignores: ['**/*.d.ts'] }`);
    } else {
      const ignoresArray = getObjectProperty(ignoresBlock, 'ignores')
        ?.asKind(SyntaxKind.PropertyAssignment)
        ?.getInitializerIfKind(SyntaxKind.ArrayLiteralExpression);

      if (
        ignoresArray &&
        !ignoresArray.getElements().some((e) => e.getText().replace(/['"]/g, '') === '**/*.d.ts')
      ) {
        ignoresArray.insertElement(ignoresArray.getElements().length, `'**/*.d.ts'`);
      }
    }

    const tsFilesBlock = arrayArg
      .getElements()
      .map((elem) => elem.asKind(SyntaxKind.ObjectLiteralExpression))
      .filter((obj): obj is ObjectLiteralExpression => obj != null)
      .find((obj) => {
        const filesProp = getObjectProperty(obj, 'files')
          ?.asKind(SyntaxKind.PropertyAssignment)
          ?.getInitializerIfKind(SyntaxKind.ArrayLiteralExpression);
        return (
          filesProp?.getElements().some((e) => e.getText().replace(/['"]/g, '') === '**/*.ts') ??
          false
        );
      });

    if (!tsFilesBlock) {
      const rulesEntries = Object.entries(TS_RULES_TO_DISABLE)
        .map(([k, v]) => `'${k}': '${v}'`)
        .join(', ');
      addSymbolToArrayLiteral(arrayArg, `{ files: ['**/*.ts'], rules: { ${rulesEntries} } }`);
    } else {
      const rulesObj = getObjectProperty(tsFilesBlock, 'rules')
        ?.asKind(SyntaxKind.PropertyAssignment)
        ?.getInitializerIfKind(SyntaxKind.ObjectLiteralExpression);

      if (rulesObj) {
        for (const [rule, value] of Object.entries(TS_RULES_TO_DISABLE)) {
          if (
            !getObjectProperty(rulesObj, `'${rule}'`) &&
            !getObjectProperty(rulesObj, `"${rule}"`)
          ) {
            rulesObj.addPropertyAssignment({ name: `'${rule}'`, initializer: `'${value}'` });
          }
        }
      }
    }

    source.formatText();
    tree.overwrite(eslintConfigPath, source.getFullText());
  };
}
