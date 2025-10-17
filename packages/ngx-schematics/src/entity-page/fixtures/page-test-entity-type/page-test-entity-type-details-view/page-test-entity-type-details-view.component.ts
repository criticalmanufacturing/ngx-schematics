import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import Cmf from 'cmf-lbos';
import { CustomizableComponent } from 'cmf-core';
import { EntityPageService, DetailsViewModule } from 'cmf-core-business-controls';

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
  selector: 'test-lib-page-test-entity-type-details-view',
  imports: [DetailsViewModule],
  templateUrl: './page-test-entity-type-details-view.component.html'
})
export class PageTestEntityTypeDetailsViewComponent extends CustomizableComponent {
  /** Entity Page service */
  private _entityPage = inject(EntityPageService);

  /** The entity to be presented in this view */
  epEntity: Cmf.TestNamespace.BusinessObjects.TestEntityType;

  /**
   * Constructor
   */
  constructor() {
    super();

    this.epOnEntityLoaded();
    this._entityPage.epEntityLoaded
      .pipe(takeUntilDestroyed())
      .subscribe(this.epOnEntityLoaded.bind(this));
  }

  /**
   * When the entity is loaded by the Entity Page, chooses which properties to display
   */
  epOnEntityLoaded(): void {
    this.epEntity = this._entityPage.epEntity as Cmf.TestNamespace.BusinessObjects.TestEntityType;
  }
}
