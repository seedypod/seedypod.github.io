import spec from '../public/openapi.json'

type Schema = {
  type?: string | string[]
  enum?: unknown[]
  anyOf?: Schema[]
  items?: Schema
  properties?: Record<string, Schema>
  required?: string[]
  $ref?: string
  minimum?: number
  maximum?: number
  exclusiveMinimum?: number
  maxItems?: number
  default?: unknown
  format?: string
}
type Parameter = { in: string; name: string; required?: boolean; schema: Schema }
type Operation = {
  operationId: string
  summary?: string
  description?: string
  tags?: string[]
  parameters?: Parameter[]
  requestBody?: { content: Record<string, { schema: Schema }> }
  responses: Record<string, { description: string; content?: Record<string, { schema: Schema }> }>
}

const SAFE_MAX = 9007199254740991

function typeOf(s: Schema): string {
  if (s.$ref) return s.$ref.split('/').pop()!
  if (s.enum) return s.enum.map((v) => JSON.stringify(v)).join(' | ')
  if (s.anyOf) return s.anyOf.map(typeOf).join(' | ')
  if (Array.isArray(s.type)) return s.type.join(' | ')
  if (s.type === 'array') return `${s.items ? typeOf(s.items) : 'unknown'}[]`
  if (s.type === 'object' && s.properties) return `{ ${Object.keys(s.properties).join(', ')} }`
  return s.type ?? 'unknown'
}

function constraints(s: Schema): string {
  const out: string[] = []
  const max = s.maximum !== undefined && s.maximum !== SAFE_MAX ? s.maximum : undefined
  const min = s.minimum
  if (min !== undefined && max !== undefined) out.push(`${min}–${max}`)
  else if (min !== undefined) out.push(`≥ ${min}`)
  else if (s.exclusiveMinimum !== undefined)
    out.push(max !== undefined ? `> ${s.exclusiveMinimum}, ≤ ${max}` : `> ${s.exclusiveMinimum}`)
  else if (max !== undefined) out.push(`≤ ${max}`)
  if (s.maxItems !== undefined) out.push(`max ${s.maxItems} items`)
  if (s.format) out.push(s.format)
  if (s.default !== undefined) out.push(`default ${JSON.stringify(s.default)}`)
  return out.join(', ')
}

function Fields({ schema }: { schema: Schema }) {
  const variants = schema.anyOf?.filter((v) => v.properties) ?? []
  if (!schema.properties && variants.length === 0)
    return (
      <p>
        <code>{typeOf(schema)}</code>
      </p>
    )
  const objects = schema.properties ? [schema] : variants
  return (
    <>
      {objects.map((o, i) => (
        <table key={i}>
          <thead>
            <tr>
              <th>Field</th>
              <th>Type</th>
              <th>Constraints</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(o.properties ?? {}).map(([name, p]) => (
              <tr key={name}>
                <td>
                  <code>{name}</code>
                  {o.required?.includes(name) ? '' : '?'}
                </td>
                <td>
                  <code>{typeOf(p)}</code>
                </td>
                <td>{constraints(p)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ))}
    </>
  )
}

function Op({ method, path, op }: { method: string; path: string; op: Operation }) {
  const body = op.requestBody?.content['application/json']?.schema
  const ok = op.responses['200']?.content?.['application/json']?.schema
  const params = op.parameters ?? []
  return (
    <details className="api-op" id={op.operationId}>
      <summary>
        <span className="api-method">{method.toUpperCase()}</span>
        <code>/api{path}</code>
        {op.summary && <span>{op.summary}</span>}
      </summary>
      {op.description && <p>{op.description}</p>}
      {params.length > 0 && (
        <>
          <h4>Parameters</h4>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>In</th>
                <th>Type</th>
                <th>Constraints</th>
              </tr>
            </thead>
            <tbody>
              {params.map((p) => (
                <tr key={p.in + p.name}>
                  <td>
                    <code>{p.name}</code>
                    {p.required ? '' : '?'}
                  </td>
                  <td>{p.in}</td>
                  <td>
                    <code>{typeOf(p.schema)}</code>
                  </td>
                  <td>{constraints(p.schema)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
      {body && (
        <>
          <h4>Request body</h4>
          <Fields schema={body} />
        </>
      )}
      {ok && (
        <>
          <h4>Response 200</h4>
          <Fields schema={ok.type === 'array' && ok.items ? ok.items : ok} />
          {ok.type === 'array' && <p>Returns an array of these objects.</p>}
        </>
      )}
    </details>
  )
}

export function OpenApiReference() {
  const paths = spec.paths as unknown as Record<string, Record<string, Operation>>
  const groups = new Map<string, { method: string; path: string; op: Operation }[]>()
  for (const [path, methods] of Object.entries(paths))
    for (const [method, op] of Object.entries(methods)) {
      const tag = op.tags?.[0] ?? 'other'
      groups.set(tag, [...(groups.get(tag) ?? []), { method, path, op }])
    }
  return (
    <div>
      {[...groups].map(([tag, ops]) => (
        <section key={tag} aria-labelledby={`tag-${tag}`}>
          <h3 id={`tag-${tag}`} className="x:font-semibold x:text-xl x:mt-8">
            {tag}
          </h3>
          {ops.map((o) => (
            <Op key={o.method + o.path} {...o} />
          ))}
        </section>
      ))}
    </div>
  )
}
