import { buildTree } from './tree'
import { groundSpan, worldFromModel } from './world'
import type { World } from './world'

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

const HEADER = 56
const TOP_PAD = 30
const FOOTER = 40

function sceneShiftY(world: World): number {
  return HEADER + TOP_PAD + world.height
}

function sceneShapes(world: World, shiftY: number): string[] {
  const shapes: string[] = []
  for (const id of Object.keys(world.placements)) {
    const { node, x, y } = world.placements[id]
    const shiftedY = shiftY + y
    if (node.parent !== null) {
      const parent = world.placements[node.parent]
      shapes.push(
        `<line x1="${parent.x}" y1="${shiftY + parent.y}" x2="${x}" y2="${shiftedY}" stroke="#64748b" stroke-width="2" stroke-linecap="round" />`,
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
  return shapes
}

export function buildShareSvg(stem: string, sprouts: readonly string[], stats: ShareStats): string {
  const model = buildTree(stem, sprouts)
  const world = worldFromModel(model)
  const shiftY = sceneShiftY(world)
  const totalHeight = HEADER + TOP_PAD + world.height + FOOTER
  const ground = groundSpan(world)
  const centerX = ground.left + world.width / 2

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${world.width}" height="${totalHeight}" viewBox="${ground.left} 0 ${world.width} ${totalHeight}" role="img" aria-label="Sproutle share card">`,
    `<rect x="${ground.left}" y="0" width="${world.width}" height="${totalHeight}" fill="#0f172a" />`,
    `<text x="${centerX}" y="28" text-anchor="middle" font-size="18" font-weight="bold" fill="#4ade80" font-family="system-ui, sans-serif">Sproutle</text>`,
    `<text x="${centerX}" y="48" text-anchor="middle" font-size="12" fill="#94a3b8" font-family="system-ui, sans-serif">Stem: ${escapeText(stem.toUpperCase())}</text>`,
    ...sceneShapes(world, shiftY),
    `<line x1="${ground.left}" y1="${shiftY}" x2="${ground.right}" y2="${shiftY}" stroke="#166534" stroke-width="2" />`,
    `<text x="${centerX}" y="${totalHeight - 16}" text-anchor="middle" font-size="13" fill="#e2e8f0" font-family="system-ui, sans-serif">Points: ${stats.points} · Sprouts found: ${stats.found} · Streak: ${stats.streak}</text>`,
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
