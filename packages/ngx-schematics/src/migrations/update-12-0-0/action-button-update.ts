import { join, normalize, relative } from '@angular-devkit/core';
import { Rule, Tree } from '@angular-devkit/schematics';
import { readWorkspace } from '@schematics/angular/utility';
import {
  ASTWithSource,
  LiteralPrimitive,
  parseTemplate,
  TmplAstElement,
  TmplAstRecursiveVisitor
} from '@angular/compiler';

const ACTION_BUTTON_SELECTORS = [
  'cmf-core-controls-actionButton',
  'cmf-core-controls-actionButtonGroup'
];
const MORE_OPTIONS_PLACEMENT = 'placement="MORE_OPTIONS"';
const STANDARD_PLACEMENT = 'placement="STANDARD"';

/** Describes a text replacement within an Angular template. */
interface Replacement {
  start: number;
  end: number;
  value: string;
}

/** Collects lessRelevant bindings that must be replaced on supported action button elements. */
class ActionButtonVisitor extends TmplAstRecursiveVisitor {
  readonly replacements: Replacement[] = [];

  /**
   * Creates a visitor for a template.
   * @param content Original template content used to preserve formatting and attribute syntax.
   */
  constructor(private readonly content: string) {
    super();
  }

  /**
   * Records replacements for literal boolean lessRelevant bindings.
   * @param element Angular template element being visited.
   */
  override visitElement(element: TmplAstElement): void {
    if (ACTION_BUTTON_SELECTORS.includes(element.name)) {
      for (const input of element.inputs) {
        const attributeText = this.content.slice(
          input.sourceSpan.start.offset,
          input.sourceSpan.end.offset
        );

        if (
          input.name === 'lessRelevant' &&
          input.value instanceof ASTWithSource &&
          input.value.ast instanceof LiteralPrimitive &&
          typeof input.value.ast.value === 'boolean' &&
          /^\[lessRelevant\]\s*=/.test(attributeText)
        ) {
          this.replacements.push({
            start: input.sourceSpan.start.offset,
            end: input.sourceSpan.end.offset,
            value: input.value.ast.value ? MORE_OPTIONS_PLACEMENT : STANDARD_PLACEMENT
          });
        }
      }
    }

    super.visitElement(element);
  }
}

/**
 * Replaces literal lessRelevant bindings in action buttons and action button groups.
 * A value of true becomes placement="MORE_OPTIONS" and false becomes placement="STANDARD".
 *
 * @param options Migration options.
 * @param options.path Workspace-relative path containing the Angular projects to migrate.
 * @returns A rule that updates matching Angular HTML templates.
 */
export function updateActionButtonPlacement(options: { path: string }): Rule {
  return async (tree: Tree) => {
    const workspace = await readWorkspace(tree);
    const migrationRoot = join(normalize('/'), normalize(options.path ?? './'));

    for (const project of workspace.projects.values()) {
      const projectRoot = join(
        normalize('/'),
        normalize((project.root || project.sourceRoot) ?? '')
      );

      if (relative(migrationRoot, projectRoot).startsWith('..')) {
        continue;
      }

      tree.getDir(projectRoot).visit((path) => {
        if (!path.endsWith('.html') || path.split('/').includes('node_modules')) {
          return;
        }

        const content = tree.readText(path);
        const template = parseTemplate(content, path, { preserveWhitespaces: true });

        if (template.errors) {
          return;
        }

        const visitor = new ActionButtonVisitor(content);
        template.nodes.forEach((node) => node.visit(visitor));

        if (visitor.replacements.length === 0) {
          return;
        }

        const updatedContent = visitor.replacements
          .sort((left, right) => right.start - left.start)
          .reduce(
            (result, replacement) =>
              result.slice(0, replacement.start) +
              replacement.value +
              result.slice(replacement.end),
            content
          );

        tree.overwrite(path, updatedContent);
      });
    }
  };
}
