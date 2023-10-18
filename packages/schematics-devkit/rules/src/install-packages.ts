import { SpawnOptions, spawn } from 'child_process';
import * as ora from 'ora';

enum SaveOptions {
  SaveDev = '-D',
  SaveProd = '-P',
  NoSave = '--no-save'
}

function normalize(version: string): string {
  return version.replace(/^(.\d+)\.\d+\.\d+/, '$1');
}

function isInstalled(pkg: string): boolean {
  const [pkgName, requiredVersion] = pkg.split(/(?<!^)@/);
  let version: string;

  try {
    version = require(`${pkgName}/package.json`).version;
  } catch {
    return false;
  }

  if (normalize(version) === normalize(requiredVersion)) {
    return true;
  }

  return false;
}

export function installNpmPackages(
  pkgs: string[],
  save: SaveOptions = SaveOptions.NoSave
): Promise<void> {
  pkgs = pkgs.filter((pkg) => !isInstalled(pkg));
  if (pkgs.length === 0) {
    return Promise.resolve();
  }

  const bufferedOutput: { stream: NodeJS.WriteStream; data: Buffer }[] = [];
  const taskPackageManagerName = 'npm';
  const args = ['install', save, ...pkgs];
  const spawnOptions: SpawnOptions = {
    shell: true,
    stdio: ['ignore', 'ignore', 'pipe']
  };

  return new Promise<void>((resolve, reject) => {
    const spinner = ora({
      text: `Installing packages (${taskPackageManagerName})...`,
      // Workaround for https://github.com/sindresorhus/ora/issues/136.
      discardStdin: process.platform != 'win32'
    }).start();
    const childProcess = spawn(taskPackageManagerName, args, spawnOptions).on(
      'close',
      (code: number) => {
        if (code === 0) {
          spinner.succeed('Packages installed successfully.');
          spinner.stop();
          resolve();
        } else {
          bufferedOutput.forEach(({ stream, data }) => stream.write(data));
          spinner.fail('Package install failed, see above.');
          reject();
        }
      }
    );
    childProcess.stdout?.on('data', (data: Buffer) =>
      bufferedOutput.push({ stream: process.stdout, data: data })
    );
    childProcess.stderr?.on('data', (data: Buffer) =>
      bufferedOutput.push({ stream: process.stderr, data: data })
    );
  });
}
