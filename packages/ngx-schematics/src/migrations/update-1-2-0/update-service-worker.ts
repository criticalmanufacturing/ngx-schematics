import { SourceFile, SyntaxKind } from 'ts-morph';

export const SW_ASSETS = [
  {
    glob: '**/*',
    input: 'node_modules/cmf-core/assets/js',
    output: ''
  }
];

/**
 * Updates the service worker module register value to use our custom service worker.
 * @param file source file to edit
 */
export function updateServiceWorker(source: SourceFile): void {
  const callExp = source
    .getFirstDescendant((node) => {
      if (!node.isKind(SyntaxKind.CallExpression)) {
        return false;
      }

      return node.getExpression().getText() === 'ServiceWorkerModule.register';
    })
    ?.asKind(SyntaxKind.CallExpression);

  if (!callExp) {
    return;
  }

  const swPathNode = callExp.getArguments()[0]?.asKind(SyntaxKind.StringLiteral);

  if (!swPathNode || swPathNode.getLiteralText() !== 'ngsw-worker.js') {
    return;
  }

  swPathNode.replaceWithText(`'ngsw-loader-worker.js'`);
}
