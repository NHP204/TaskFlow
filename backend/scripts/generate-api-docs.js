// Validates the OpenAPI spec and renders docs/api-specification.md from it.
// Usage: node scripts/generate-api-docs.js [--check]
import fs from 'node:fs';
import path from 'node:path';
import SwaggerParser from '@apidevtools/swagger-parser';
import openapi from '../src/docs/openapi.js';

const OUTPUT = path.resolve(import.meta.dirname, '../../docs/api-specification.md');
const METHODS = ['get', 'post', 'patch', 'delete'];

const schemaName = (schema) => schema?.$ref?.split('/').pop();

function typeOf(schema) {
  if (!schema) return '';
  if (schema.$ref) return schemaName(schema);
  if (schema.enum) return schema.enum.map((v) => `\`${v}\``).join(' \\| ');
  if (schema.type === 'array') return `${typeOf(schema.items)}[]`;
  const type = schema.format ? `${schema.type} (${schema.format})` : schema.type;
  return schema.nullable ? `${type}, nullable` : type;
}

function constraints(schema) {
  const parts = [];
  if (schema.minLength !== undefined) parts.push(`min length ${schema.minLength}`);
  if (schema.maxLength !== undefined) parts.push(`max length ${schema.maxLength}`);
  if (schema.minimum !== undefined) parts.push(`min ${schema.minimum}`);
  if (schema.maximum !== undefined) parts.push(`max ${schema.maximum}`);
  if (schema.default !== undefined) parts.push(`default \`${schema.default}\``);
  if (schema.description) parts.push(schema.description);
  return parts.join(', ');
}

function fieldTable(schema) {
  const required = new Set(schema.required ?? []);
  const rows = Object.entries(schema.properties ?? {}).map(
    ([name, prop]) =>
      `| \`${name}\` | ${typeOf(prop)} | ${required.has(name) ? 'yes' : ''} | ${constraints(prop)} |`,
  );
  return ['| Field | Type | Required | Notes |', '| --- | --- | --- | --- |', ...rows].join('\n');
}

function successData(response) {
  const schema = response?.content?.['application/json']?.schema;
  const data = schema?.allOf?.[1]?.properties?.data;
  if (!data) return null;
  const paginated = Boolean(schema.allOf[1].properties.meta);
  return `${typeOf(data)}${paginated ? ' (paginated, with `meta`)' : ''}`;
}

function renderOperation(method, route, item, operation) {
  const lines = [`### ${method.toUpperCase()} \`${route}\``, '', operation.summary + '.', ''];
  if (operation.description) lines.push(operation.description, '');
  lines.push(`**Auth:** ${operation.security ? 'Bearer token' : 'none'}`, '');

  const params = [...(item.parameters ?? []), ...(operation.parameters ?? [])];
  if (params.length > 0) {
    lines.push('| Parameter | In | Type | Notes |', '| --- | --- | --- | --- |');
    for (const p of params) {
      lines.push(
        `| \`${p.name}\` | ${p.in} | ${typeOf(p.schema)} | ${[p.description, constraints(p.schema)].filter(Boolean).join('. ')} |`,
      );
    }
    lines.push('');
  }

  const bodyRef = schemaName(operation.requestBody?.content?.['application/json']?.schema);
  if (bodyRef) lines.push(`**Body:** [${bodyRef}](#${bodyRef.toLowerCase()})`, '');

  const responses = Object.entries(operation.responses).map(([code, response]) => {
    const data = successData(response);
    const description = response.$ref
      ? openapi.components.responses[response.$ref.split('/').pop()].description
      : response.description;
    return `\`${code}\` ${description}${data ? ` → \`data\`: ${data}` : ''}`;
  });
  lines.push(`**Responses:** ${responses.join('; ')}`, '');
  return lines.join('\n');
}

function render() {
  const out = [
    '# TaskFlow API Specification',
    '',
    '> Generated from `backend/src/docs/openapi.js` by `npm run docs`. Do not edit by hand.',
    '> Interactive version: `http://localhost:3000/api-docs`.',
    '',
    openapi.info.description,
    '',
    `Base URL: \`${openapi.servers[0].url}\``,
    '',
    '## Response format',
    '',
    'Success: `{ "success": true, "data": ..., "message": "..." }` (lists add `meta: { page, limit, total, totalPages }`).',
    '',
    'Error: `{ "success": false, "data": null, "message": "...", "errors": [{ "field", "message" }] }`.',
    '',
    '| Status | Meaning |',
    '| --- | --- |',
    '| 200 | OK |',
    '| 201 | Created |',
    '| 204 | Deleted, no body |',
    ...Object.entries(openapi.components.responses).map(
      ([key, r]) => `| ${key.slice(1)} | ${r.description} |`,
    ),
    '',
  ];

  for (const tag of openapi.tags) {
    const sections = [];
    for (const [route, item] of Object.entries(openapi.paths)) {
      for (const method of METHODS) {
        if (item[method]?.tags.includes(tag.name)) {
          sections.push(renderOperation(method, route, item, item[method]));
        }
      }
    }
    if (sections.length > 0) out.push(`## ${tag.name}`, '', ...sections);
  }

  out.push('## Request bodies', '');
  for (const [name, schema] of Object.entries(openapi.components.schemas)) {
    if (name.endsWith('Input') || name.endsWith('Update')) {
      const note = schema.minProperties ? '\n\nAt least one field is required.' : '';
      out.push(`### ${name}`, '', fieldTable(schema) + note, '');
    }
  }

  return out.join('\n').trimEnd() + '\n';
}

await SwaggerParser.validate(structuredClone(openapi));
const markdown = render();

if (process.argv.includes('--check')) {
  const current = fs.existsSync(OUTPUT) ? fs.readFileSync(OUTPUT, 'utf8') : '';
  if (current !== markdown) {
    console.error('docs/api-specification.md is out of date. Run `npm run docs`.');
    process.exit(1);
  }
  console.log('OpenAPI spec is valid and docs are up to date.');
} else {
  fs.writeFileSync(OUTPUT, markdown);
  console.log(`OpenAPI spec is valid. Wrote ${path.relative(process.cwd(), OUTPUT)}`);
}
