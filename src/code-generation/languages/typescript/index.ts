import SwaggerParser from '@apidevtools/swagger-parser';
import {OpenAPIV3_1} from 'openapi-types';
import path from 'path';
import * as tsMorph from 'ts-morph';
import {HakuConfig, HakuService} from '../../../parsing/config';
import {
  camelize,
  capitalize,
  makeHumanReadableControllerName,
} from '../../../utils/strings';

export default async function generateTypeScriptProject(config: HakuConfig) {
  const project = await initProject(config);
  for (let [sName, sInfo] of Object.entries(config.services)) {
    const spec = await SwaggerParser.validate(sInfo.specPath.toString());
    if (!spec.paths) return;
    await generateController(
      project,
      sName,
      config,
      sInfo,
      // TODO: implement a check for the OpenAPI version
      spec as OpenAPIV3_1.Document
    );
  }
  await project.save();
}

async function initProject(config: HakuConfig): Promise<tsMorph.Project> {
  const tsConfigFilePath = path.join(process.cwd(), 'tsconfig.json');
  const project = new tsMorph.Project({tsConfigFilePath});
  project.addSourceFilesAtPaths('src/**/*.ts');
  await generateBaseSourceFiles(project, config);
  return project;
}

async function generateBaseSourceFiles(
  project: tsMorph.Project,
  config: HakuConfig
) {
  const controllerInterfacesSourceFile = project.createSourceFile(
    path.join(config.compilation.directories.controllers, `interfaces.ts`),
    undefined,
    {overwrite: true}
  );

  controllerInterfacesSourceFile.addImportDeclarations([
    {moduleSpecifier: 'http', namedImports: ['IncomingHttpHeaders']},
    {moduleSpecifier: 'querystring', namedImports: ['ParsedUrlQuery']},
  ]);

  controllerInterfacesSourceFile.addInterfaces([
    {
      name: 'HttpRequest',
      isExported: true,
      properties: [
        {name: 'method', type: 'string'},
        {name: 'resource', type: 'string'},
        {name: 'body', type: 'unknown'},
        {name: 'params', type: '{[key: string]: string}'},
        {name: 'headers', type: 'IncomingHttpHeaders'},
        {name: 'query', type: 'ParsedUrlQuery'},
      ],
    },
    {
      name: 'HttpResponse',
      isExported: true,
      typeParameters: ['SuccessBody', 'ErrorBody'],
      properties: [
        {name: 'body', type: 'SuccessBody | ErrorBody'},
        {name: 'headers', type: 'any', hasQuestionToken: true},
        {name: 'status', type: 'number'},
        {name: 'contentType', type: 'string'},
        {name: 'contentDisposition', type: `'inline' | 'attachment'`},
        {name: 'raw', type: 'boolean'},
      ],
    },
  ]);

  const controllerValidationSourceFile = project.createSourceFile(
    path.join(config.compilation.directories.controllers, `validation.ts`),
    undefined,
    {overwrite: true}
  );

  controllerValidationSourceFile.addImportDeclarations([
    {moduleSpecifier: 'ajv', defaultImport: 'Ajv'},
  ]);

  controllerValidationSourceFile.addVariableStatement({
    isExported: true,
    declarations: [{name: 'ajv', initializer: 'new Ajv()'}],
  });
}

async function generateController(
  project: tsMorph.Project,
  name: string,
  config: HakuConfig,
  _service: HakuService,
  spec: OpenAPIV3_1.Document
) {
  const serviceCamelCaseName = camelize(name);
  const controllerClassName = `${capitalize(serviceCamelCaseName)}Controller`;

  const controllerClassFile = project.createSourceFile(
    path.join(
      config.compilation.directories.controllers,
      `${name}.controller.ts`
    ),
    `export class ${controllerClassName} {}`,
    {overwrite: true}
  );

  controllerClassFile.addImportDeclarations([
    {
      moduleSpecifier: './interfaces',
      namedImports: ['HttpRequest', 'HttpResponse'],
    },
  ]);

  const controllerClass = controllerClassFile.getClass(controllerClassName);
  if (!controllerClass)
    throw new Error(`Failed to create ${controllerClassName}`);

  if (!spec.paths) return;

  for (let [path, info] of Object.entries(spec.paths)) {
    if (!info) continue;

    const pathName = makeHumanReadableControllerName(path);

    for (let [method, _methodDesc] of Object.entries(info)) {
      // make sure we only deal with HTTP methods
      if (!['put', 'post', 'get', 'delete'].includes(method)) continue;

      // TODO: allow for string descriptions?
      if (typeof _methodDesc === 'string' || !_methodDesc) continue;

      const methodDesc = _methodDesc as OpenAPIV3_1.ComponentsObject;

      const resBodyTypeName = `${capitalize(method)}${pathName}ResponseBody`;

      // add response types
      controllerClassFile.addTypeAlias({
        name: resBodyTypeName,
        type: w => {
          if (!methodDesc.responses) return;
          w.writeLine('{');
          for (let [rCode, _rDesc] of Object.entries(methodDesc.responses)) {
            if (
              !(Number.parseInt(rCode) < 300 && Number.parseInt(rCode) >= 200)
            )
              continue;
            const rDesc = _rDesc as OpenAPIV3_1.ResponseObject;
            if (!rDesc.content || !rDesc.content['application/json']) break;
            const content = rDesc.content['application/json'];
            content.schema;
          }
          w.writeLine('}');
        },
      });

      const validationFunctionName = `validate${capitalize(
        method
      )}${pathName}Body`;

      const controllerMethod = controllerClass.addMethod({
        name: `${method}${pathName}`,
        isStatic: true,
        parameters: [{name: 'req', type: 'HttpRequest'}],
        returnType: 'Promise<HttpResponse<>>',
      });

      controllerMethod.addVariableStatement({
        declarations: [
          {
            name: 'validatedBody',
            initializer: `${validationFunctionName}(req.body)`,
          },
        ],
      });

      controllerMethod.addVariableStatement({
        declarations: [
          {
            name: 'res',
            type: 'HttpResponse<>',
            initializer: `{
              body: {},
              headers: {},
              status: 200,
              contentType: ${methodDesc},
              contentDisposition: 'inline',
              raw: false,
            }`,
          },
        ],
      });
    }
  }
}
