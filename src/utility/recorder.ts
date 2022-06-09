import { UpdateRecorder } from "@angular-devkit/schematics";

export type Change = [[number, number], string];

export function updateRecorder(recorder: UpdateRecorder, changes: Change[]) {
    if (changes.length === 0) {
        return;
    }

    changes.sort((a, b) => b[0][1] - a[0][1])
        .reduce((sorted, curr) => {
            const prev = sorted[sorted.length - 1];

            if (!prev || prev[0][0] > curr[0][1]) {
                sorted.push(curr);
            } else if (prev[0][0] > curr[0][0] && prev[1] === curr[1]) {
                prev[0][0] = curr[0][0];
            }

            return sorted;
        }, [] as [[number, number], string][])
        .forEach(([[start, end], text], index, sorted) => {
            const prev = sorted[index - 1];

            if (prev && prev[0][0] < end) {
                throw new Error(`Error replacing text in file`);
            }

            recorder.remove(start, end - start);
            recorder.insertLeft(start, text);
        });
}