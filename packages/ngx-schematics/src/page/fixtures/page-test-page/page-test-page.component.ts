import { Component, forwardRef, inject, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import {
  CustomizableComponent,
  HOST_VIEW_COMPONENT,
  ActionButtonBuildContextHandler
} from 'cmf-core';
import {
  BasePage,
  BasePageModule,
  ActionBarModule,
  ActionGroupModule,
  ActionButtonModule,
  RequiredFunctionalitiesModule
} from 'cmf-core-controls';

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
 * <test-lib-page-test-page></test-lib-page-test-page>
 * ```
 *
 * ### _NOTES_
 * (optional, Provide additional notes here)
 *
 * @description
 *
 * ## TestPageComponent Component
 */
@Component({
  selector: 'test-lib-page-test-page',
  imports: [
    BasePageModule,
    ActionBarModule,
    ActionButtonModule,
    ActionGroupModule,
    RequiredFunctionalitiesModule
  ],
  templateUrl: './page-test-page.component.html',
  styleUrl: './page-test-page.component.less',
  viewProviders: [
    { provide: HOST_VIEW_COMPONENT, useExisting: forwardRef(() => PageTestPageComponent) }
  ]
})
export class PageTestPageComponent extends CustomizableComponent {
  /** The nested Base Page element */
  private _nestedBasePage = viewChild(BasePage);

  /** Router */
  private _router = inject(Router);

  /**
   * Build context for Save Layout Button.
   * Here are defined the context variables for the wizardSaveLayout
   */
  onBuildContextHandlerForSaveLayoutWizard: ActionButtonBuildContextHandler = (
    context?: any
  ): Promise<any> => {
    return this._nestedBasePage().baseBuildContextForSaveLayoutWizard(
      context,
      null,
      null,
      this._router.url,
      null
    );
  };

  /**
   * Build context for Reset Layout Button.
   * Here are defined the context variables for the wizardResetLayout
   */
  onBuildContextHandlerForResetLayoutWizard: ActionButtonBuildContextHandler = (
    context?: any
  ): Promise<any> => {
    return this._nestedBasePage().baseBuildContextForResetLayoutWizard(
      context,
      null,
      null,
      this._router.url,
      null
    );
  };
}
