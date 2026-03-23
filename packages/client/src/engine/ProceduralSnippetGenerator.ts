import { SeededRandom } from './ChallengeGenerator'
import type { CodeSnippet } from '@/types/challenge'

const FUNCTION_NAMES = [
  'calculateTotal', 'processQueue', 'handleRequest', 'validateInput',
  'transformData', 'parseResponse', 'buildConfig', 'createSession',
  'resolveConflict', 'updateCache', 'renderTemplate', 'dispatchEvent',
  'encryptPayload', 'decodeToken', 'sanitizeInput', 'scheduleTask',
  'aggregateResults', 'filterEntries', 'sortRecords', 'mergeCollections',
  'initializeWorker', 'shutdownService', 'refreshConnection', 'retryOperation',
  'compressData', 'extractMetadata', 'normalizeSchema', 'generateReport',
  'publishMessage', 'consumeStream', 'loadFixtures', 'migrateDatabase',
]

const VARIABLE_NAMES = [
  'config', 'options', 'result', 'response', 'payload', 'buffer',
  'entries', 'records', 'items', 'values', 'params', 'headers',
  'metadata', 'context', 'session', 'connection', 'channel', 'queue',
  'cache', 'store', 'registry', 'index', 'counter', 'threshold',
  'timeout', 'interval', 'offset', 'limit', 'cursor', 'token',
  'prefix', 'suffix', 'pattern', 'template', 'schema', 'snapshot',
]

const TYPE_NAMES = [
  'Config', 'Options', 'Result', 'Response', 'Payload', 'Session',
  'Connection', 'Channel', 'Event', 'Message', 'Record', 'Entry',
  'Metadata', 'Context', 'Handler', 'Middleware', 'Provider', 'Consumer',
  'Factory', 'Builder', 'Adapter', 'Strategy', 'Observer', 'Validator',
]

const FIELD_NAMES = [
  'id', 'name', 'type', 'status', 'value', 'count', 'label',
  'title', 'description', 'timestamp', 'createdAt', 'updatedAt',
  'isActive', 'isValid', 'priority', 'version', 'source', 'target',
  'duration', 'retries', 'maxRetries', 'encoding', 'format', 'mode',
]

const PRIMITIVE_TYPES = ['string', 'number', 'boolean']

function indent(level: number): string {
  return '  '.repeat(level)
}

type SnippetBuilder = (rng: SeededRandom, id: string) => CodeSnippet

const BUILDERS: SnippetBuilder[] = [
  buildSimpleFunction,
  buildAsyncFunction,
  buildClassSnippet,
  buildInterfaceSnippet,
  buildArrowFunction,
  buildObjectLiteral,
  buildArrayProcessing,
  buildConditionalLogic,
  buildTryCatchBlock,
  buildEnumSnippet,
  buildImportBlock,
  buildSwitchStatement,
]

function buildSimpleFunction(rng: SeededRandom, id: string): CodeSnippet {
  const name = rng.pick(FUNCTION_NAMES)
  const paramCount = rng.nextInt(1, 3)
  const params: string[] = []
  const used = new Set<string>()
  for (let i = 0; i < paramCount; i++) {
    let p = rng.pick(VARIABLE_NAMES)
    while (used.has(p)) p = rng.pick(VARIABLE_NAMES)
    used.add(p)
    params.push(`${p}: ${rng.pick(PRIMITIVE_TYPES)}`)
  }

  const bodyLines = rng.nextInt(2, 5)
  const lines: string[] = []
  lines.push(`function ${name}(${params.join(', ')}): ${rng.pick(PRIMITIVE_TYPES)} {`)
  for (let i = 0; i < bodyLines; i++) {
    let v = rng.pick(VARIABLE_NAMES)
    while (used.has(v)) v = rng.pick(VARIABLE_NAMES)
    used.add(v)
    lines.push(`${indent(1)}const ${v} = ${params[0].split(':')[0]}.toString()`)
  }
  lines.push(`${indent(1)}return ${params[0].split(':')[0]}`)
  lines.push('}')

  const content = lines.join('\n')
  return { id, content, language: 'typescript', lineCount: lines.length, tags: ['function'] }
}

function buildAsyncFunction(rng: SeededRandom, id: string): CodeSnippet {
  const name = rng.pick(FUNCTION_NAMES)
  const param = rng.pick(VARIABLE_NAMES)
  const retType = rng.pick(TYPE_NAMES)

  const lines = [
    `async function ${name}(${param}: string): Promise<${retType}> {`,
    `${indent(1)}const response = await fetch(\`/api/\${${param}}\`)`,
    `${indent(1)}if (!response.ok) {`,
    `${indent(2)}throw new Error(\`Request failed: \${response.status}\`)`,
    `${indent(1)}}`,
    `${indent(1)}const data = await response.json()`,
    `${indent(1)}return data as ${retType}`,
    '}',
  ]

  const content = lines.join('\n')
  return { id, content, language: 'typescript', lineCount: lines.length, tags: ['function', 'async'] }
}

