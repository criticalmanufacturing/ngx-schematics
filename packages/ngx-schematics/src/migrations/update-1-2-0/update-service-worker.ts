import { Node, SyntaxKind, ts } from 'ts-morph';

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
export function updateServiceWorker(source: Node<ts.Node>): void {
  const callExp = source
    .getFirstDescendant((node) => {
      if (!node.isKind(SyntaxKind.CallExpression)) {
        return false;
      }

      const expressionText = node.getExpression().getText();

      return (
        expressionText === 'ServiceWorkerModule.register' ||
        expressionText === 'provideServiceWorker'
      );
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

  callExp.getPreviousSiblingIfKind(SyntaxKind.CommaToken)?.appendWhitespace('\n');
}
