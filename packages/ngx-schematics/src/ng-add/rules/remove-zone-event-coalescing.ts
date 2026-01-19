import { SourceFile, SyntaxKind } from 'ts-morph';

/**
 * Removes arguments from provideZoneChangeDetection calls to disable zone event coalescing.
 * @param sourceFile source file to edit
 */
export function removeZoneEventCoalescing(sourceFile: SourceFile): void {
  sourceFile
    .getDescendantsOfKind(SyntaxKind.CallExpression)
    ?.filter((callExpr) => callExpr.getExpression().getText() === 'provideZoneChangeDetection')
    ?.forEach((callExpr) => callExpr.removeArgument(0));
}
