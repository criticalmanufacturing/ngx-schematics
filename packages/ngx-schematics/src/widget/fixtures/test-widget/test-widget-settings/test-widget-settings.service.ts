import { Injectable } from '@angular/core';
import { WidgetModel, WidgetSettingsService, WidgetSettingsDef } from 'cmf-core-dashboards';

/** Test Settings Properties */
export interface TestWidgetSettings extends WidgetSettingsDef {}

/**
 * Test Settings Service
 *
 * This class serves the purpose of besides the widget common properties
 * save also all other properties that are defined for the Test Settings
 */
@Injectable()
export class TestWidgetSettingsService extends WidgetSettingsService {
  /**
   * Promise containing the widget settings that will be loaded
   */
  public onTestSettingsLoaded: (settings: TestWidgetSettings) => Promise<TestWidgetSettings>;

  /**
   * Promise containing the widget settings that will be saved
   */
  public onTestSaveSettings: (settings: TestWidgetSettings) => TestWidgetSettings;

  /**
   * On Load hook for widget settings.
   *
   * @param widgetSettings Settings that are being loaded.
   * @returns A Promise to the widget settings that will be saved.
   */
  public override async onAfterLoad(widgetSettings: WidgetModel): Promise<WidgetModel> {
    const model = await super.onAfterLoad(widgetSettings);
    model.settings = await this.onTestSettingsLoaded(model.settings);
    return model;
  }

  /**
   * On Save hook for widget settings.
   *
   * @param widgetSettings Widget Settings that will be saved.
   * @returns A Promise to the widget settings that will be saved.
   */
  public override onBeforeSave(widgetSettings: WidgetModel): WidgetModel {
    const model = super.onBeforeSave(widgetSettings);
    model.settings = this.onTestSaveSettings(model.settings);
    return model;
  }
}
