import { Rule, Tree } from '@angular-devkit/schematics';
import {
  addSymbolToNgModuleMetadata,
  createSourceFile
} from '../../utility/ast';
import { getAppModulePath } from '../../utility/workspace';
import {
  CORE_BASE_MODULE,
  MES_BASE_MODULE,
  METADATA_ROUTING_MODULE
} from '../package-configs';
import { Schema } from '../schema';

/**
 * Updates app module adding the desired package modules
 */
export function updateAppModule(options: {
  application: Schema['application'];
}): Rule {
  return async (tree: Tree) => {
    const appModulePath = await getAppModulePath(tree);

    if (!appModulePath) {
      return;
    }

    // add imports
    const source = createSourceFile(tree, appModulePath);

    if (!source) {
      return;
    }

    if (options.application === 'MES') {
      addSymbolToNgModuleMetadata(
        source,
        'imports',
        MES_BASE_MODULE[1],
        MES_BASE_MODULE[0]
      );
    } else {
      addSymbolToNgModuleMetadata(
        source,
        'imports',
        CORE_BASE_MODULE[1],
        CORE_BASE_MODULE[0]
      );
    }

    addSymbolToNgModuleMetadata(
      source,
      'imports',
      METADATA_ROUTING_MODULE[1],
      METADATA_ROUTING_MODULE[0]
    );

    source.formatText();
    tree.overwrite(appModulePath, source.getFullText());

    return;
  };
}
