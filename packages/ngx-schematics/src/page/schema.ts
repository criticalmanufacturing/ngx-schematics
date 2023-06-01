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
   * The name of the page.
   */
  name: string;

  /**
   * The id of the action used to access the page.
   */
  pageId: string;

  /**
   * The file extension or preprocessor to use for style files, or 'none' to skip generating the style file.
   */
  style: string;

  /**
   * The class for the icon displayed on the page.
   */
  iconClass: string;

  /**
   * Defines how the page will be available to the user.
   */
  entrypoint: string;

  /**
   * In case the entrypoint is "Menu Item", specifies the parent Menu Group Id.
   */
  menuGroupId?: string;

  /**
   * In case the entrypoint is "Menu Item", specifies the parent Menu Sub Group Id (if applicable).
   */
  menuSubGroupId?: string;
}
