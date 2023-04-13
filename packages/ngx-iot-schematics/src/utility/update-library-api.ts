import { Rule, SchematicsException, Tree } from '@angular-devkit/schematics';
import { readWorkspace } from '@schematics/angular/utility';
import {
  createSourceFile,
  insertExport,
  relative,
  strings,
  getEntryFilePath
} from '@criticalmanufacturing/schematics-devkit';

import { Path, dirname, extname, join, normalize } from '@angular-devkit/core';

/**
 * Updates the designer and runtime public API with the new generated converters and tasks
 */
export function updateLibraryAPI(options: {
  project: string;
  converters: { name: string; path: string }[];
  tasks: { name: string; path: string }[];
}): Rule {
  return async (tree: Tree) => {
    const workspace = await readWorkspace(tree);
    const project = workspace.projects.get(options.project);

    if (!project) {
      throw new SchematicsException(`Project "${options.project}" does not exist.`);
    }

    const entryFile = getEntryFilePath(tree, project, '');

    if (!entryFile) {
      return;
    }

    const entryDir = dirname(normalize(entryFile));
    const designerEntryFile = createSourceFile(tree, entryFile);
    const runtimeEntryFile = createSourceFile(tree, join(entryDir, 'public-api-runtime.ts'));

    const converters: {
      name: string;
      converter: Path;
      designer: Path;
    }[] = [];

    options.converters.forEach(({ name, path }) => {
      const dasherizedName = strings.dasherize(name);

      converters.push({
        name: strings.classify(name),
        converter: join(normalize(path), `${dasherizedName}/${dasherizedName}.converter.ts`),
        designer: join(normalize(path), `${dasherizedName}/${dasherizedName}.converter-designer.ts`)
      });
    });

    converters.forEach(({ name, converter, designer }) => {
      if (runtimeEntryFile) {
        insertExport(
          runtimeEntryFile,
          `${name}Converter`,
          relative(entryDir, converter).replace(extname(converter), ''),
          false,
          `\n// ${name}`
        );
      }

      if (designerEntryFile) {
        insertExport(
          designerEntryFile,
          `${name}Converter`,
          relative(entryDir, converter).replace(extname(converter), ''),
          false,
          `\n// ${name}`
        );

        insertExport(
          designerEntryFile,
          `${name}Designer`,
          relative(entryDir, designer).replace(extname(designer), '')
        );
      }
    });

    const tasks: {
      name: string;
      module: Path;
      designer: Path;
      settings: Path;
    }[] = [];

    options.tasks.forEach(({ name, path }) => {
      const dasherizedName = strings.dasherize(name);

      tasks.push({
        name: strings.classify(name),
        module: join(normalize(path), `${dasherizedName}/${dasherizedName}.task-module.ts`),
        designer: join(normalize(path), `${dasherizedName}/${dasherizedName}.task-designer.ts`),
        settings: join(normalize(path), `${dasherizedName}/${dasherizedName}-settings.component.ts`)
      });
    });

    tasks.forEach(({ name, module, designer, settings }) => {
      if (runtimeEntryFile) {
        insertExport(
          runtimeEntryFile,
          `${name}Module`,
          relative(entryDir, module).replace(extname(module), ''),
          false,
          `\n// ${name}`
        );
      }

      if (designerEntryFile) {
        insertExport(
          designerEntryFile,
          `${name}Module`,
          relative(entryDir, module).replace(extname(module), ''),
          false,
          `\n// ${name}`
        );

        insertExport(
          designerEntryFile,
          `${name}Designer`,
          relative(entryDir, designer).replace(extname(designer), '')
        );

        insertExport(
          designerEntryFile,
          `${name}Settings`,
          relative(entryDir, settings).replace(extname(settings), '')
        );
      }
    });

    if (designerEntryFile) {
      tree.overwrite(join(normalize(project.root), entryFile), designerEntryFile.getFullText());
    }

    if (runtimeEntryFile) {
      tree.overwrite(
        join(normalize(project.root), dirname(normalize(entryFile)), 'public-api-runtime.ts'),
        runtimeEntryFile.getFullText()
      );
    }
  };
}
