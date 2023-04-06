import { IoTValueType } from '../utility/iot';

export interface Schema {
  /**
   * The path at which to create the component file, relative to the current workspace.
   * Default is a folder with the same name as the component in the project root.
   */
  path: string;

  /**
   * The name of the project.
   */
  project: string;

  /**
   * The name of the converter.
   */
  name: string;

  /**
   * The input type of the converter.
   */
  inputType: IoTValueType;

  /**
   * The output type of the converter.
   */
  outputType: IoTValueType;
}
