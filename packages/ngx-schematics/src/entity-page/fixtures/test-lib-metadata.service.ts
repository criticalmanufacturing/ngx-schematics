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
  DEFAULT_DETAILS_VIEW_ID,
  EntityTypeMetadataService,
  KnownRoutes
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
    return [];
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
    return [
      {
        name: 'TestEntityType',
        views: [
          {
            id: DEFAULT_DETAILS_VIEW_ID,
            loadComponent: async () =>
              (
                await import(
                  /* webpackExports: "PageTestEntityTypeDetailsViewComponent" */
                  'test-lib'
                )
              ).PageTestEntityTypeDetailsViewComponent
          }
        ]
      }
    ];
  }

  /**
   * Routes
   */
  override get routes(): RouteConfig[] {
    return [
      {
        id: KnownRoutes.Page,
        routes: [
          {
            path: 'Entity/TestEntityType/:id',
            loadChildren: async () =>
              EntityTypeMetadataService.getRoutes(
                'TestEntityType',
                (
                  await import(
                    /* webpackExports: "PageTestEntityTypeComponent" */
                    'test-lib'
                  )
                ).PageTestEntityTypeComponent
              )
          }
        ]
      }
    ];
  }
}
