import { getImportPath, getObjectProperty } from '@criticalmanufacturing/schematics-devkit';
import {
  ArrayLiteralExpression,
  ClassDeclaration,
  Identifier,
  SyntaxKind,
  Type,
  TypeFormatFlags,
  TypeQueryNode
} from 'ts-morph';

export type PropertyDescriptor = {
  name: string;
  docs: string;
  type: string;
};

export type DependencyDescriptor = {
  name: string;
  pkg: string;
};

export type DocData = {
  name: string;
  selector: string;
  inputs: PropertyDescriptor[];
  outputs: PropertyDescriptor[];
  components: DependencyDescriptor[];
  directives: DependencyDescriptor[];
  services: DependencyDescriptor[];
};

function getElementsOrDefault(array: ArrayLiteralExpression | undefined): string[] {
  return (
    array
      ?.getElements()
      .map((elem) =>
        (elem.asKind(SyntaxKind.StringLiteral)?.getLiteralValue() ?? elem.getText())
          .split(':')[0]
          .trim()
      ) ?? []
  );
}

function isDirectiveType(nodeType: Type): boolean {
  const classDec = nodeType
    .getSymbol()
    ?.getDeclarations()
    .find((dec) => dec.isKind(SyntaxKind.ClassDeclaration)) as ClassDeclaration | undefined;

  return classDec?.getProperty('ɵdir') != null || classDec?.getDecorator('Directive') != null;
}

function isComponentType(nodeType: Type): boolean {
  const classDec = nodeType
    .getSymbol()
    ?.getDeclarations()
    .find((dec) => dec.isKind(SyntaxKind.ClassDeclaration)) as ClassDeclaration | undefined;

  return classDec?.getProperty('ɵcmp') != null || classDec?.getDecorator('Component') != null;
}

function getModuleExport(nodeType: Type): Identifier | undefined {
  const classDec = nodeType
    .getSymbol()
    ?.getDeclarations()
    .find((dec) => dec.isKind(SyntaxKind.ClassDeclaration)) as ClassDeclaration | undefined;

  const moduleTypeMeta = classDec?.getProperty('ɵmod');
  if (moduleTypeMeta) {
    return (
      moduleTypeMeta
        .getTypeNode()
        ?.asKind(SyntaxKind.TypeReference)
        ?.getTypeArguments()[3]
        ?.asKind(SyntaxKind.TupleType)
        ?.getElements()
        .find((e) => {
          const name = e
            .asKind(SyntaxKind.TypeQuery)
            ?.getExprName()
            .getText()
            .replace(/(Directive|Component)$/, '');

          // assume component/directive and module have similar names
          return name && classDec!.getName()?.startsWith(name);
        }) as TypeQueryNode | undefined
    )?.getExprName() as Identifier | undefined;
  } else {
    const moduleDec = classDec?.getDecorator('NgModule');
    if (moduleDec) {
      const moduleMeta = moduleDec.getArguments()[0].asKind(SyntaxKind.ObjectLiteralExpression);

      if (moduleMeta) {
        return getObjectProperty(moduleMeta, 'declarations')
          ?.asKind(SyntaxKind.PropertyAssignment)
          ?.getInitializer()
          ?.asKind(SyntaxKind.ArrayLiteralExpression)
          ?.getElements()
          .find((e) => classDec!.getName()?.includes(e.getText())) as Identifier | undefined;
      }
    }
  }
}

function parseClassProperties(classDec: ClassDeclaration): Pick<DocData, 'inputs' | 'outputs'> {
  const docData: Pick<DocData, 'inputs' | 'outputs'> = {
    inputs: [],
    outputs: []
  };

  const decoratorProps = classDec
    .getDecorator('Component')
    ?.getArguments()[0]
    .asKind(SyntaxKind.ObjectLiteralExpression);

  if (!decoratorProps) {
    return docData;
  }

  // fetch inputs / outputs from the component decorator metadata
  const decInputs = getElementsOrDefault(
    getObjectProperty(decoratorProps, 'inputs')
      ?.asKind(SyntaxKind.PropertyAssignment)
      ?.getInitializer()
      ?.asKind(SyntaxKind.ArrayLiteralExpression)
  );
  const decOutputs = getElementsOrDefault(
    getObjectProperty(decoratorProps, 'outputs')
      ?.asKind(SyntaxKind.PropertyAssignment)
      ?.getInitializer()
      ?.asKind(SyntaxKind.ArrayLiteralExpression)
  );

  // fetch inputs outputs from the component class properties
  classDec.getProperties().forEach((prop) => {
    const initializerExpression = prop
      .getInitializer()
      ?.asKind(SyntaxKind.CallExpression)
      ?.getExpression()
      .getText();

    let kind: 'inputs' | 'outputs' | undefined;
    if (
      prop.getDecorator('Input') ||
      decInputs?.includes(prop.getName()) ||
      initializerExpression === 'input'
    ) {
      kind = 'inputs';
    }

    if (
      prop.getDecorator('Output') ||
      decOutputs?.includes(prop.getName()) ||
      initializerExpression === 'output'
    ) {
      kind = 'outputs';
    }

    if (kind != null) {
      let realType = prop.getType();

      if (initializerExpression) {
        realType = realType.getTypeArguments()[0];
      }

      docData[kind].push({
        name: prop.getName(),
        docs: prop.getJsDocs()[0]?.getCommentText() ?? '',
        type: realType
          .getApparentType()
          .getText(prop, TypeFormatFlags.UseAliasDefinedOutsideCurrentScope)
      });
    }
  });

  return docData;
}

