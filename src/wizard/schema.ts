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
   * The name of the wizard.
   */
  name: string;

  /**
   * The name of the entity type to be performed.
   */
  entityType: string;

  /**
   * The namespace of the entity type.
   */
  namespace?: string;

  /**
   * The file extension or preprocessor to use for style files, or 'none' to skip generating the style file.
   */
  style: string;
}
