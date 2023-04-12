import { strings as ngStrings } from '@angular-devkit/core';

/**
 * Nameify RegExp
 */
const STRING_NAMEIFY_REGEXP_1 = /([a-z\d])([A-Z]+)/g;

/**
 * Nameifies a string
 * @param str string to nameify.
 */
function nameify(str: string): string {
  return strings.classify(str).replace(STRING_NAMEIFY_REGEXP_1, '$1 $2');
}

export const strings = { ...ngStrings, nameify };
