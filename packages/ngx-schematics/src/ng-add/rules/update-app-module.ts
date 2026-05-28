import { Rule, Tree } from '@angular-devkit/schematics';
import { createSourceFile } from '@criticalmanufacturing/schematics-devkit';
import {
  CORE_BASE_PROVIDE,
  MES_BASE_PROVIDE,
  METADATA_ROUTING_PROVIDE
} from '../package-configs.js';
import { Schema } from '../schema.js';
import { addSymbolToNgModuleMetadata, getAppModulePath } from '../../utility/ng-module.js';
import { updateServiceWorker } from '../../migrations/update-1-2-0/update-service-worker.js';
import { removeZoneEventCoalescing } from './remove-zone-event-coalescing.js';

/**
 * Updates app module adding the desired package modules
 */
export function updateAppModule(options: {
  application: Schema['application'];
  project: string;
}): Rule {
  return async (tree: Tree) => {
    const appModulePath = await getAppModulePath(tree, options.project);

    if (!appModulePath) {
      return;
    }

    // add imports
    const source = createSourceFile(tree, appModulePath);

    if (!source) {
      return;
    }

    if (options.application === 'MES') {
      addSymbolToNgModuleMetadata(source, 'providers', MES_BASE_PROVIDE[1], MES_BASE_PROVIDE[0]);
    } else {
      addSymbolToNgModuleMetadata(source, 'providers', CORE_BASE_PROVIDE[1], CORE_BASE_PROVIDE[0]);
    }

    addSymbolToNgModuleMetadata(
      source,
      'providers',
      METADATA_ROUTING_PROVIDE[1],
      METADATA_ROUTING_PROVIDE[0]
    );

    updateServiceWorker(source);

    removeZoneEventCoalescing(source);

    source.formatText({ indentSize: 2 });
    tree.overwrite(source.getFilePath(), source.getFullText());

    return;
  };
}
