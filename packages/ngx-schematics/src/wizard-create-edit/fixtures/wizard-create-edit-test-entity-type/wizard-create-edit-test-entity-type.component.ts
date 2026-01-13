import { Component, inject, OnInit } from '@angular/core';
import Cmf from 'cmf-lbos';
import { CustomizableComponent, UtilService, EntityTypeService } from 'cmf-core';
import { PageBag } from 'cmf-core-controls';
import { EditMode, CreateEditEntity, CreateEditStepGeneralData } from 'cmf-core-business-controls';

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
 * <test-lib-wizard-create-edit-test-entity-type></test-lib-wizard-create-edit-test-entity-type>
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
  selector: 'test-lib-wizard-create-edit-test-entity-type',
  imports: [CreateEditEntity, CreateEditStepGeneralData],
  templateUrl: './wizard-create-edit-test-entity-type.component.html',
  styleUrl: './wizard-create-edit-test-entity-type.component.less'
})
export class WizardCreateEditTestEntityTypeComponent
  extends CustomizableComponent
  implements OnInit {
  /** Wizard mode */
  editMode: EditMode = EditMode.Create;

  /** Wizard title */
  title: string;

  /** Wizard action name */
  action: string;

  /** The instance of the wizard */
  instance: Cmf.TestNamespace.BusinessObjects.TestEntityType;

  /** Dependencies */
  protected _util = inject(UtilService);
  protected _entityTypes = inject(EntityTypeService);
  protected _pageBag = inject(PageBag);

  /**
   * NgOnInit. Sets the basic wizard content according to the pageBag context
   */
  ngOnInit(): void {
    if (this._pageBag != null && this._pageBag.context != null) {
      if (this._pageBag.context.editMode != null) {
        this.editMode = this._pageBag.context.editMode;
      }

      // edit mode
      if (this._pageBag.context.editMode === EditMode.Edit) {
        if (
          this._pageBag.context.instance == null ||
          !this._util.instanceof(
            this._pageBag.context.instance,
            Cmf.TestNamespace.BusinessObjects.TestEntityType
          )
        ) {
          throw new Error(
            $localize`:@test-lib/test-entity-type#NO_INSTANCE_FOUND:No Instance Found`
          );
        }

        this.title = $localize`:@@test-lib/wizard-create-edit-test-entity-type#TITLE_EDIT:Edit Test Entity Type`;
        this.action = $localize`:@@test-lib/wizard-create-edit-test-entity-type#SAVE:Save`;
      } else {
        this.title = $localize`:@@test-lib/wizard-create-edit-test-entity-type#TITLE_CREATE:Create Test Entity Type`;
        this.action = $localize`:@@test-lib/wizard-create-edit-test-entity-type#CREATE:Create`;
        this.instance = new Cmf.TestNamespace.BusinessObjects.TestEntityType();
      }
    } else {
      throw new Error(
        $localize`:@@test-lib/wizard-create-edit-test-entity-type#MISSING_CONTEXT:Missing context`
      );
    }
  }

  /**
   * On Initial Setup Start from the createEditEntity
   */
  onInitialSetupStart = (): Cmf.Foundation.BusinessOrchestration.BaseInput[] => {
    let inputs: Cmf.Foundation.BusinessOrchestration.BaseInput[] = [];

    if (EditMode.Edit === this.editMode) {
      const loadInstanceInput =
        new Cmf.Foundation.BusinessOrchestration.GenericServiceManagement.InputObjects.GetObjectByIdInput();
      loadInstanceInput.Id = this._pageBag.context.instance.Id;
      loadInstanceInput.Type = this._entityTypes.getEntityTypeTypeName(
        this._pageBag.context.instance
      );

      inputs.push(loadInstanceInput);
    }

    return inputs;
  };

  /**
   * On Initial Steup Finish from the createEditEntity
   * @param instance any
   * @param outputs BaseOutput[]
   */
  onInitialSetupFinish = (
    instance: any,
    outputs: Cmf.Foundation.BusinessOrchestration.BaseOutput[]
  ): void => {
    if (EditMode.Edit === this.editMode) {
      if (outputs != null && outputs.length >= 1) {
        const loadInstanceOutput =
          outputs[0] as Cmf.Foundation.BusinessOrchestration.GenericServiceManagement.OutputObjects.GetObjectByIdOutput;

        this.instance = loadInstanceOutput.Instance;
      } else {
        throw new Error(
          $localize`:@@test-lib/test-entity-type#LOAD_INSTANCE:Error Loading Instance`
        );
      }
    }
  };

  /**
   * On Before Service Call from the createEditEntity
   */
  onBeforeServiceCall = (): Cmf.Foundation.BusinessOrchestration.BaseInput => {
    const input = new Cmf.Foundation.BusinessOrchestration.BaseInput();
    return input;
  };
}