function buildClassSnippet(rng: SeededRandom, id: string): CodeSnippet {
  const className = rng.pick(TYPE_NAMES)
  const fieldCount = rng.nextInt(2, 4)
  const fields: Array<{ name: string; type: string }> = []
  const used = new Set<string>()

  for (let i = 0; i < fieldCount; i++) {
    let f = rng.pick(FIELD_NAMES)
    while (used.has(f)) f = rng.pick(FIELD_NAMES)
    used.add(f)
    fields.push({ name: f, type: rng.pick(PRIMITIVE_TYPES) })
  }

  const methodName = rng.pick(FUNCTION_NAMES)
  const lines: string[] = []
  lines.push(`class ${className} {`)
  for (const field of fields) {
    lines.push(`${indent(1)}private ${field.name}: ${field.type}`)
  }
  lines.push('')
  lines.push(`${indent(1)}constructor(${fields.map(f => `${f.name}: ${f.type}`).join(', ')}) {`)
  for (const field of fields) {
    lines.push(`${indent(2)}this.${field.name} = ${field.name}`)
  }
  lines.push(`${indent(1)}}`)
  lines.push('')
  lines.push(`${indent(1)}${methodName}(): ${rng.pick(PRIMITIVE_TYPES)} {`)
  lines.push(`${indent(2)}return this.${fields[0].name}`)
  lines.push(`${indent(1)}}`)
  lines.push('}')

  const content = lines.join('\n')
  return { id, content, language: 'typescript', lineCount: lines.length, tags: ['class'] }
}

function buildInterfaceSnippet(rng: SeededRandom, id: string): CodeSnippet {
  const name = rng.pick(TYPE_NAMES)
  const fieldCount = rng.nextInt(3, 6)
  const used = new Set<string>()
  const lines: string[] = [`interface ${name} {`]

  for (let i = 0; i < fieldCount; i++) {
    let f = rng.pick(FIELD_NAMES)
    while (used.has(f)) f = rng.pick(FIELD_NAMES)
    used.add(f)
    const optional = rng.next() > 0.7 ? '?' : ''
    lines.push(`${indent(1)}${f}${optional}: ${rng.pick(PRIMITIVE_TYPES)}`)
  }
  lines.push('}')

  const content = lines.join('\n')
  return { id, content, language: 'typescript', lineCount: lines.length, tags: ['interface', 'type'] }
}

function buildArrowFunction(rng: SeededRandom, id: string): CodeSnippet {
  const name = rng.pick(FUNCTION_NAMES)
  const param = rng.pick(VARIABLE_NAMES)
  const items = rng.pick(VARIABLE_NAMES)

  const lines = [
    `const ${name} = (${param}: ${rng.pick(TYPE_NAMES)}[]) => {`,
    `${indent(1)}const filtered = ${param}.filter(item => item.isActive)`,
    `${indent(1)}const ${items} = filtered.map(item => item.value)`,
    `${indent(1)}return ${items}.reduce((sum, val) => sum + val, 0)`,
    '}',
  ]

  const content = lines.join('\n')
  return { id, content, language: 'typescript', lineCount: lines.length, tags: ['arrow', 'array'] }
}

function buildObjectLiteral(rng: SeededRandom, id: string): CodeSnippet {
  const name = rng.pick(VARIABLE_NAMES)
  const fieldCount = rng.nextInt(4, 7)
  const used = new Set<string>()
  const lines: string[] = [`const ${name} = {`]

  for (let i = 0; i < fieldCount; i++) {
    let f = rng.pick(FIELD_NAMES)
    while (used.has(f)) f = rng.pick(FIELD_NAMES)
    used.add(f)
    const type = rng.pick(PRIMITIVE_TYPES)
    const val = type === 'string' ? `'${rng.pick(VARIABLE_NAMES)}'`
      : type === 'number' ? String(rng.nextInt(1, 9999))
      : rng.next() > 0.5 ? 'true' : 'false'
    const comma = i < fieldCount - 1 ? ',' : ','
    lines.push(`${indent(1)}${f}: ${val}${comma}`)
  }
  lines.push('}')

  const content = lines.join('\n')
  return { id, content, language: 'javascript', lineCount: lines.length, tags: ['object'] }
}

function buildArrayProcessing(rng: SeededRandom, id: string): CodeSnippet {
  const arr = rng.pick(VARIABLE_NAMES)
  const fn = rng.pick(FUNCTION_NAMES)

  const lines = [
    `function ${fn}(${arr}: number[]): number[] {`,
    `${indent(1)}const sorted = [...${arr}].sort((a, b) => a - b)`,
    `${indent(1)}const unique = [...new Set(sorted)]`,
    `${indent(1)}const positive = unique.filter(n => n > 0)`,
    `${indent(1)}return positive.slice(0, ${rng.nextInt(5, 20)})`,
    '}',
  ]

  const content = lines.join('\n')
  return { id, content, language: 'typescript', lineCount: lines.length, tags: ['function', 'array'] }
}

