import { input, select } from '@inquirer/prompts';

/**
 * Prompts the user for a namespace
 */
export async function promptNamespace(): Promise<string> {
  const namespace = await select<string | undefined>({
    message: 'What is the business objects namespace of the entity type?',
    choices: ['Foundation', 'Navigo', 'Other (specify)']
  });

  if (!namespace || namespace.startsWith('Other')) {
    return await input({ message: 'Namespace' });
  }

  return namespace;
}
