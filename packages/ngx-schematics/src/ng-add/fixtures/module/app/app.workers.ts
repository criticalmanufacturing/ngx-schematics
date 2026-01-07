/// <reference types="monaco-editor" />

self.MonacoEnvironment = {
  getWorker: (_: string, label: string) => {
    if (label === 'json') {
      return new Worker(
        new URL(
          '../../../node_modules/monaco-editor/esm/vs/language/json/json.worker.js',
          import.meta.url
        )
      );
    }
    if (label === 'css' || label === 'scss' || label === 'less') {
      return new Worker(
        new URL(
          '../../../node_modules/monaco-editor/esm/vs/language/css/css.worker.js',
          import.meta.url
        )
      );
    }
    if (label === 'html' || label === 'handlebars' || label === 'razor') {
      return new Worker(
        new URL(
          '../../../node_modules/monaco-editor/esm/vs/language/html/html.worker.js',
          import.meta.url
        )
      );
    }
    if (label === 'typescript' || label === 'javascript') {
      return new Worker(
        new URL(
          '../../../node_modules/monaco-editor/esm/vs/language/typescript/ts.worker.js',
          import.meta.url
        )
      );
    }
    return new Worker(
      new URL(
        '../../../node_modules/monaco-editor/esm/vs/editor/editor.worker.js',
        import.meta.url
      )
    );
  }
};
