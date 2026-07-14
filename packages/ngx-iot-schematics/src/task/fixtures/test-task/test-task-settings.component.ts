import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  OnChanges,
  SimpleChanges,
  inject,
} from '@angular/core';
import { UtilService } from 'cmf-core';
import { BaseWidget } from 'cmf-core-controls';
import { TaskDefinitionSettings, TaskSettings, TaskSettingsBase } from 'cmf-core-connect-iot';

import * as TestTaskTask from './test-task.task';

/** Constants */
export interface TestTaskTaskSettings extends TestTaskTask.TestTaskSettings, TaskDefinitionSettings {}

@Component({
  selector: 'testlib-tasks-test-task-settings',
  imports: [TaskSettings, BaseWidget],
  templateUrl: 'test-task-settings.component.html',
  styleUrl: './test-task-settings.component.less',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class TestTaskSettings extends TaskSettingsBase implements OnInit, OnChanges {
  /** Services */
  private _util = inject(UtilService);

  /** Task settings */
  override settings: TestTaskTaskSettings;

  /** Task Instance */
  private _taskInstance: TestTaskTask.TestTaskTask;

  constructor() {
    super();

    this.service.onBeforeSave = this.onBeforeSave.bind(this);
  }

  /** Triggered when the task is created and define the default values */
  ngOnInit(): void {
    const currentSettings = Object.assign({}, this.settings);
    Object.assign(this.settings, TestTaskTask.SETTINGS_DEFAULTS, currentSettings);

    if (this.container != null) {
      this._taskInstance = this.container.task as TestTaskTask.TestTaskTask;
    }

    // Initialize default values for settings page
    if (this.settings != null) {
      // ...
      // Example with defaults in the .task itself
      // this.settings.message = this.settings.message != null ? this.settings.message : this._taskInstance.message;
    }
  }

  /** Triggered when an element from the html page is changed */
  override ngOnChanges(changes: SimpleChanges): void {
    super.ngOnChanges(changes);
  }

  /**
   * Handles a change in the settings.
   * Update the settings property with given value and path
   * @param value New value
   * @param destPath Destination property
   */
  _onSettingsValueChange(value: any, destPath: string): void {
    // Set the settings with new value
    this._util.setNestedPropertyByPath(this.settings, destPath, value, true);
  }

  /**
   * Process all nodes (default and outputs)
   * @param settings Settings
   */
  onBeforeSave(settings: TestTaskTask.TestTaskSettings): TestTaskTask.TestTaskSettings {
    return settings;
  }
}
