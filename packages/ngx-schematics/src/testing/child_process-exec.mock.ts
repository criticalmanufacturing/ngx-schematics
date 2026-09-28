import { ExecException, ExecOptionsWithBufferEncoding } from 'node:child_process';

const mockedExec = vi.fn(
  (
    cmd: string,
    _: ExecOptionsWithBufferEncoding,
    callback: (error: ExecException | null, output: { stdout: string; stderr: string }) => void
  ) => {
    const [pkg, version] = cmd.match(/npm view (.+?)@(.+) peerDependencies --json/)?.slice(1) ?? [];

    if (pkg === 'cmf-core-ui') {
      callback(null, {
        stdout: `{ "cmf-core": "${version}" }`,
        stderr: ''
      });
    } else if (pkg === 'cmf-mes-ui') {
      callback(null, {
        stdout: `{ "cmf-core": "${version}", "cmf-mes": "${version}" }`,
        stderr: ''
      });
    } else {
      const error = Object.assign(new Error(`Package ${pkg} not found`), { cmd });
      callback(error, { stdout: '', stderr: '' });
    }
  }
);

vi.mock('node:child_process', () => ({ exec: mockedExec }));
require('node:child_process').exec = mockedExec;
