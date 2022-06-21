import { UnitTestTree } from "@angular-devkit/schematics/testing";

export function getAllFilesFromDir(dir: string, tree: UnitTestTree): string[] {

    const files: string[] = [];

    const directory = tree.getDir(dir);

    if (directory.subdirs.length > 0) {
        directory.subdirs.forEach(subdir => {
            files.push(...getAllFilesFromDir(`${dir}/${subdir}`, tree));
        });
    }

    files.push(...tree.getDir(dir).subfiles.map(file => `${dir}/${file}`));

    return files;
}