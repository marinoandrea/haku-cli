import generateTypeScriptProject from './src/code-generation/languages/typescript';
import {loadConfig} from './src/parsing/config';

export async function main() {
  const config = await loadConfig();
  switch (config.compilation.language) {
    case 'typescript':
      await generateTypeScriptProject(config);
      break;
    case 'python':
    default:
      throw Error(`Language ${config.compilation.language} not implemented.`);
  }
}

main();
