import { Component } from '@angular/core';
import { Widget, WidgetGeneric, WidgetRepresentation, WidgetViewMode } from 'cmf-core-dashboards';
import { TestWidgetSettingsComponent } from './test-widget-settings/test-widget-settings.component';

/**
 * @whatItDoes
 *
 * Please provide a meaningful description of this widget.
 * Try to answer these questions here:
 * * What is it?
 * * What it does?
 * * How does it behave with different sizes?
 * * Does it retrieve data from any external source (server, local database, text file, etc...)?
 *
 * @howToUse
 *
 * The widget is used in an UIPage with the inputs and outputs mentioned below.
 *
 * Also the configurable settings of the widget are referred in Widget Settings Component
 *
 * Besides the description above, please complement it with a meaningful description of this
 * widget that answer these questions:
 * * How to use it?
 * * Where and When to use it?
 *
 * ### Widget Inputs
 * * `string` : **name** _(default)_ - The name of the widget
 * * `string` : **description** _(default)_ - The description of the widget
 * * `string` : **iconClass** _(default)_ - The icon CSS class to change the widget icon
 *
 * ### Widget Outputs
 * * `string` : **valueChange** _(default)_ - The icon CSS class to change the widget icon
 *
 * ### Widget Settings
 * See {@link WidgetSettingsComponent}
 *
 * ### _NOTES_
 * (Optional: Provide additional notes here)
 *
 * @description
 *
 * ## Test Widget Component
 */
@Widget({
  name: $localize`:@@test-lib/test-widget#NAME:Test Widget`,
  iconClass: 'icon-core-st-lg-generic',
  settingsComponent: {
    component: TestWidgetSettingsComponent
  }
})
@Component({
  selector: 'test-lib-test-widget',
  imports: [],
  templateUrl: './test-widget.component.html',
  styleUrl: './test-widget.component.less'
})
export class TestWidget extends WidgetGeneric implements WidgetRepresentation {
  /** Defines how the widget will be represented */
  uiWidgetViewMode: WidgetViewMode = WidgetViewMode.Normal;
}
