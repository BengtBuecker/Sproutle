import { buildTree } from './tree'
import { layoutTree, treeCanvasSize } from './treeLayout'

export interface ShareStats {
  points: number
  found: number
  streak: number
}

const ESCAPE: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
}

function escapeText(text: string): string {
  return text.replace(/[&<>"]/g, (char) => ESCAPE[char])
}

export function buildShareSvg(stem: string, sprouts: readonly string[], stats: ShareStats): string {
  const model = buildTree(stem, sprouts)
  const layout = layoutTree(model)
  const { width, height } = treeCanvasSize(layout.maxDepth, layout.leafCount)
  const header = 56
  const footer = 40
  const totalHeight = height + header + footer

  const shapes: string[] = []
  for (const id of Object.keys(layout.placements)) {
    const { node, x, y } = layout.placements[id]
    const shiftedY = y + header
    if (node.parent !== null) {
      const parent = layout.placements[node.parent]
      shapes.push(
        `<line x1="${parent.x}" y1="${parent.y + header}" x2="${x}" y2="${y + header}" stroke="#64748b" stroke-width="2" stroke-linecap="round" />`,
      )
    }

    if (node.word) {
      shapes.push(`<circle cx="${x}" cy="${shiftedY}" r="4" fill="#4ade80" />`)
      shapes.push(
        `<text x="${x + 8}" y="${shiftedY + 4}" font-size="13" fill="#e2e8f0">${escapeText(node.word)}</text>`,
      )
    } else {
      shapes.push(`<circle cx="${x}" cy="${shiftedY}" r="3" fill="#a3e635" />`)
      if (node.kind) {
        shapes.push(
          `<text x="${x + 8}" y="${shiftedY + 4}" font-size="10" letter-spacing="0.05em" fill="#94a3b8">${escapeText(node.chunk.toUpperCase())}</text>`,
        )
      }
    }
  }

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${totalHeight}" viewBox="0 0 ${width} ${totalHeight}" role="img" aria-label="Sproutle share card">`,
    `<rect width="${width}" height="${totalHeight}" fill="#0f172a" />`,
    `<text x="${width / 2}" y="28" text-anchor="middle" font-size="18" font-weight="bold" fill="#4ade80" font-family="system-ui, sans-serif">Sproutle</text>`,
    `<text x="${width / 2}" y="48" text-anchor="middle" font-size="12" fill="#94a3b8" font-family="system-ui, sans-serif">Stem: ${escapeText(stem.toUpperCase())}</text>`,
    ...shapes,
    `<text x="${width / 2}" y="${totalHeight - 16}" text-anchor="middle" font-size="13" fill="#e2e8f0" font-family="system-ui, sans-serif">Points: ${stats.points} · Sprouts found: ${stats.found} · Streak: ${stats.streak}</text>`,
    '</svg>',
  ].join('\n')
}

export function downloadShareImage(svg: string): void {
  const blob = new Blob([svg], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'sproutle-tree.svg'
  link.click()
  URL.revokeObjectURL(url)
}
