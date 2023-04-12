export interface Schema {
  /**
   * The name of the project.
   */
  project?: string;

  /**
   * The base app version to use.
   */
  version?: string;

  /**
   * Add eslint to the project.
   */
  eslint?: string;
}
