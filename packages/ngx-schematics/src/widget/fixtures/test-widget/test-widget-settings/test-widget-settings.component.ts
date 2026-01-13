import { Component, inject } from '@angular/core';
import { CustomizableComponent } from 'cmf-core';
import { WidgetSettings, WidgetSettingsService } from 'cmf-core-dashboards';
import { TestWidgetSettingsService, TestWidgetSettings } from './test-widget-settings.service';

/**
 * @whatItDoes
 *
 * Please provide a meaningful description of this Widget Settings and what it is needed for.
 * Also describe all the properties that are configurable in the correspondent Widget
 *
 * ### Widget Configurable Properties
 * * `string` : **name** _(default)_ - The name of the widget
 * * `string` : **description** _(default)_ - The description of the widget
 * * `string` : **iconClass** _(default)_ - The icon CSS class to change the widget icon
 *
 * @description
 *
 * ## Test Widget Settings Component
 */
@Component({
  selector: 'test-lib-test-widget-settings',
  imports: [WidgetSettings],
  templateUrl: './test-widget-settings.component.html',
  styleUrl: './test-widget-settings.component.less',
  providers: [{ provide: WidgetSettingsService, useClass: TestWidgetSettingsService }]
})
export class TestWidgetSettingsComponent extends CustomizableComponent {
  /** Widget settings */
  private _settings = inject(WidgetSettingsService) as TestWidgetSettingsService;

  /**
   * Constructor
   */
  constructor() {
    super();

    this._settings.onTestSettingsLoaded = this.onLoad.bind(this);
    this._settings.onTestSaveSettings = this.onSave.bind(this);
  }

  /**
   * Loads the widget settings
   * @returns: A Promise to resolve the settings
   */
  onLoad(settings: TestWidgetSettings): Promise<TestWidgetSettings> {
    return Promise.resolve(settings);
  }

  /**
   * Saves the widget settings
   */
  onSave(settings: TestWidgetSettings): TestWidgetSettings {
    return settings;
  }
}
