import { Path, relative, strings } from "@angular-devkit/core";

const STRING_NAMEIFY_REGEXP_1 = /([a-z\d])([A-Z]+)/g;

/**
 * Nameifies a string
 * @param str string to nameify.
 */
export function nameify(str: string): string {
    return strings.classify(str).replace(STRING_NAMEIFY_REGEXP_1, '$1 $2');
}

/**
 * Builds the relative path from one path to another
 * @param from From Path
 * @param to To Path
 */
export function buildRelativePath(from: Path, to: Path): string {
    let relativePath: string = relative(from, to);

    if (!relativePath.startsWith('.')) {
        relativePath = `./` + relativePath;
    }

    return relativePath;
}