import { Component } from '@angular/core';
import { CustomizableComponent } from 'cmf-core';
import { DataSourceSettingsDef, DataSourceSettings } from 'cmf-core-dashboards';

/**
 * @whatItDoes
 *
 * Please provide a meaningful description of this Data Source Settings and what it is needed for.
 * Also describe all the properties that are configurable in the correspondent Data Source
 *
 * @description
 *
 * ## Test Data Source Settings Component
 */
@Component({
  selector: 'test-lib-test-data-source-settings',
  imports: [DataSourceSettings],
  templateUrl: './test-data-source-settings.component.html',
  styleUrl: './test-data-source-settings.component.less'
})
export class TestDataSourceSettingsComponent extends CustomizableComponent {
  /** The settings of the TestDataSource */
  settings: DataSourceSettingsDef;

  /**
   * On settings loaded
   * @param settings the TestDataSource settings definition
   */
  onLoadSettings(settings: DataSourceSettingsDef): void {
    this.settings = settings;
  }
}