function buildConditionalLogic(rng: SeededRandom, id: string): CodeSnippet {
  const fn = rng.pick(FUNCTION_NAMES)
  const param = rng.pick(VARIABLE_NAMES)
  const threshold = rng.nextInt(10, 100)

  const lines = [
    `function ${fn}(${param}: number): string {`,
    `${indent(1)}if (${param} < 0) {`,
    `${indent(2)}return 'invalid'`,
    `${indent(1)}} else if (${param} < ${threshold}) {`,
    `${indent(2)}return 'low'`,
    `${indent(1)}} else if (${param} < ${threshold * 2}) {`,
    `${indent(2)}return 'medium'`,
    `${indent(1)}} else {`,
    `${indent(2)}return 'high'`,
    `${indent(1)}}`,
    '}',
  ]

  const content = lines.join('\n')
  return { id, content, language: 'typescript', lineCount: lines.length, tags: ['function', 'conditional'] }
}

function buildTryCatchBlock(rng: SeededRandom, id: string): CodeSnippet {
  const fn = rng.pick(FUNCTION_NAMES)
  const param = rng.pick(VARIABLE_NAMES)

  const lines = [
    `async function ${fn}(${param}: string): Promise<void> {`,
    `${indent(1)}try {`,
    `${indent(2)}const result = await fetch(${param})`,
    `${indent(2)}const data = await result.json()`,
    `${indent(2)}console.log(data)`,
    `${indent(1)}} catch (error) {`,
    `${indent(2)}if (error instanceof TypeError) {`,
    `${indent(3)}console.error('Network error:', error.message)`,
    `${indent(2)}} else {`,
    `${indent(3)}throw error`,
    `${indent(2)}}`,
    `${indent(1)}}`,
    '}',
  ]

  const content = lines.join('\n')
  return { id, content, language: 'typescript', lineCount: lines.length, tags: ['function', 'async', 'error-handling'] }
}

function buildEnumSnippet(rng: SeededRandom, id: string): CodeSnippet {
  const name = rng.pick(TYPE_NAMES)
  const memberCount = rng.nextInt(4, 7)
  const members = ['Active', 'Inactive', 'Pending', 'Processing', 'Completed', 'Failed', 'Cancelled', 'Archived']
  const used = new Set<string>()
  const lines: string[] = [`enum ${name} {`]

  for (let i = 0; i < memberCount && i < members.length; i++) {
    let m = rng.pick(members)
    while (used.has(m)) m = rng.pick(members)
    used.add(m)
    const comma = i < memberCount - 1 ? ',' : ','
    lines.push(`${indent(1)}${m} = '${m.toLowerCase()}'${comma}`)
  }
  lines.push('}')

  const content = lines.join('\n')
  return { id, content, language: 'typescript', lineCount: lines.length, tags: ['enum'] }
}

function buildImportBlock(rng: SeededRandom, id: string): CodeSnippet {
  const modules = ['express', 'lodash', 'axios', 'zod', 'prisma', 'dayjs']
  const importCount = rng.nextInt(3, 5)
  const used = new Set<string>()
  const lines: string[] = []

  for (let i = 0; i < importCount; i++) {
    let mod = rng.pick(modules)
    while (used.has(mod)) mod = rng.pick(modules)
    used.add(mod)
    const named = rng.pick(FUNCTION_NAMES)
    lines.push(`import { ${named} } from '${mod}'`)
  }

  lines.push('')
  const fn = rng.pick(FUNCTION_NAMES)
  const param = rng.pick(VARIABLE_NAMES)
  lines.push(`export function ${fn}(${param}: string): void {`)
  lines.push(`${indent(1)}console.log(${param})`)
  lines.push('}')

  const content = lines.join('\n')
  return { id, content, language: 'typescript', lineCount: lines.length, tags: ['import', 'module'] }
}

function buildSwitchStatement(rng: SeededRandom, id: string): CodeSnippet {
  const fn = rng.pick(FUNCTION_NAMES)
  const param = rng.pick(VARIABLE_NAMES)
  const cases = ['create', 'update', 'delete', 'read', 'list', 'search']
  const caseCount = rng.nextInt(3, 5)

  const lines = [`function ${fn}(${param}: string): number {`]
  lines.push(`${indent(1)}switch (${param}) {`)
  for (let i = 0; i < caseCount && i < cases.length; i++) {
    lines.push(`${indent(2)}case '${cases[i]}':`)
    lines.push(`${indent(3)}return ${rng.nextInt(100, 999)}`)
  }
  lines.push(`${indent(2)}default:`)
  lines.push(`${indent(3)}return 0`)
  lines.push(`${indent(1)}}`)
  lines.push('}')

  const content = lines.join('\n')
  return { id, content, language: 'typescript', lineCount: lines.length, tags: ['function', 'switch'] }
}

export class ProceduralSnippetGenerator {
  private counter = 0

  constructor(private rng: SeededRandom) {}

  generate(): CodeSnippet {
    const builder = this.rng.pick(BUILDERS)
    const snippetId = `proc-${++this.counter}-${this.rng.nextInt(1000, 9999)}`
    return builder(this.rng, snippetId)
  }

  generateBatch(count: number): CodeSnippet[] {
    return Array.from({ length: count }, () => this.generate())
  }
}
