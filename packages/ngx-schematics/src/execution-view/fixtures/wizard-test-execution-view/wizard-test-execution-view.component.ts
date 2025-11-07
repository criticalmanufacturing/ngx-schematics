import { Component, forwardRef, inject, OnInit, viewChild } from '@angular/core';
import Cmf from 'cmf-lbos';
import {
  CustomizableComponent,
  HOST_VIEW_COMPONENT,
  EntityTypeService,
  UtilService
} from 'cmf-core';
import {
  ExecutionViewModule,
  ExecutionView,
  ExecutionViewEventArgs,
  PageBag
} from 'cmf-core-controls';
import {
  TransactionExecutionView,
  TransactionExecutionViewModule,
  TransactionEventArgs
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
 * <test-lib-wizard-test-execution-view></test-lib-wizard-test-execution-view>
 * ```
 *
 * ### _NOTES_
 * (optional, Provide additional notes here)
 *
 * @description
 *
 * ## TestExecutionViewComponent Component
 */
@Component({
  selector: 'test-lib-wizard-test-execution-view',
  imports: [ExecutionViewModule, TransactionExecutionViewModule],
  templateUrl: './wizard-test-execution-view.component.html',
  styleUrl: './wizard-test-execution-view.component.less',
  viewProviders: [
    {
      provide: HOST_VIEW_COMPONENT,
      useExisting: forwardRef(() => WizardTestExecutionViewComponent)
    }
  ]
})
export class WizardTestExecutionViewComponent
  extends CustomizableComponent
  implements OnInit, TransactionExecutionView
{
  /** The instance of the execution view */
  instance: Cmf.TestNamespace.BusinessObjects.TestEntityType;

  /** Dependencies */
  protected _util = inject(UtilService);
  protected _entityTypes = inject(EntityTypeService);
  protected _pageBag = inject(PageBag);

  /** Nested execution view */
  private _nestedExecutionView = viewChild(ExecutionView);

  /**
   * NgOnInit. Sets the basic wizard content according to the pageBag context.
   */
  ngOnInit(): void {
    if (this._pageBag.context != null) {
      if (
        this._pageBag.context.instance == null ||
        !this._util.instanceof(
          this._pageBag.context.instance,
          Cmf.TestNamespace.BusinessObjects.TestEntityType
        )
      ) {
        throw new Error(
          $localize`:@@test-lib/wizard-test-execution-view#NO_INSTANCE_FOUND:No Instance Found`
        );
      }
    } else {
      throw new Error(
        $localize`:@@test-lib/wizard-test-execution-view#MISSING_CONTEXT:Missing context`
      );
    }
  }

  /**
   * Method that prepares the data for the execution view
   */
  async prepareDataInput(): Promise<Cmf.Foundation.BusinessOrchestration.BaseInput[]> {
    const inputs: Cmf.Foundation.BusinessOrchestration.BaseInput[] = [];

    const instanceInput =
      new Cmf.Foundation.BusinessOrchestration.GenericServiceManagement.InputObjects.GetObjectByIdInput();
    instanceInput.IgnoreLastServiceId = true;
    instanceInput.Id = this._pageBag.context.instance.Id;
    instanceInput.Type = this._entityTypes.getEntityTypeNameFromInstance(
      this._pageBag.context.instance
    );
    inputs.push(instanceInput);

    return inputs;
  }

  /**
   * Method that receive the data from prepareDataInput
   */
  async handleDataOutput(
    outputs: Cmf.Foundation.BusinessOrchestration.BaseOutput[],
    executionViewArgs?: ExecutionViewEventArgs
  ): Promise<void> {
    if (outputs != null && outputs.length >= 1) {
      const loadInstanceOutput =
        outputs[0] as Cmf.Foundation.BusinessOrchestration.GenericServiceManagement.OutputObjects.GetObjectByIdOutput;

      this.instance = loadInstanceOutput.Instance;
    }

    await this._nestedExecutionView().reEvaluateContextPreConditions(
      { instance: this.instance },
      true
    );
  }

  /**
   * The execution view prepareTransactionInput method where we can append the input for the final execution view
   * @param args Current inputs where the user can append or simply resolve its own input.
   */
  async prepareTransactionInput(
    args: TransactionEventArgs
  ): Promise<Cmf.Foundation.BusinessOrchestration.BaseInput> {
    const input = new Cmf.Foundation.BusinessOrchestration.BaseInput();
    input.IgnoreLastServiceId = true;

    return input;
  }

  /**
   * The execution view hook for handling the above service call.
   * @param output output object, result of the input created in the prepareTransactionInput
   */
  async handleTransactionOutput(
    output: Cmf.Foundation.BusinessOrchestration.BaseOutput
  ): Promise<void> {
    return;
  }
}
