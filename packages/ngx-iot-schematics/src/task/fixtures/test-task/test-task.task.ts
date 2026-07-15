import {
  Task,
  Dependencies,
  System,
  DI,
  TYPES,
} from '@criticalmanufacturing/connect-iot-controller-engine';

/** Default values for settings */
export const SETTINGS_DEFAULTS: TestTaskSettings = {
  inputs: [],
  outputs: [],
  message: '',
};

/**
 * @whatItDoes
 *
 * This task does something ... describe here
 *
 * @howToUse
 *
 * yada yada yada
 *
 * ### Inputs
 * * `any` : **activate** - Activate the task
 *
 * ### Outputs
 * * `bool`  : ** success ** - Triggered when the the task is executed with success
 * * `Error` : ** error ** - Triggered when the task failed for some reason
 *
 * ### Settings
 * See {@see TestTaskSettings}
 */
@Task.Task()
export class TestTaskTask implements Task.TaskInstance, TestTaskSettings {
  /** Accessor helper for untyped properties and output emitters. */
  [key: string]: any;

  /** **Inputs** */
  /** Activate task execution */
  @Task.InputProperty(Task.INPUT_ACTIVATE)
  activate: any = undefined;
  // ... more inputs

  /** **Outputs** */
  /** To output a success notification */
  @Task.OutputProperty(Task.OUTPUT_SUCCESS)
  success: Task.Output<boolean> = new Task.Output<boolean>();
  /** To output an error notification */
  @Task.OutputProperty(Task.OUTPUT_ERROR)
  error: Task.Output<Error> = new Task.Output<Error>();

  /** Settings */
  inputs: Task.TaskInput[];
  outputs: Task.TaskOutput[];
  /** Properties Settings */
  message: string;

  @DI.Inject(TYPES.Dependencies.Logger)
  private _logger: Dependencies.Logger;

  /**
   * When one or more input values is changed this will be triggered,
   * @param changes Task changes
   */
  async onChanges(changes: Task.Changes): Promise<void> {
    if (changes['activate']) {
      // It is advised to reset the activate to allow being reactivated without the value being different
      this.activate = undefined;

      // ... code here
      this.success.emit(true);

      // or
      this._logger.error(`Something very wrong just happened! Log it!`);
      throw new Error('Will stop processing, but Error output will be triggered with this value');
    }
  }

  /** Right after settings are loaded, create the needed dynamic outputs. */
  async onBeforeInit(): Promise<void> {
    return;
  }

  /** Initialize this task, register any event handler, etc */
  async onInit(): Promise<void> {
    return;
  }

  /** Cleanup internal data, unregister any event handler, etc */
  async onDestroy(): Promise<void> {
    return;
  }

  // On every tick (use instead of onChanges if necessary)
  // async onCheck(): Promise<void> {
  //   return;
  // }
}

// Add settings here
/** TestTask Settings object */
export interface TestTaskSettings extends System.TaskDefaultSettings {
  message: string;
}
