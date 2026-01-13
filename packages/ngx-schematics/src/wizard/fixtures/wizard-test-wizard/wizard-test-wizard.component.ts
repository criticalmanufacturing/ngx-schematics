import { Component, forwardRef, inject, OnInit, viewChild } from '@angular/core';
import Cmf from 'cmf-lbos';
import { CustomizableComponent, HOST_VIEW_COMPONENT, UtilService, EntityTypeService } from 'cmf-core';
import { PageBag, Wizard, WizardStep, WizardEventArgs } from 'cmf-core-controls';
import { TransactionWizard, TransactionEventArgs, TransactionWizardDirective } from 'cmf-core-business-controls';

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
 * <test-lib-wizard-test-wizard></test-lib-wizard-test-wizard>
 * ```
 *
 * ### _NOTES_
 * (optional, Provide additional notes here)
 *
 * @description
 *
 * ## TestWizardComponent Component
 *
 */
@Component({
  selector: 'test-lib-wizard-test-wizard',
  imports: [Wizard, WizardStep, TransactionWizardDirective],
  templateUrl: './wizard-test-wizard.component.html',
  styleUrl: './wizard-test-wizard.component.less',
  viewProviders: [
    { provide: HOST_VIEW_COMPONENT, useExisting: forwardRef(() => WizardTestWizardComponent) }
  ]
})
export class WizardTestWizardComponent
  extends CustomizableComponent
  implements OnInit, TransactionWizard {
  /** The instance of the wizard */
  instance: Cmf.TestNamespace.BusinessObjects.TestEntityType;

  /** Dependencies */
  protected _util = inject(UtilService);
  protected _entityTypes = inject(EntityTypeService);
  protected _pageBag = inject(PageBag);

  /** The wizard element */
  private _nestedWizard = viewChild(Wizard);

  /**
   * NgOnInit. Sets the basic wizard content according to the pageBag context.
   */
  ngOnInit(): void {
    if (this._pageBag != null && this._pageBag.context != null) {
      if (
        this._pageBag.context.instance == null ||
        !this._util.instanceof(
          this._pageBag.context.instance,
          Cmf.TestNamespace.BusinessObjects.TestEntityType
        )
      ) {
        throw new Error(
          $localize`:@@test-lib/wizard-test-wizard#NO_INSTANCE_FOUND:No Instance Found`
        );
      }
    } else {
      throw new Error($localize`:@@test-lib/wizard-test-wizard#MISSING_CONTEXT:Missing context`);
    }
  }

  /**
   * Method that prepares the data for the wizard
   */
  prepareDataInput(): Promise<Cmf.Foundation.BusinessOrchestration.BaseInput[]> {
    const inputs: Cmf.Foundation.BusinessOrchestration.BaseInput[] = [];

    const instanceInput =
      new Cmf.Foundation.BusinessOrchestration.GenericServiceManagement.InputObjects.GetObjectByIdInput();
    instanceInput.IgnoreLastServiceId = true;
    instanceInput.Id = this._pageBag.context.instance.Id;
    instanceInput.Type = this._entityTypes.getEntityTypeNameFromInstance(
      this._pageBag.context.instance
    );
    inputs.push(instanceInput);

    return Promise.resolve(inputs);
  }

  /**
   * Method that receive the data from prepareDataInput
   */
  async handleDataOutput(
    outputs: Cmf.Foundation.BusinessOrchestration.BaseOutput[],
    wizardArgs?: WizardEventArgs
  ): Promise<void> {
    if (outputs != null && outputs.length >= 1) {
      const loadInstanceOutput =
        outputs[0] as Cmf.Foundation.BusinessOrchestration.GenericServiceManagement.OutputObjects.GetObjectByIdOutput;

      this.instance = loadInstanceOutput.Instance;
    }

    await this._nestedWizard().reEvaluateContextPreConditions({ instance: this.instance }, true);
  }

  /**
   * The wizard prepareTransactionInput method where we can append the input for the final wizard
   * @param args Current inputs where the user can append or simply resolve its own input.
   */
  prepareTransactionInput(
    args: TransactionEventArgs
  ): Promise<Cmf.Foundation.BusinessOrchestration.BaseInput> {
    const input = new Cmf.Foundation.BusinessOrchestration.BaseInput();
    input.IgnoreLastServiceId = true;

    return Promise.resolve(input);
  }

  /**
   * The wizard hook for handling the above service call.
   * @param output output object, result of the input created in the prepareTransactionInput
   */
  handleTransactionOutput(output: Cmf.Foundation.BusinessOrchestration.BaseOutput): Promise<void> {
    return Promise.resolve();
  }
}
