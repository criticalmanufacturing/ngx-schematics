import { Injectable } from '@angular/core';
import { Task } from '@criticalmanufacturing/connect-iot-controller-engine';
import { TaskDesigner, TaskDesignerInstance } from 'cmf-core-connect-iot';
import { TestTaskSettings } from './test-task.task';

@Injectable()
@TaskDesigner({
  name: $localize`:@@testlib/test-task#TITLE:Test Task`,
  iconClass: 'icon-core-connect-iot-lg-logmessage',
  inputs: {
    activate: Task.INPUT_ACTIVATE,

    // Add more inputs here
    // example: containerId: System.PropertyValueType.String,
  },
  outputs: {
    // Add more outputs here:
    // Example:  notifyMessage: System.PropertyValueType.String,
    success: Task.OUTPUT_SUCCESS,
    error: Task.OUTPUT_ERROR,
  },
})
export class TestTaskDesigner implements TaskDesignerInstance, TestTaskSettings {
  // Add settings (this is just an example)
  inputs: Task.TaskInput[];
  outputs: Task.TaskOutput[];
  message: string;

  /**
   * Resolve the inputs to be displayed in the task during design time
   * @param inputs List of inputs automatically resolved.
   * Return the updated list of inputs to design
   */
  async onGetInputs(inputs: Task.TaskInputs): Promise<Task.TaskInputs> {
    return inputs;
  }

  /**
   * Resolve the outputs to be displayed in the task during design time
   * @param outputs List of outputs automatically resolved.
   * Return the updated list of outputs to design
   */
  async onGetOutputs(outputs: Task.TaskOutputs): Promise<Task.TaskOutputs> {
    return outputs;
  }
}