function parseClassServices(
  classDec: ClassDeclaration,
  project: string
): Pick<DocData, 'services'> {
  const docData: Pick<DocData, 'services'> = { services: [] };

  classDec.getProperties().forEach((prop) => {
    const initializerExpression = prop
      .getInitializer()
      ?.asKind(SyntaxKind.CallExpression)
      ?.getExpression()
      .getText();

    // fetch inject services
    if (initializerExpression === 'inject') {
      const callExpArg = prop
        .getInitializerOrThrow()
        .asKindOrThrow(SyntaxKind.CallExpression)
        .getArguments()[0];

      const importPath = getImportPath(callExpArg) ?? '';

      if (!importPath || importPath.startsWith('.') || importPath.startsWith('cmf-')) {
        docData.services.push({
          name: prop.getType().getText(prop, TypeFormatFlags.UseAliasDefinedOutsideCurrentScope),
          pkg: importPath.startsWith('.') ? project : importPath
        });
      }
    }
  });

  classDec.getConstructors().forEach((constructorDec) => {
    constructorDec.getParameters().forEach((param) => {
      const type = param.getTypeNode();

      if (!type) {
        return;
      }

      const importPath = getImportPath(type) ?? '';

      if (!importPath || importPath.startsWith('.') || importPath.startsWith('cmf-')) {
        docData.services.push({
          name: param.getType().getText(param, TypeFormatFlags.UseAliasDefinedOutsideCurrentScope),
          pkg: importPath.startsWith('.') ? project : importPath
        });
      }
    });
  });

  return docData;
}

function parseClassImports(
  classDec: ClassDeclaration,
  project: string
): Pick<DocData, 'components' | 'directives'> {
  const docData: Pick<DocData, 'components' | 'directives'> = { components: [], directives: [] };
  const decObj = classDec
    .getDecorator('Component')
    ?.getArguments()[0]
    ?.asKind(SyntaxKind.ObjectLiteralExpression);

  if (!decObj) {
    return docData;
  }

  let imports = getObjectProperty(decObj, 'imports')
    ?.asKind(SyntaxKind.PropertyAssignment)
    ?.getInitializer()
    ?.asKind(SyntaxKind.ArrayLiteralExpression);

  if (!imports) {
    const ngModuleClass = classDec.getSourceFile().getClass((_classDec) => {
      return (
        _classDec
          .getDecorator('NgModule')
          ?.getArguments()[0]
          .asKind(SyntaxKind.ObjectLiteralExpression)
          ?.getProperty('declarations')
          ?.asKind(SyntaxKind.PropertyAssignment)
          ?.getInitializer()
          ?.asKind(SyntaxKind.ArrayLiteralExpression)
          ?.getElements()
          .some((e) => e.getText() === classDec.getName()) === true
      );
    });

    imports = ngModuleClass
      ?.getDecorator('NgModule')
      ?.getArguments()[0]
      .asKind(SyntaxKind.ObjectLiteralExpression)
      ?.getProperty('imports')
      ?.asKind(SyntaxKind.PropertyAssignment)
      ?.getInitializer()
      ?.asKind(SyntaxKind.ArrayLiteralExpression);
  }

  imports?.getElements().forEach((node) => {
    const type = node.getType();

    if (!type) {
      return;
    }

    const importNode = getModuleExport(type) ?? node;
    let importPath = getImportPath(node) ?? '';

    let kind: 'directives' | 'components' | undefined = isDirectiveType(importNode.getType())
      ? 'directives'
      : isComponentType(importNode.getType())
        ? 'components'
        : undefined;
    let name = importNode.getText();

    if (!kind) {
      // if unable to determine the import type, lets default to component
      kind = 'components';
      name = name.replace(/Module$/, '');
    }

    if (!importPath || importPath.startsWith('.') || importPath.startsWith('cmf-')) {
      docData[kind].push({
        name: importNode.getText().replace(/Module$/, ''),
        pkg: importPath.startsWith('.') ? project : importPath
      });
    }
  });

  return docData;
}

export function parseClassDoc(classDec: ClassDeclaration, project: string): DocData {
  const docData = {
    name: classDec.getName(),
    selector: '',
    inputs: [],
    outputs: [],
    components: [],
    directives: [],
    services: []
  } as DocData;

  const decObj = classDec
    .getDecorator('Component')
    ?.getArguments()[0]
    ?.asKind(SyntaxKind.ObjectLiteralExpression);

  if (decObj) {
    docData.selector =
      getObjectProperty(decObj, 'selector')
        ?.asKind(SyntaxKind.PropertyAssignment)
        ?.getInitializer()
        ?.asKind(SyntaxKind.StringLiteral)
        ?.getLiteralText() ?? '';
  }

  Object.assign(docData, parseClassProperties(classDec));
  Object.assign(docData, parseClassServices(classDec, project));
  Object.assign(docData, parseClassImports(classDec, project));

  return docData;
}
