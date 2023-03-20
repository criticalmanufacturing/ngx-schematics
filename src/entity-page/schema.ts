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
     * The name of the entity-page.
     */
    name: string;

    /**
     * The name of the entity type.
     */
    entityType: string;

    /**
     * The namespace of the entity type.
     */
    namespace?: string;
}