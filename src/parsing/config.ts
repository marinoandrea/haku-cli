import Ajv, {JSONSchemaType} from 'ajv';
import fs from 'fs/promises';
import yaml from 'js-yaml';
import path from 'path';

const HAKU_CONFIG_PATHS = ['haku.yml', 'haku.yaml'];

export interface HakuService {
  specPath: string;
}

interface HakuConfigCompilationDirectories {
  routing: string;
  controllers: string;
  useCases: string;
}

export interface HakuConfig {
  version: string;
  compilation:
    | {
        language: 'typescript';
        engine: {lib: 'express' | 'fastify'};
        directories: HakuConfigCompilationDirectories;
      }
    | {
        language: 'python';
        engine: {lib: 'flask'};
        directories: HakuConfigCompilationDirectories;
      };

  services: {
    [name: string]: HakuService;
  };
}

const ajv = new Ajv();

const hakuConfigSchema: JSONSchemaType<HakuConfig> = {
  type: 'object',
  properties: {
    version: {
      type: 'string',
      pattern: '[0-9]+\\.[0-9]+\\.[0-9]+',
      nullable: false,
    },
    compilation: {
      type: 'object',
      oneOf: [
        {
          properties: {
            language: {const: 'typescript'},
            engine: {
              type: 'object',
              properties: {
                lib: {type: 'string', enum: ['express']},
              },
            },
            directories: {
              type: 'object',
              properties: {
                routing: {type: 'string', nullable: false},
                controllers: {type: 'string', nullable: false},
                useCases: {type: 'string', nullable: false},
              },
              required: ['routing', 'controllers', 'useCases'],
            },
          },
        },
        {
          properties: {
            language: {const: 'python'},
            engine: {
              type: 'object',
              properties: {
                lib: {type: 'string', enum: ['express']},
              },
            },
            directories: {
              type: 'object',
              properties: {
                routing: {type: 'string', nullable: false},
                controllers: {type: 'string', nullable: false},
                useCases: {type: 'string', nullable: false},
              },
              required: ['routing', 'controllers', 'useCases'],
            },
          },
        },
      ],
      required: ['language', 'directories', 'engine'],
    },

    services: {
      type: 'object',
      patternProperties: {
        '[a-zA-Z_-]+': {
          type: 'object',
          properties: {
            specPath: {type: 'string', nullable: false},
          },
          required: ['specPath'],
        },
      },
      required: [],
    },
  },
  required: ['version', 'compilation', 'services'],
};

const validateHakuConfig = ajv.compile<HakuConfig>(hakuConfigSchema);

export async function loadConfig(): Promise<HakuConfig> {
  let config: HakuConfig | null = null;

  for (let configPath of HAKU_CONFIG_PATHS) {
    const absPath = path.join(process.cwd(), configPath);

    let raw: Buffer;
    try {
      raw = await fs.readFile(absPath);
    } catch (e) {
      console.debug(e);
      continue;
    }

    const data = yaml.load(raw.toString());
    if (!validateHakuConfig(data))
      throw new Error(
        `Invalid Haku config file. ${JSON.stringify(validateHakuConfig.errors)}`
      );

    config = data;
    break;
  }

  if (!config)
    throw new Error(`Haku config file is missing in folder '${process.cwd()}'`);

  return config;
}
