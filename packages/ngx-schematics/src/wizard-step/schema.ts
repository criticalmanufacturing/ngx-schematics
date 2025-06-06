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
   * The name of the step.
   */
  name: string;

  /**
   * The type of step
   */
  stepType: string;

  /**
   * The file extension or preprocessor to use for style files, or 'none' to skip generating the style file.
   */
  style: string;
}
