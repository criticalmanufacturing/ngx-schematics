import { Component, forwardRef } from '@angular/core';
import Cmf from 'cmf-lbos';
import { CustomizableComponent, HOST_VIEW_COMPONENT } from 'cmf-core';
import {
  EntityPage,
  EntityPageInterface,
  LevelsToLoad,
  EntityPageService
} from 'cmf-core-business-controls';

/**
 * @whatItDoes
 *
 * Please provide a meaningful description of this component
 * Try to answer these questions:
 * * What is it?
 * * What it does?
 * * How does it behave with different sizes?
 * * Does it retrieve data from any external source (server, local database, text file, etc...)?
 *
 * @howToUse
 *
 * This component is used with the inputs and outputs mentioned below.
 *
 * Besides the description above, please complement it with a meaningful description of this
 * component that answer these questions:
 * * How to use it?
 * * Where and When to use it?
 *
 * ### Example
 * To use the component, assume this HTML Template as an example:
 *
 * ```HTML
 * <test-lib-wizard-test-entity-type></test-lib-wizard-test-entity-type>
 * ```
 *
 * ### _NOTES_
 * (optional, Provide additional notes here)
 *
 * @description
 *
 * ## TestEntityTypeComponent Component
 */
@Component({
  selector: 'test-lib-page-test-entity-type',
  imports: [EntityPage],
  providers: [EntityPageService],
  templateUrl: './page-test-entity-type.component.html',
  viewProviders: [
    { provide: HOST_VIEW_COMPONENT, useExisting: forwardRef(() => PageTestEntityTypeComponent) }
  ]
})
export class PageTestEntityTypeComponent
  extends CustomizableComponent
  implements EntityPageInterface<Cmf.TestNamespace.BusinessObjects.TestEntityType>, LevelsToLoad
{
  /** Levels to load of the entity */
  epLevelsToLoad = 0;

  /** The entity to be presented in this view */
  epEntity: Cmf.TestNamespace.BusinessObjects.TestEntityType;
}
