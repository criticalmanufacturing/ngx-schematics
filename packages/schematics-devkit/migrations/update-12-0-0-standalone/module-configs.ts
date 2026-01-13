const EXECUTION_VIEW = {
  'cmf-core-controls': {
    ExecutionView: 'cmf-core-controls-execution-view',
    ExecutionViewTab: 'cmf-core-controls-execution-view-tab',
    ExecutionViewHeader: 'cmf-core-controls-execution-view-header',
    ExecutionViewFooter: 'cmf-core-controls-execution-view-footer',
    ExecutionViewResult: 'cmf-core-controls-execution-view-result'
  }
};

const WIZARD = {
  'cmf-core-controls': {
    Wizard: 'cmf-core-controls-wizard',
    WizardStep: 'cmf-core-controls-wizard-step',
    WizardFooterContentDirective: 'cmf-core-controls-wizard-footer-custom-component'
  }
};

/**
 * Defines modules that exported multiple components and their matching selectors.
 */
export const MODULE_EXPORTS: Record<
  string,
  Record<string, Record<string, Record<string, string>>>
> = {
  'cmf-core-business-controls': {
    CreateEditEntityModule: {
      'cmf-core-controls': {
        DeferInstantiation: 'cmf-core-controls-defer-instantiation'
      },
      'cmf-core-business-controls': {
        CreateEditEntity: 'cmf-core-business-controls-createeditentity',
        CreateEditStep: 'cmf-core-business-controls-createeditstep',
        CreateEditStepGeneralData: 'cmf-core-business-controls-createeditstepgeneraldata',
        CreateEditStepGeneralDataDetails:
          'cmf-core-business-controls-createeditstepgeneraldatadetails'
      }
    },
    EntityPropertiesViewerModule: {
      'cmf-core-business-controls': {
        EntityPropertiesViewer: 'cmf-core-business-controls-entitypropertiesviewer',
        CustomViewerTemplate: 'cmf-core-business-controls-entitypropertiesviewercustomviewer'
      }
    },
    ScheduleViewModule: {
      'cmf-core-business-controls': {
        ScheduleView: 'cmf-core-business-controls-scheduleview',
        ScheduleViewHeaderFiltersDirective: 'cmf-core-business-controls-scheduleview-header-filters'
      }
    },
    ShoppingCartModule: {
      'cmf-core-business-controls': {
        ShoppingCart: 'cmf-core-business-controls-shoppingcart',
        ShoppingCartFilterBarItems: 'shopping-cart-filter-bar-items'
      }
    },
    TransactionExecutionViewModule: {
      ...EXECUTION_VIEW,
      'cmf-core-business-controls': {
        TransactionExecutionViewDirective: '[cmf-core-business-controls-transaction-execution-view]'
      }
    },
    TransactionWizardModule: {
      ...WIZARD,
      'cmf-core-business-controls': {
        TransactionWizardDirective: '[cmf-core-business-controls-transaction-wizard]'
      }
    },
    WizardChangeStateModule: {
      'cmf-core-business-controls': {
        WizardChangeState: 'cmf-core-shell-wizardChangeState',
        ChangeStateStep: 'cmf-core-shell-wizardChangeState-steps-changeStateStep'
      }
    }
  },
  'cmf-core-checklist': {
    PerformInstanceModule: {
      'cmf-core-checklist': {
        PerformInstance: 'cmf-core-checklist-perform-checklist-instance',
        PerformImmediateChecklistInstance:
          'cmf-core-checklist-perform-immediate-checklist-instance',
        PerformLongRunningChecklistInstance:
          'cmf-core-checklist-perform-longrunning-checklist-instance',
        PerformItemParameters: 'cmf-core-checklist-performitemparameters',
        PerformChecklistInstanceBOMSectionTemplate:
          'cmf-core-checklist-perform-instance-item-bom-section'
      }
    }
  },
  'cmf-core-controls': {
    BasePageModule: {
      'cmf-core-controls': {
        BasePage: 'cmf-core-controls-base-page',
        BasePageSections: 'cmf-core-controls-page-sections',
        BasePageSingleSection: 'cmf-core-controls-page-single-section',
        PageTitle: 'cmf-core-controls-page-title'
      }
    },
    CollapsiblePanelsMenuModule: {
      'cmf-core-controls': {
        CollapsiblePanelsMenuPanelBar: 'cmf-core-controls-collapsible-panels-menu-panel-bar',
        CollapsiblePanelsMenu: 'cmf-core-controls-collapsible-panels-menu'
      }
    },
    ColumnViewModule: {
      'cmf-core-controls': {
        ColumnView: 'cmf-core-controls-columnview',
        LeafContent: 'leaf-content'
      }
    },
    DateTimeRangeFilterModule: {
      'cmf-core-controls': {
        DateTimeRangePicker: 'cmf-core-controls-datetimerangepicker',
        DateTimeRangeFilter: 'cmf-core-controls-datetimerangefilter'
      }
    },
    DialogModule: {
      'cmf-core-controls': {
        Dialog: 'cmf-core-controls-dialog',
        DialogFeedback: 'cmf-core-controls-dialogfeedback'
      }
    },
    DropdownModule: {
      'cmf-core-controls': {
        Dropdown: 'cmf-core-controls-dropdown',
        DropdownTitle: 'cmf-core-controls-title-dropdown'
      }
    },
    ExecutionViewModule: EXECUTION_VIEW,
    MatrixModule: {
      'cmf-core-controls': {
        Matrix: 'cmf-core-controls-matrix',
        MatrixMainRowCustomItems: '[cmf-core-controls-matrixMainRowCustomItems]',
        MatrixMainRowCustomTitle: '[cmf-core-controls-matrixMainRowCustomTitle]',
        MatrixCellCustomContent: '[cmf-core-controls-matrixCellCustomContent]',
        MatrixRowGroupItemCustomContent: '[cmf-core-controls-matrixRowGroupItemCustomContent]',
        MatrixColumnGroupCustomContent: '[cmf-core-controls-matrixColumnGroupCustomContent]'
      }
    },
    ModalModule: {
      'cmf-core-controls': {
        ModalHandlerDirective: '[cmf-core-controls-modal-handler]',
        ModalViewComponent: 'cmf-core-controls-modalview'
      }
    },
    PageSectionModule: {
      'cmf-core-controls': {
        PageSection: 'cmf-core-controls-page-section',
        PageSectionHeaderDirective: '[cmf-core-controls-page-section-header]'
      }
    },
    PageSplitterModule: {
      'cmf-core-controls': {
        PageSplitter: 'cmf-core-controls-pagesplitter',
        PageSplitterPane: 'cmf-core-controls-pagesplitter-pane',
        PaneLeft: 'cmf-core-controls-pagesplitter-panel[side=left]',
        PaneRight: 'cmf-core-controls-pagesplitter-panel[side=right]',
        PaneCenter: 'cmf-core-controls-pagesplitter-panel[side=center]'
      }
    },
    PanelBarModule: {
      'cmf-core-controls': {
        PanelBar: 'cmf-core-controls-panelbar',
        PanelBarHeader: 'cmf-core-controls-panelbar-header',
        PanelBarBody: 'cmf-core-controls-panelbar-body'
      }
    },
    PopOverModule: {
      'cmf-core-controls': {
        PopOver: 'cmf-core-controls-popOver',
        PopOverContent: 'cmf-core-controls-popover-content',
        PopOverWidgetContent: 'cmf-core-controls-popover-widget-content'
      }
    },
    PopUpModule: {
      'cmf-core-controls': {
        PopUp: 'cmf-core-controls-popup',
        PopUpContent: 'cmf-core-controls-popup-content'
      }
    },
    SingleColumnViewModule: {
      'cmf-core-controls': {
        SingleColumnView: 'cmf-core-controls-single-column-view',
        SingleColumnViewGroupTemplate: '[cmf-core-controls-singlecolumnview-grouptemplate]',
        SingleColumnViewRowTemplate: '[cmf-core-controls-singlecolumnview-rowtemplate]',
        SingleColumnViewLeafTemplate: '[cmf-core-controls-singlecolumnview-leaftemplate]',
        SingleColumnViewMobileLeafHeaderTemplate:
          '[cmf-core-controls-singlecolumnview-mobileleafheadertemplate]',
        SingleColumnViewLeftHeaderTemplate:
          '[cmf-core-controls-singlecolumnview-leftheadertemplate]'
      }
    },
    SlimPopoverModule: {
      'cmf-core-controls': {
        SlimPopover: 'cmf-core-controls-slim-popover',
        SlimPopoverAnchor: '[cmf-core-controls-slim-popover-anchor]',
        SlimPopoverContent: '[cmf-core-controls-slim-popover-content]'
      }
    },
    TreeViewModule: {
      'cmf-core-controls': {
        TreeView: 'cmf-core-controls-treeView',
        TreeViewNodeTemplate: '[cmf-core-controls-treeView-nodeTemplate]'
      }
    },
    WizardModule: WIZARD
  },
  'cmf-mes-checklist': {
    PerformInstanceAssemblyStationModule: {
      'cmf-mes-checklist': {
        PerformInstanceAssemblyStation:
          'cmf-mes-checklist-perform-checklist-instance-assembly-station',
        PerformLongRunningChecklistInstanceAssemblyStation:
          'cmf-mes-checklist-perform-longRunning-checklist-instance-assembly-station',
        PerformChecklistInstanceBOMSectionTemplate:
          '[cmf-mes-checklist-perform-instance-item-bom-section]',
        PerformChecklistInstanceBOMSectionIconsTemplate:
          '[cmf-mes-checklist-perform-instance-item-bom-section-icons]'
      }
    }
  }
};

/**
 * Defines modules the component class name exported by a module.
 */
export const MODULE_COMPONENT = {
  'cmf-core-controls': {
    DynamicModule: 'DynamicDirective',
    SortingToggleModule: 'SortingToggleComponent',
    WizardMobileStickyHeaderModule: 'WizardMobileStickyHeaderDirective'
  },
  'cmf-core-business-controls': {
    EntityListViewModule: 'BusinessEntityListView'
  },
  'cmf-core-shell': {
    CreditsModule: 'CreditsComponent'
  },
  'cmf-mes-business-controls': {
    LossClassificationsModule: 'LossClassificationsComponent'
  }
} as Record<string, Record<string, string>>;
