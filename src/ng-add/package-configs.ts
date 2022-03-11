import { NodeDependency, NodeDependencyType } from '@schematics/angular/utility/dependencies';

/**
 * Project Core Metadata Modules
 */
export const CORE_METADATA_MODULES: [string, string][] = [
  ['cmf-core-shell/metadata', 'CoreShellMetadataModule'],
  ['cmf-core-controls/metadata', 'CoreControlsMetadataModule'],
  ['cmf-core-business-controls/metadata', 'CoreBusinessControlsMetadataModule'],
  ['cmf-core-admin-host/metadata', 'CoreAdminHostMetadataModule'],
  ['cmf-core-checklist/metadata', 'CoreChecklistMetadataModule'],
  ['cmf-core-dashboards/metadata', 'CoreDashboardsMetadataModule'],
  ['cmf-core-camera/metadata', 'CoreCameraMetadataModule'],
  ['cmf-core-search/metadata', 'CoreSearchMetadataModule'],
  ['cmf-core-admin-i18n/metadata', 'CoreAdminI18nMetadataModule'],
  ['cmf-core-masterdata/metadata', 'CoreMasterDataMetadataModule']
];

/**
 * Project Core Module
 */
export const CORE_MODULE: [string, string] = ['cmf-core', 'CoreModule'];

/**
 * Project Core Packages
 */
export const CORE_PACKAGES: NodeDependency[] = [
  {
    type: NodeDependencyType.Default,
    name: '@criticalmanufacturing/messagebus-client',
    version: 'file:../dev/MessageBus/cmf.messagebus.client.html5'
  },
  {
    type: NodeDependencyType.Default,
    name: 'angular2-grid',
    version: 'file:../dev/angular2-grid/dist/angular2-grid'
  },
  {
    type: NodeDependencyType.Default,
    name: 'bootstrap',
    version: '^3.4.1'
  },
  {
    type: NodeDependencyType.Default,
    name: 'cmf-core',
    version: 'file:../CoreHTML/dist/cmf-core'
  },
  {
    type: NodeDependencyType.Default,
    name: 'cmf-core-admin-host',
    version: 'file:../CoreHTML/dist/cmf-core-admin-host'
  },
  {
    type: NodeDependencyType.Default,
    name: 'cmf-core-admin-i18n',
    version: 'file:../CoreHTML/dist/cmf-core-admin-i18n'
  },
  {
    type: NodeDependencyType.Default,
    name: 'cmf-core-business-controls',
    version: 'file:../CoreHTML/dist/cmf-core-business-controls'
  },
  {
    type: NodeDependencyType.Default,
    name: 'cmf-core-camera',
    version: 'file:../CoreHTML/dist/cmf-core-camera'
  },
  {
    type: NodeDependencyType.Default,
    name: 'cmf-core-checklist',
    version: 'file:../CoreHTML/dist/cmf-core-checklist'
  },
  {
    type: NodeDependencyType.Default,
    name: 'cmf-core-controls',
    version: 'file:../CoreHTML/dist/cmf-core-controls'
  },
  {
    type: NodeDependencyType.Default,
    name: 'cmf-core-dashboards',
    version: 'file:../CoreHTML/dist/cmf-core-dashboards'
  },
  {
    type: NodeDependencyType.Default,
    name: 'cmf-core-masterdata',
    version: 'file:../CoreHTML/dist/cmf-core-masterdata'
  },
  {
    type: NodeDependencyType.Default,
    name: 'cmf-core-search',
    version: 'file:../CoreHTML/dist/cmf-core-search'
  },
  {
    type: NodeDependencyType.Default,
    name: 'cmf-core-shell',
    version: 'file:../CoreHTML/dist/cmf-core-shell'
  },
  {
    type: NodeDependencyType.Default,
    name: 'cmf.instascan',
    version: 'file:../dev/Library/HTML/cmf.instascan'
  },
  {
    type: NodeDependencyType.Default,
    name: 'cmf.kendoui',
    version: 'file:../dev/Library/HTML/cmf.kendoui'
  },
  {
    type: NodeDependencyType.Default,
    name: 'dagre',
    version: '^0.8.5'
  },
  {
    type: NodeDependencyType.Default,
    name: 'cmf.lbos',
    version: 'file:../dev/Library/HTML/cmf.mes.lbos'
  },
  {
    type: NodeDependencyType.Default,
    name: 'decimal.js',
    version: '^10.3.1'
  },
  {
    type: NodeDependencyType.Default,
    name: 'dexie',
    version: '^3.0.3'
  },
  {
    type: NodeDependencyType.Default,
    name: 'graphlib',
    version: '^2.1.8'
  },
  {
    type: NodeDependencyType.Default,
    name: 'jointjs',
    version: '^3.5.2'
  },
  {
    type: NodeDependencyType.Default,
    name: 'graphlib',
    version: '^2.1.8'
  },
  {
    type: NodeDependencyType.Default,
    name: 'jquery',
    version: '^3.6.0'
  },
  {
    type: NodeDependencyType.Default,
    name: 'jquery-ui',
    version: '^1.13.0'
  },
  {
    type: NodeDependencyType.Default,
    name: 'lodash',
    version: '^4.17.21'
  },
  {
    type: NodeDependencyType.Default,
    name: 'lodash',
    version: '^4.17.21'
  },
  {
    type: NodeDependencyType.Default,
    name: 'moment',
    version: '^2.29.1'
  },
  {
    type: NodeDependencyType.Default,
    name: 'moment-duration-format',
    version: '^2.3.2'
  },
  {
    type: NodeDependencyType.Default,
    name: 'monaco-editor',
    version: '^0.30.1'
  },
  {
    type: NodeDependencyType.Default,
    name: 'quagga',
    version: '^0.12.1'
  },
  {
    type: NodeDependencyType.Default,
    name: 'reflect-metadata',
    version: '^0.1.13'
  },
  {
    type: NodeDependencyType.Default,
    name: 'rxjs',
    version: '~7.4.0'
  },
  {
    type: NodeDependencyType.Default,
    name: 'toastr',
    version: '^2.1.4'
  },
  {
    type: NodeDependencyType.Default,
    name: 'underscore',
    version: '^1.13.1'
  },
  {
    type: NodeDependencyType.Dev,
    name: '@types/backbone',
    version: '^1.4.15'
  },
  {
    type: NodeDependencyType.Dev,
    name: '@types/jquery',
    version: '^3.5.6'
  },
  {
    type: NodeDependencyType.Dev,
    name: '@types/underscore',
    version: '^1.11.3'
  }
];

