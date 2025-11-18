import { chain, Rule } from '@angular-devkit/schematics';
import { migrate as migrateSuperExpressions } from '@criticalmanufacturing/schematics-devkit/migrations/update-12-0-0-super';

export default function (): Rule {
  return async () => {
    return chain([migrateSuperExpressions({ path: './' })]);
  };
}
