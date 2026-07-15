import { chain, Rule } from '@angular-devkit/schematics';
import { migrate as migrateSuperExpressions } from '@criticalmanufacturing/schematics-devkit/migrations/update-12-0-0-super';
import { migrate as migrateStandalone } from '@criticalmanufacturing/schematics-devkit/migrations/update-12-0-0-standalone';

export default function (): Rule {
  return () => {
    return chain([migrateSuperExpressions({ path: './' }), migrateStandalone({ path: './' })]);
  };
}
