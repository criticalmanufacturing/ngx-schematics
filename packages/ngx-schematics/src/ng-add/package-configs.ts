import { SW_ASSETS } from '../migrations/update-1-2-0/update-service-worker';

/**
 * Project Core Base provider/Module
 */
export const CORE_BASE_MODULE: [string, string] = ['cmf-core-ui', 'CoreUIModule.forRoot()'];
export const CORE_BASE_PROVIDE: [string, string] = ['cmf-core-ui', 'provideCoreUI()'];

/**
 * Project MES Base provider/Module
 */
export const MES_BASE_MODULE: [string, string] = ['cmf-mes-ui', 'MesUIModule.forRoot()'];
export const MES_BASE_PROVIDE: [string, string] = ['cmf-mes-ui', 'provideMesUI()'];

/**
 * Project Metadata Routing provider/Module
 */
export const METADATA_ROUTING_MODULE: [string, string] = ['cmf-core', 'MetadataRoutingModule'];
export const METADATA_ROUTING_PROVIDE: [string, string] = ['cmf-core', 'provideMetadataRouter()'];

/**
 * THEMES
 */
export const THEMES = [
  'cmf.style.light',
  'cmf.style.light.accessibility',
  'cmf.style.contrast',
  'cmf.style.contrast.accessibility',
  'cmf.style.dark',
  'cmf.style.dark.accessibility'
];

/**
 * Project Allowed CommonJS Dependencies
 */
export const PROJECT_ALLOWED_COMMONJS_DEPENDENCIES = [
  'quagga',
  'html2canvas',
  'zipson',
  'decimal.js',
  'moment',
  'moment-duration-format',
  'backbone',
  'jquery',
  'lodash',
  'raf',
  'rgbcolor',
  'core-js',
  'dompurify',
  'jsonata',
  'xpath',
  'xmldom',
  'inversify',
  'escape-latex',
  'fraction.js',
  'complex.js',
  'javascript-natural-sort',
  'seedrandom',
  'typed-function',
  'buffer'
];

/**
 * Project Assets
 */
export const PROJECT_ASSETS = [
  'src/assets',
  'src/manifest.webmanifest',
  {
    glob: 'favicon.ico',
    input: 'node_modules/cmf-core/assets/img'
  },
  {
    glob: '**/icon-*.png',
    input: 'node_modules/cmf-core/assets/img/icons',
    output: 'assets/icons'
  },
  {
    glob: '**/*',
    input: 'node_modules/cmf-core/assets/img/themes',
    output: 'assets/themes'
  },
  ...SW_ASSETS,
  {
    glob: '**/*',
    input: 'node_modules/cmf-core-fablive/assets',
    output: 'assets/fablive'
  },
  {
    glob: '**/*',
    input: 'node_modules/cmf-core-augmentedreality/assets',
    output: 'assets/augmentedreality'
  },
  {
    glob: '**/*',
    input: 'node_modules/cmf-core-shell/assets',
    output: 'assets/shell'
  },
  {
    glob: '{artoolkit_wasm.wasm,camera_para.dat}',
    input: 'node_modules/cmf-artoolkit',
    output: 'cmf-artoolkit'
  },
  {
    glob: 'index.d.ts',
    input: 'node_modules/cmf-lbos',
    output: 'assets/@types/cmf-lbos'
  }
];

/**
 * Project Core Assets
 */
export const PROJECT_CORE_ASSETS = [...PROJECT_ASSETS];

/**
 * Project MES Assets
 */
export const PROJECT_MES_ASSETS = [
  ...PROJECT_ASSETS,
  {
    glob: '**/*.svg',
    input: 'node_modules/cmf-mes-business-controls/assets/product/img',
    output: 'assets/business-controls/product'
  }
];

/**
 * Generic Project Styles
 */
const GENERIC_STYLES = [
  'node_modules/toastr/toastr.less',
  'node_modules/bootstrap/dist/css/bootstrap.css',
  'node_modules/cmf.kendoui/styles/kendo.common.min.css',
  'node_modules/cmf-core-connect-iot/assets/fonts/coreconnectiot/icon-core-connect-iot-font.less',
  'node_modules/cmf-core-iotevents/assets/fonts/coreiotevents/icon-core-iot-events-font.less',
  'node_modules/@criticalmanufacturing/connect-iot-controller-engine-core-tasks/assets/font/icon-core-tasks-connect-iot-font.less',
  'node_modules/@criticalmanufacturing/connect-iot-controller-engine-filedrivers-tasks/assets/font/icon-filesbased-iot-font.less',
  'node_modules/@criticalmanufacturing/connect-iot-controller-engine-oib-tasks/assets/font/icon-oib-tasks-connect-iot-font.less',
  'node_modules/@criticalmanufacturing/connect-iot-controller-engine-secsgem-tasks/assets/font/icon-secsgem-iot-font.less',
  'node_modules/@criticalmanufacturing/connect-iot-controller-engine-factoryautomation-tasks/assets/font/icon-factoryautomation-tasks-connect-iot-font.less',
  'node_modules/@criticalmanufacturing/connect-iot-controller-engine-opcua-tasks/assets/font/icon-opcua-tasks-connect-iot-font.less'
];

/**
 * Project Core Styles
 */
export const PROJECT_CORE_STYLES = [
  ...GENERIC_STYLES,
  'node_modules/cmf-core/assets/style/styles.less',
  ...THEMES.map((theme) => ({
    inject: false,
    bundleName: theme,
    input: `node_modules/cmf-core/assets/style/themes/${theme}/${theme}.less`
  }))
];

/**
 * Project MES Styles
 */
export const PROJECT_MES_STYLES = [
  ...GENERIC_STYLES,
  'node_modules/cmf-mes-kpi/assets/fonts/meskpi/icon-mes-kpi-font.less',
  'node_modules/cmf-mes/assets/style/styles.less',
  'node_modules/@criticalmanufacturing/connect-iot-controller-engine-mes-tasks/assets/font/icon-mes-connect-iot-font.less',
  ...THEMES.map((theme) => ({
    inject: false,
    bundleName: theme,
    input: `node_modules/cmf-mes/assets/style/themes/${theme}/${theme}.less`
  }))
];

/**
 * Project Scripts
 */
export const PROJECT_SCRIPTS = [
  'node_modules/jquery/dist/jquery.min.js',
  'node_modules/toastr/toastr.js',
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

export const PROJECT_LOADER = {
  '.ttf': 'file'
};
