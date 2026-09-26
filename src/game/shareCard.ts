import { buildTree } from './tree'
import { ART_COLORS, decorateWorld, groundSpan, worldFromModel } from './world'
import type { World, WorldArt } from './world'

export interface ShareStats {
  points: number
  found: number
  streak: number
  height: number
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

function sceneShapes(world: World, art: WorldArt): string[] {
  const shapes: string[] = []
  const ground = groundSpan(world)
  for (const root of art.roots) {
    shapes.push(
      `<path d="${root.d}" stroke="${ART_COLORS.root}" stroke-width="${root.width}" fill="none" stroke-linecap="round" />`,
    )
  }
  shapes.push(
    `<line x1="${ground.left}" y1="0" x2="${ground.right}" y2="0" stroke="${ART_COLORS.ground}" stroke-width="2" />`,
  )
  for (const tuft of art.grassTufts) {
    shapes.push(
      `<path d="${tuft.d}" stroke="${ART_COLORS.grass}" stroke-width="1.5" fill="none" stroke-linecap="round" />`,
    )
  }
  shapes.push(
    `<path d="${art.trunk.d}" stroke="${ART_COLORS.trunk}" stroke-width="${art.trunk.width}" fill="none" stroke-linecap="round" />`,
  )
  for (const blob of art.foliage) {
    shapes.push(`<circle cx="${blob.cx}" cy="${blob.cy}" r="${blob.r}" fill="${ART_COLORS.foliage}" opacity="0.85" />`)
  }
  for (const limb of art.branchLimbs) {
    shapes.push(
      `<path d="${limb.d}" stroke="${ART_COLORS.branch}" stroke-width="${limb.width}" fill="none" stroke-linecap="round" />`,
    )
  }

  const twigById = new Map(art.twigs.map((twig) => [twig.nodeId, twig]))
  for (const id of Object.keys(world.placements)) {
    const { node, x, y } = world.placements[id]
    const twig = node.word === null ? undefined : twigById.get(id)
    if (node.word !== null && twig) {
      shapes.push(
        `<path d="${twig.d}" stroke="${ART_COLORS.twig}" stroke-width="1.5" fill="none" stroke-linecap="round" />`,
      )
      shapes.push(`<circle cx="${twig.leafX}" cy="${twig.leafY}" r="${twig.blobR}" fill="#22c55e" />`)
      shapes.push(
        `<text x="${twig.labelX}" y="${twig.labelY}" font-size="13" fill="#44403c">${escapeText(node.word)}</text>`,
      )
    } else {
      shapes.push(`<circle cx="${x}" cy="${y}" r="3" fill="#166534" />`)
      if (node.kind) {
        shapes.push(
          `<text x="${x + 8}" y="${y + 4}" font-size="10" letter-spacing="0.05em" fill="#78716c">${escapeText(node.chunk.toUpperCase())}</text>`,
        )
      }
    }
  }
  return shapes
}

export function buildShareSvg(
  stem: string,
  sprouts: readonly string[],
  stats: ShareStats,
  seed: number,
): string {
  const model = buildTree(stem, sprouts)
  const world = worldFromModel(model)
  const art = decorateWorld(world, seed)
  const belowGround = art.roots.reduce((max, root) => Math.max(max, root.endY), 0)
  const shiftY = HEADER + TOP_PAD + world.height
  const totalHeight = shiftY + belowGround + FOOTER
  const ground = groundSpan(world)
  const centerX = ground.left + world.width / 2

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${world.width}" height="${totalHeight}" viewBox="${ground.left} 0 ${world.width} ${totalHeight}" role="img" aria-label="Sproutle share card">`,
    `<rect x="${ground.left}" y="0" width="${world.width}" height="${totalHeight}" fill="#fafaf9" />`,
    `<text x="${centerX}" y="28" text-anchor="middle" font-size="18" font-weight="bold" fill="#16a34a" font-family="system-ui, sans-serif">Sproutle</text>`,
    `<text x="${centerX}" y="48" text-anchor="middle" font-size="12" fill="#78716c" font-family="system-ui, sans-serif">Stem: ${escapeText(stem.toUpperCase())}</text>`,
    `<g transform="translate(0 ${shiftY})">`,
    ...sceneShapes(world, art),
    '</g>',
    `<text x="${centerX}" y="${totalHeight - 16}" text-anchor="middle" font-size="13" fill="#44403c" font-family="system-ui, sans-serif">Points: ${stats.points} · Sprouts found: ${stats.found} · Streak: ${stats.streak} · Height: ${stats.height} m</text>`,
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
