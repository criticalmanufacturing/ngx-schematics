import { chain, Rule, Tree } from '@angular-devkit/schematics';
import { readWorkspace, ProjectDefinition } from '@schematics/angular/utility';
import { getDefaultPath, tryGetRoot } from '@criticalmanufacturing/schematics-devkit';
import { isAbsolute, join, normalize, relative } from '@angular-devkit/core';
import { Project } from 'ts-morph';
import { Schema } from './schema.js';
import { DependencyDescriptor, PropertyDescriptor, DocData, parseClassDoc } from './doc-parser.js';

function getPropsTemplate(props: PropertyDescriptor[]) {
  return props.map((prop) => `* \`${prop.type}\` : **${prop.name}** - ${prop.docs}`).join('\n');
}

function getDependenciesTemplate(dependencies: DependencyDescriptor[]) {
  return dependencies.map((prop) => `* ${prop.name} : \`${prop.pkg}\``).join('\n');
}

function getPropertiesString(docData: DocData): string {
  const props = docData.inputs
    .map((input) => `[${input.name}]="${input.name}"`)
    .concat(
      docData.outputs.map(
        (output) =>
          `(${output.name})="on${output.name.charAt(0).toUpperCase() + output.name.slice(1)}($event)"`
      )
    );

  return props.length > 0 ? '\n    ' + props.join('\n    ') : '';
}

function writeDoc(docData: DocData): string {
  return `\
@whatItDoes

Please provide a meaningful description of this component
Try to answer these questions:
* What is it?
* What it does?
* How does it behave with different sizes?
* Does it retrieve data from any external source (server, local database, text file, etc...)?

@howToUse

This component is used with the inputs and outputs mentioned below.

Besides the description above, please complement it with a meaningful description of this component that answer these questions:
* How to use it?
* Where and When to use it?

### Inputs
${getPropsTemplate(docData.inputs) || '_This component has no inputs_'}

### Outputs
${getPropsTemplate(docData.outputs) || '_This component has no outputs_'}

### Example
To use the component, assume this HTML Template as an example:

\`\`\`HTML
<${docData.selector}${getPropertiesString(docData)}>
</${docData.selector}>
\`\`\`

### _NOTES_
(optional, Provide additional notes here)

@description

## ${docData.name} Component

### Dependencies

#### Components
${getDependenciesTemplate(docData.components) || '_This component has no child components_'}

#### Services
${getDependenciesTemplate(docData.services) || '_This component has no services_'}

#### Directives
${getDependenciesTemplate(docData.directives) || '_This component has no directives_'}`;
}

function updateDoc(options: Schema) {
  return async (tree: Tree) => {
    const workspace = await readWorkspace(tree);
    let project: ProjectDefinition | undefined;
    let projectName: string | undefined;

    const root = tryGetRoot();

    if (!root) {
      return;
    }

    if (isAbsolute(normalize(options.file))) {
      if (!options.file.startsWith(root)) {
        return;
      }

      options.file = options.file.slice(root.length);
    }

    const filePath = join(normalize(root), options.file);
    const relPath = relative(normalize(root), filePath).replace(/^\.\//, '');

    [projectName, project] =
      Array.from(workspace.projects).find(
        ([, def]) =>
          def.extensions['projectType'] === 'library' &&
          relPath.startsWith((def.root ?? getDefaultPath(def)) + '/')
      ) ?? [];

    const tsConfig = project?.targets.get('build')?.configurations?.['development']?.['tsConfig'];

    if (typeof tsConfig !== 'string' || !root || !projectName) {
      return;
    }

    const source = new Project({
      tsConfigFilePath: join(normalize(root), tsConfig)
    }).getSourceFile(filePath);

    if (!source) {
      return;
    }

    source.getClasses().forEach((classDec) => {
      const compDec = classDec.getDecorator('Component');

      if (!compDec) {
        return;
      }

      const docData = parseClassDoc(classDec, projectName!);

      classDec.getJsDocs()[0]?.remove();
      classDec.addJsDoc(writeDoc(docData));
    });

    tree.overwrite(options.file, source.getFullText());
  };
}

export default function (_options: Schema): Rule {
  return () => {
    return chain([updateDoc(_options)]);
  };
}
