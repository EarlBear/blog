/**
 * mermaid-parse.ts — a tiny, zero-dependency parser for the Mermaid *flowchart*
 * subset, converting familiar Mermaid syntax into FlowDiagram nodes/edges. This
 * is how the blog offers "our own extended Mermaid": authors write the flowchart
 * text they already know, and we render it through our own build-time SVG engine
 * (theme, layout gates, animation) — no Mermaid runtime, no browser, no big dep.
 *
 * Why not the real Mermaid parser? `@mermaid-js/parser` doesn't cover flowchart
 * yet, and every Node Mermaid *renderer* needs a browser DOM (getBBox), which we
 * refuse to ship. The flowchart node/edge grammar is small enough to parse
 * directly. See the enrich-post skill + docs/features/diagram-catalog.md.
 *
 * Supported:
 *   - header:      `flowchart LR` / `graph TD` (direction: LR TB TD BT RL)
 *   - node shapes: A[rect]  A(round)  A([stadium])  A[(store)]  A{decision}
 *                  A((circle))  — the shape maps to a FlowNode.kind hint
 *   - edges:       A --> B   A --- B   A -.-> B   A ==> B   with optional
 *                  `|label|` or `-- label -->` text
 *   - one edge per line (chained `A --> B --> C` is also supported)
 *   - `%%` comments and blank lines are ignored
 *
 * Not supported (fall back to the native FlowDiagram spec, or another diagram):
 *   subgraphs, class/style directives, click handlers, multi-line node text.
 */
import type { FlowNode, FlowEdge, FlowNodeKind } from '../FlowDiagram.astro';

export interface ParsedFlow {
  direction: 'LR' | 'TB' | 'TD' | 'BT' | 'RL';
  shape: 'pipeline' | 'sequence';
  nodes: FlowNode[];
  edges: FlowEdge[];
}

// Map a node's bracket style to a FlowDiagram kind.
function shapeKind(open: string): FlowNodeKind {
  if (open === '[(') return 'store'; // [( … )] cylinder → datastore
  if (open === '([') return 'default'; // stadium
  if (open === '((') return 'default'; // circle
  if (open === '{') return 'default'; // decision (rendered as a box for now)
  return 'default';
}

// Parse a single node token like `A[Label]` or `B[(Store)]` or bare `C`.
// Returns the id and (if present) label + kind, registering into `nodes`.
const NODE_RE =
  /^([A-Za-z0-9_]+)\s*(\[\(|\(\[|\(\(|\[|\(|\{)?\s*("?)([^\]\)\}"]*)\3\s*(\)\]|\]\)|\)\)|\]|\)|\})?/;

function readNode(
  token: string,
  nodes: Map<string, FlowNode>
): string | null {
  const m = token.trim().match(NODE_RE);
  if (!m) return null;
  const id = m[1];
  const open = m[2] ?? '';
  const label = (m[4] ?? '').trim() || id;
  if (!nodes.has(id)) {
    nodes.set(id, { id, label, kind: shapeKind(open) });
  } else if (label !== id && nodes.get(id)!.label === id) {
    // A later mention carries the label; fill it in.
    nodes.get(id)!.label = label;
    nodes.get(id)!.kind = shapeKind(open);
  }
  return id;
}

export function parseMermaidFlow(src: string): ParsedFlow {
  const lines = src
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('%%'));

  let direction: ParsedFlow['direction'] = 'LR';
  const nodes = new Map<string, FlowNode>();
  const edges: FlowEdge[] = [];

  for (const line of lines) {
    const header = line.match(/^(?:flowchart|graph)\s+(TB|TD|BT|RL|LR)\b/i);
    if (header) {
      direction = header[1].toUpperCase() as ParsedFlow['direction'];
      continue;
    }
    if (/^(?:flowchart|graph)\b/i.test(line)) continue;

    // Normalise the `-- text -->` label form into the `-->|text|` form so there is
    // one way to carry an edge label.
    const work = line.replace(/--\s*([^->|]+?)\s*-->/g, '-->|$1|');

    // Tokenize the line into an alternating sequence of node tokens and
    // connectors: NODE (OP [|label|] NODE)*. We scan left-to-right, alternating
    // between "read a node" and "read a connector".
    type Conn = { op: string; label?: string };
    const nodeTokens: string[] = [];
    const conns: Conn[] = [];
    let rest = work;
    // Regex for a node token (id + optional bracketed label of any supported shape).
    const nodeTok =
      /^([A-Za-z0-9_]+(?:\s*(?:\[\(|\(\[|\(\(|\[|\(|\{)[^\]\)\}]*(?:\)\]|\]\)|\)\)|\]|\)|\}))?)/;
    const connTok = /^\s*(-\.->|==>|-->|---)\s*(?:\|([^|]+)\|\s*)?/;

    let expectNode = true;
    let ok = true;
    while (rest.trim().length && ok) {
      rest = rest.replace(/^\s+/, '');
      if (expectNode) {
        const m = rest.match(nodeTok);
        if (!m) { ok = false; break; }
        nodeTokens.push(m[1]);
        rest = rest.slice(m[0].length);
      } else {
        const m = rest.match(connTok);
        if (!m) { ok = false; break; }
        conns.push({ op: m[1], label: m[2]?.trim() });
        rest = rest.slice(m[0].length);
      }
      expectNode = !expectNode;
    }

    if (nodeTokens.length === 1 && conns.length === 0) {
      readNode(nodeTokens[0], nodes); // bare node declaration
      continue;
    }
    // Link each consecutive pair through its connector (label rides the connector).
    const ids = nodeTokens.map((t) => readNode(t, nodes)).filter(Boolean) as string[];
    for (let i = 0; i < conns.length && i + 1 < ids.length; i++) {
      edges.push({ from: ids[i], to: ids[i + 1], label: conns[i].label });
    }
  }

  const shape: ParsedFlow['shape'] =
    direction === 'TB' || direction === 'TD' || direction === 'BT'
      ? 'sequence'
      : 'pipeline';

  return { direction, shape, nodes: [...nodes.values()], edges };
}
