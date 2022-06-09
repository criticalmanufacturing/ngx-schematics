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


/**
 * Updates the space identation in a string
 * @param spacesToUse Spaces to use in the identation
 */
export function updateSpaces(spacesToUse: number, initialSpaces: number = 2) {
    return (strings: TemplateStringsArray, ...substitutions: any[]) => {
        return String.raw(strings, ...substitutions).replace(/^([ \t]+)/gm, (_, match: string) => {
            const spaces = match.split('').reduce((res, char) => res += char === ' ' ? 1 : 2, 0)
            return `${' '.repeat(Math.floor(spaces / initialSpaces) * spacesToUse + spaces % 2)}`;
        });
    };
}