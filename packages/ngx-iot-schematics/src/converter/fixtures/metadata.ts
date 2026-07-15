import { ConnectIoTPackageMetadata } from 'cmf-core-connect-iot/extensions';

export const Metadata: ConnectIoTPackageMetadata = {
  name: '@testlib/testlib',
  friendlyName: '',
  version: '',
  load: () => import('@testlib/testlib'),
  tasks: [
    'testlib'
  ],
  converters: [
    'testConverter'
  ],
  fonts: []
};
