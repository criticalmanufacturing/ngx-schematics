import { Rule, Tree } from '@angular-devkit/schematics';
import { SyntaxKind } from 'ts-morph';
import {
  addSymbolToArrayLiteral,
  getObjectProperty,
  insertImport,
  removeImport,
  removeSymbolFromArrayLiteral
} from '@criticalmanufacturing/schematics-devkit';
import { join, normalize, dirname } from '@angular-devkit/core';
import { Schema } from '../schema.js';
import {
  CORE_BASE_PROVIDE,
  MES_BASE_PROVIDE,
  METADATA_ROUTING_PROVIDE
} from '../package-configs.js';
import { getAppConfig } from '../../utility/app-config.js';
import { updateServiceWorker } from '../../migrations/update-1-2-0/update-service-worker.js';
import { removeZoneEventCoalescing } from './remove-zone-event-coalescing.js';

/**
 * Updates the application config providers base on the provided application type
 */
export function updateAppConfig(options: {
  application: Schema['application'];
  project: string;
}): Rule {
  return async (tree: Tree) => {
    const appConfig = await getAppConfig(tree, options.project);

    if (!appConfig) {
      return;
    }

    const arrLiteral = getObjectProperty(appConfig, 'providers')
      ?.asKind(SyntaxKind.PropertyAssignment)
      ?.getInitializerIfKind(SyntaxKind.ArrayLiteralExpression);

    if (!arrLiteral) {
      return;
    }

    if (options.application === 'MES') {
      addSymbolToArrayLiteral(arrLiteral, '\n' + MES_BASE_PROVIDE[1]);
      insertImport(
        arrLiteral.getSourceFile(),
        MES_BASE_PROVIDE[1].replace(/\(\)$/, ''),
        MES_BASE_PROVIDE[0]
      );
    } else {
      addSymbolToArrayLiteral(arrLiteral, '\n' + CORE_BASE_PROVIDE[1]);
      insertImport(
        arrLiteral.getSourceFile(),
        CORE_BASE_PROVIDE[1].replace(/\(\)$/, ''),
        CORE_BASE_PROVIDE[0]
      );
    }

    addSymbolToArrayLiteral(arrLiteral, '\n' + METADATA_ROUTING_PROVIDE[1] + '\n');
    insertImport(
      arrLiteral.getSourceFile(),
      METADATA_ROUTING_PROVIDE[1].replace(/\(\)$/, ''),
      METADATA_ROUTING_PROVIDE[0]
    );

    removeImport(arrLiteral.getSourceFile(), 'routes', './app.routes');
    removeImport(arrLiteral.getSourceFile(), 'provideRouter', '@angular/router');
    removeSymbolFromArrayLiteral(arrLiteral, 'provideRouter(routes)');

    const routesFile = join(
      dirname(normalize(arrLiteral.getSourceFile().getFilePath())),
      'app.routes.ts'
    );

    if (tree.exists(routesFile)) {
      tree.delete(routesFile);
    }

    updateServiceWorker(arrLiteral);

    removeZoneEventCoalescing(appConfig.getSourceFile());

    arrLiteral.getSourceFile().formatText({ indentSize: 2 });
    tree.overwrite(
      arrLiteral.getSourceFile().getFilePath(),
      arrLiteral.getSourceFile().getFullText()
    );
  };
}
