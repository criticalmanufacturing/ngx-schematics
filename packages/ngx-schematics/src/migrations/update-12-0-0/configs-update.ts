import { chain, Rule } from '@angular-devkit/schematics';
import {
  updateAppBuildTarget,
  updateTsConfig
} from '@criticalmanufacturing/schematics-devkit/rules';

const JQUERY_UI_SCRIPTS = [
  'node_modules/jquery-ui/ui/version.js',
  'node_modules/jquery-ui/ui/data.js',
  'node_modules/jquery-ui/ui/plugin.js',
  'node_modules/jquery-ui/ui/scroll-parent.js',
  'node_modules/jquery-ui/ui/safe-active-element.js',
  'node_modules/jquery-ui/ui/unique-id.js',
  'node_modules/jquery-ui/ui/focusable.js',
  'node_modules/jquery-ui/ui/tabbable.js',
  'node_modules/jquery-ui/ui/keycode.js',
  'node_modules/jquery-ui/ui/safe-blur.js',
  'node_modules/jquery-ui/ui/widget.js',
  'node_modules/jquery-ui/ui/widgets/button.js',
  'node_modules/jquery-ui/ui/widgets/mouse.js',
  'node_modules/jquery-ui/ui/widgets/dialog.js',
  'node_modules/jquery-ui/ui/widgets/draggable.js'
];

const JQUERY_UI_ASSETS = [
  'node_modules/jquery-ui/themes/base/dialog.css',
  'node_modules/jquery-ui/themes/base/core.css'
];

const FLAGS = [
  {
    glob: '**/*',
    input: 'projects/cmf-core/assets/img/flags',
    output: 'assets/flags'
  }
];

const POLYFILLS_TO_ADD = ['zone.js', '@angular/localize/init'];

const REFLECT = ['reflect-metadata'];

export function updateAppSettings({ project }: { project: string }): Rule {
  return async () => {
    return chain([
      updateAppBuildTarget(project, [
        {
          path: ['scripts'],
          value: [...JQUERY_UI_SCRIPTS],
          operation: 'remove'
        },
        {
          path: ['assets'],
          value: [...JQUERY_UI_ASSETS, ...FLAGS],
          operation: 'remove'
        },
        { path: ['polyfills'], value: POLYFILLS_TO_ADD, operation: 'add' },
        { path: ['polyfills'], value: REFLECT, operation: 'remove' }
      ]),
      updateTsConfig([{ path: ['compilerOptions', 'skipLibCheck'], value: true }], project)
    ]);
  };
}
