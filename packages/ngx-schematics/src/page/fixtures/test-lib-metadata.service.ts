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
  ActionData,
  LinkType,
  LinkTarget,
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
    return [
      {
        id: 'Test.PageTest',
        handler: (context: any): Promise<ActionData> => {
          return Promise.resolve({
            route: {
              type: LinkType.Internal,
              target: LinkTarget.Self,
              url: 'Test/PageTest',
              alt: ''
            }
          });
        }
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
    return [
      {
        id: 'Test.PageTest',
        menuGroupId: 'TestMenuGroup',
        title: $localize`:@@test-lib/page-test-page#TITLE:Test Page`,
        actionId: 'Test.PageTest',
        position: 1,
        iconClass: 'icon-test',
        requiredFunctionalities: 'Test.PageTest'
      }
    ];
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
    return [
      {
        id: KnownRoutes.Page,
        routes: [
          {
            path: 'Test/PageTest',
            loadComponent: async () =>
              (
                await import(
                  /* webpackExports: "PageTestPageComponent" */
                  'test-lib'
                )
              ).PageTestPageComponent,
            data: {
              title: $localize`:@@test-lib/page-test-page#TITLE:Test Page`,
              iconClass: 'icon-test',
              requiredFunctionalities: 'Test.PageTest'
            }
          }
        ]
      }
    ];
  }
}
