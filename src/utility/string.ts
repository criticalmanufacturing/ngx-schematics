import { strings } from "@angular-devkit/core";

/**
 * Nameify RegExp
 */
const STRING_NAMEIFY_REGEXP_1 = /([a-z\d])([A-Z]+)/g;

/**
 * Nameifies a string
 * @param str string to nameify.
 */
export function nameify(str: string): string {
    return strings.classify(str).replace(STRING_NAMEIFY_REGEXP_1, '$1 $2');
}