/**
 * Project MES Packages
 */
export const MES_PACKAGES: NodeDependency[] = [
  {
    type: NodeDependencyType.Default,
    name: 'cmf-mes',
    version: 'file:../MESHTML/dist/cmf-mes'
  }
];

/**
 * Project Assets
 */
export const PROJECT_ASSETS = [
  {
    'glob': 'favicon.ico',
    'input': 'node_modules/cmf-core/src/assets/img',
    'output': ''
  },
  {
    'glob': '**/icon-*.png',
    'input': 'node_modules/cmf-core/src/assets/img/icons',
    'output': 'assets/icons'
  },
  {
    'glob': '**/*',
    'input': 'node_modules/cmf-core/src/assets/img/flags',
    'output': 'assets/flags'
  },
  {
    'glob': '**/*',
    'input': 'node_modules/cmf-core/src/assets/img/themes',
    'output': 'assets/themes'
  },
  {
    'glob': '**/*',
    'input': 'node_modules/monaco-editor/min/vs',
    'output': 'monaco-editor/vs'
  }
];

/**
 * Project Styles
 */
export const PROJECT_STYLES = [
  'node_modules/toastr/toastr.less',
  'node_modules/bootstrap/dist/css/bootstrap.css',
  'node_modules/cmf.kendoui/styles/kendo.common.min.css',
  'node_modules/jquery-ui/themes/base/dialog.css',
  'node_modules/jquery-ui/themes/base/core.css',
  'node_modules/cmf-core/src/assets/style/styles.less',
  {
    'inject': false,
    'bundleName': 'cmf.style.blue',
    'input': 'node_modules/cmf-core/src/assets/style/themes/cmf.style.blue/cmf.style.blue.less'
  },
  {
    'inject': false,
    'bundleName': 'cmf.style.blue.grey',
    'input': 'node_modules/cmf-core/src/assets/style/themes/cmf.style.blue.grey/cmf.style.blue.grey.less'
  },
  {
    'inject': false,
    'bundleName': 'cmf.style.dark.blue',
    'input': 'node_modules/cmf-core/src/assets/style/themes/cmf.style.dark.blue/cmf.style.dark.blue.less'
  },
  {
    'inject': false,
    'bundleName': 'cmf.style.light.blue',
    'input': 'node_modules/cmf-core/src/assets/style/themes/cmf.style.light.blue/cmf.style.light.blue.less'
  }
];

