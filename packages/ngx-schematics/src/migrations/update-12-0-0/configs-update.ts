import { chain, Rule } from '@angular-devkit/schematics';
import {
  updateAppBuildTarget,
  updateTsConfig
} from '@criticalmanufacturing/schematics-devkit/rules';
import { KENDO_STYLES, PROJECT_LOADER, V12_ASSETS } from '../../ng-add/package-configs';

export const CONNECT_IOT_STYLES = [
  'node_modules/@criticalmanufacturing/connect-iot-controller-engine-core-tasks/assets/font/icon-core-tasks-connect-iot-font.less',
  'node_modules/@criticalmanufacturing/connect-iot-controller-engine-filedrivers-tasks/assets/font/icon-filesbased-iot-font.less',
  'node_modules/@criticalmanufacturing/connect-iot-controller-engine-oib-tasks/assets/font/icon-oib-tasks-connect-iot-font.less',
  'node_modules/@criticalmanufacturing/connect-iot-controller-engine-secsgem-tasks/assets/font/icon-secsgem-iot-font.less',
  'node_modules/@criticalmanufacturing/connect-iot-controller-engine-factoryautomation-tasks/assets/font/icon-factoryautomation-tasks-connect-iot-font.less',
  'node_modules/@criticalmanufacturing/connect-iot-controller-engine-opcua-tasks/assets/font/icon-opcua-tasks-connect-iot-font.less',
  'node_modules/@criticalmanufacturing/connect-iot-controller-engine-mes-tasks/assets/font/icon-mes-connect-iot-font.less'
];

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
    input: 'node_modules/cmf-core/assets/img/flags',
    output: 'assets/flags'
  }
];

const MONACO_SCRIPTS = [
  {
    glob: '**/*',
    input: 'node_modules/monaco-editor/min/vs',
    output: 'monaco-editor/vs'
  }
];

const LOCALIZE = ['@angular/localize/init'];

const REFLECT = ['reflect-metadata'];

export const KENDO_OLD_SCRIPTS = [
  'node_modules/cmf.kendoui/js/kendo.core.min.js',
  'node_modules/cmf.kendoui/js/kendo.fx.min.js',
  'node_modules/cmf.kendoui/js/kendo.ooxml.min.js',
  'node_modules/cmf.kendoui/js/kendo.excel.min.js',
  'node_modules/cmf.kendoui/js/kendo.data.odata.min.js',
  'node_modules/cmf.kendoui/js/kendo.data.xml.min.js',
  'node_modules/cmf.kendoui/js/kendo.data.min.js',
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
  'node_modules/cmf.kendoui/js/kendo.numerictextbox.min.js',
  'node_modules/cmf.kendoui/js/kendo.tabstrip.min.js',
  'node_modules/cmf.kendoui/js/kendo.editor.min.js',
  'node_modules/cmf.kendoui/js/kendo.columnsorter.min.js',
  'node_modules/cmf.kendoui/js/kendo.resizable.min.js',
  'node_modules/cmf.kendoui/js/kendo.selectable.min.js',
  'node_modules/cmf.kendoui/js/kendo.pager.min.js',
  'node_modules/cmf.kendoui/js/kendo.grid.min.js',
  'node_modules/cmf.kendoui/js/kendo.splitter.min.js',
  'node_modules/cmf.kendoui/js/kendo.tooltip.min.js',
  'node_modules/cmf.kendoui/js/kendo.drawing.min.js',
  'node_modules/cmf.kendoui/js/kendo.dataviz.core.min.js',
  'node_modules/cmf.kendoui/js/kendo.dataviz.chart.min.js',
  'node_modules/cmf.kendoui/js/kendo.dataviz.themes.min.js',
  'node_modules/cmf.kendoui/js/kendo.dataviz.treemap.min.js',
  'node_modules/cmf.kendoui/js/kendo.calendar.min.js',
  'node_modules/cmf.kendoui/js/kendo.multiviewcalendar.min.js',
  'node_modules/cmf.kendoui/js/kendo.pdf.min.js',
  {
    bundleName: 'jszip',
    inject: false,
    input: 'node_modules/cmf.kendoui/js/jszip.min.js'
  }
];

export const KENDO_OLD_STYLES = ['node_modules/cmf.kendoui/styles/kendo.common.min.css'];

export function updateAppSettings({ project }: { project: string }): Rule {
  return () => {
    return chain([
      updateAppBuildTarget(project, [
        {
          path: ['scripts'],
          value: [...JQUERY_UI_SCRIPTS],
          operation: 'remove'
        },
        {
          path: ['assets'],
          value: [...JQUERY_UI_ASSETS, ...FLAGS, ...MONACO_SCRIPTS],
          operation: 'remove'
        },
        { path: ['polyfills'], value: LOCALIZE, operation: 'add' },
        { path: ['polyfills'], value: REFLECT, operation: 'remove' },
        { path: ['loader'], value: PROJECT_LOADER, operation: 'add' },
        {
          path: ['scripts'],
          value: [...KENDO_OLD_SCRIPTS],
          operation: 'remove'
        },
        {
          path: ['styles'],
          value: [...KENDO_OLD_STYLES],
          operation: 'remove'
        },
        {
          path: ['styles'],
          value: [...CONNECT_IOT_STYLES],
          operation: 'remove'
        },
        {
          path: ['styles'],
          value: [...KENDO_STYLES],
          operation: 'add'
        },
        {
          path: ['assets'],
          value: [...V12_ASSETS],
          operation: 'add'
        }
      ]),
      updateTsConfig([{ path: ['compilerOptions', 'skipLibCheck'], value: true }], project)
    ]);
  };
}
