import { Injectable } from '@angular/core';
import {
  RouteConfig,
  PackageMetadata,
  Action,
  MenuGroup,
  MenuItem,
  ActionButton,
  ActionButtonGroup,
  EntityTypeMetadata,
  PackageInfo,
  ActionMode
} from 'cmf-core';

@Injectable()
export class TestLibMetadataService extends PackageMetadata {
  /**
   * Package Info
   */
  override get packageInfo(): PackageInfo {
    return {
      name: 'test-lib',
      loader: () =>
        import(
          /* webpackExports: [] */
          'test-lib'
        ),
      converters: [],
      widgets: [],
      dataSources: [],
      components: []
    };
  }

  /**
   * Action Button Groups
   */
  override get actionButtonGroups(): ActionButtonGroup[] {
    return [];
  }

  /**
   * Action Buttons
   */
  override get actionButtons(): ActionButton[] {
    return [];
  }

  /**
   * Actions
   */
  override get actions(): Action[] {
    return [
      {
        id: 'TestEntityType.TestWizard',
        loadComponent: async () =>
          (
            await import(
              /* webpackExports: "WizardTestWizardComponent" */
              'test-lib'
            )
          ).WizardTestWizardComponent,
        mode: ActionMode.ModalPage
      }
    ];
  }

  /**
   * Menu Groups
   */
  override get menuGroups(): MenuGroup[] {
    return [];
  }

  /**
   * Menu Items
   */
  override get menuItems(): MenuItem[] {
    return [];
  }

  /**
   * Entity Types
   */
  override get entityTypes(): EntityTypeMetadata[] {
    return [];
  }

  /**
   * Routes
   */
  override get routes(): RouteConfig[] {
    return [];
  }
}