/**
 * Project Scripts
 */
export const PROJECT_SCRIPTS = [
  'node_modules/jquery/dist/jquery.min.js',
  'node_modules/lodash/lodash.js',
  'node_modules/graphlib/dist/graphlib.core.js',
  'node_modules/dagre/dist/dagre.core.js',
  'node_modules/toastr/toastr.js',
  'node_modules/jquery-ui/ui/version.js',
  'node_modules/jquery-ui/ui/data.js',
  'node_modules/jquery-ui/ui/safe-active-element.js',
  'node_modules/jquery-ui/ui/unique-id.js',
  'node_modules/jquery-ui/ui/focusable.js',
  'node_modules/jquery-ui/ui/tabbable.js',
  'node_modules/jquery-ui/ui/keycode.js',
  'node_modules/jquery-ui/ui/safe-blur.js',
  'node_modules/jquery-ui/ui/widget.js',
  'node_modules/jquery-ui/ui/widgets/button.js',
  'node_modules/jquery-ui/ui/widgets/dialog.js',
  'node_modules/bootstrap/js/collapse.js',
  'node_modules/bootstrap/js/transition.js',
  'node_modules/bootstrap/js/dropdown.js',
  'node_modules/cmf.kendoui/js/kendo.core.min.js',
  'node_modules/cmf.kendoui/js/kendo.fx.min.js',
  'node_modules/cmf.kendoui/js/kendo.ooxml.min.js',
  'node_modules/cmf.kendoui/js/kendo.excel.min.js',
  'node_modules/cmf.kendoui/js/kendo.data.odata.min.js',
  'node_modules/cmf.kendoui/js/kendo.data.xml.min.js',
  'node_modules/cmf.kendoui/js/kendo.data.min.js',
  'node_modules/cmf.kendoui/js/kendo.popup.min.js',
  'node_modules/cmf.kendoui/js/kendo.popup.min.js',
  'node_modules/cmf.kendoui/js/kendo.menu.min.js',
  'node_modules/cmf.kendoui/js/kendo.userevents.min.js',
  'node_modules/cmf.kendoui/js/kendo.draganddrop.min.js',
  'node_modules/cmf.kendoui/js/kendo.floatinglabel.min.js',
  'node_modules/cmf.kendoui/js/kendo.maskedtextbox.min.js',
  'node_modules/cmf.kendoui/js/kendo.list.min.js',
  'node_modules/cmf.kendoui/js/kendo.mobile.scroller.min.js',
  'node_modules/cmf.kendoui/js/kendo.virtuallist.min.js',
  'node_modules/cmf.kendoui/js/kendo.dropdownlist.min.js',
  'node_modules/cmf.kendoui/js/kendo.combobox.min.js',
  'node_modules/cmf.kendoui/js/kendo.autocomplete.min.js',
  'node_modules/cmf.kendoui/js/kendo.window.min.js',
  'node_modules/cmf.kendoui/js/kendo.color.min.js',
  'node_modules/cmf.kendoui/js/kendo.slider.min.js',
  'node_modules/cmf.kendoui/js/kendo.button.min.js',
  'node_modules/cmf.kendoui/js/kendo.colorpicker.min.js',
  'node_modules/cmf.kendoui/js/kendo.editor.min.js',
  'node_modules/cmf.kendoui/js/kendo.columnsorter.min.js',
  'node_modules/cmf.kendoui/js/kendo.resizable.min.js',
  'node_modules/cmf.kendoui/js/kendo.selectable.min.js',
  'node_modules/cmf.kendoui/js/kendo.pager.min.js',
  'node_modules/cmf.kendoui/js/kendo.grid.min.js',
  'node_modules/cmf.kendoui/js/kendo.splitter.min.js',
  {
    'bundleName': 'instascan',
    'inject': false,
    'input': 'node_modules/cmf.instascan/dist/instascan.min.js'
  },
  {
    'bundleName': 'jszip',
    'inject': false,
    'input': 'node_modules/cmf.kendoui/js/jszip.min.js'
  }
];
