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
   * The name of the widget.
   */
  name: string;

  /**
   * The file extension or preprocessor to use for style files, or 'none' to skip generating the style file.
   */
  style: string;

  /**
   * The title of the task.
   */
  title: string;

  /**
   * The icon name of the task.
   */
  icon: string;

  /**
   * Do not generate dynamic inputs for this task.
   */
  hasInputs: boolean;

  /**
   * Do not generate dynamic outputs for this task.
   */
  hasOutputs: boolean;

  /**
   * Do not generate task protocol for this task.
   */
  isForProtocol: boolean;
}
