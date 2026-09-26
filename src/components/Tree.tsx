import { useEffect, useMemo, useReducer, useRef } from 'react'
import { ROOT_ID } from '../game/tree'
import {
  ART_COLORS,
  START_CAMERA,
  VIEW_HEIGHT,
  VIEW_WIDTH,
  cameraReducer,
  cameraTransform,
  decorateWorld,
  groundSpan,
  groundY,
  heightScaleView,
  newestPlacement,
} from '../game/world'
import type { Camera, CameraAction, World, WorldPlacement } from '../game/world'

interface TreeProps {
  world: World
  seed: number
}

interface DragState {
  pointers: Map<number, { x: number; y: number }>
  lastPinchDistance: number | null
}

const WHEEL_ZOOM_SENSITIVITY = 0.002
const STAGGER_MS = 80
const RULER_X = 24
const MAJOR_TICK_LENGTH = 12
const MINOR_TICK_LENGTH = 6
const TICK_LABEL_GAP = 6
const TICK_LABEL_BASELINE = 4

export default function Tree({ world, seed }: TreeProps) {
  const art = useMemo(() => decorateWorld(world, seed), [world, seed])
  const worldRef = useRef(world)
  useEffect(() => {
    worldRef.current = world
  })

  const [camera, dispatch] = useReducer(
    (state: Camera, action: CameraAction) => cameraReducer(state, action, worldRef.current),
    world,
    (initialWorld) =>
      cameraReducer(START_CAMERA, { type: 'frame-puzzle' }, initialWorld),
  )

  const grownCount = useRef(world.sproutCount)
  useEffect(() => {
    if (world.sproutCount > grownCount.current) dispatch({ type: 'follow-growth' })
    grownCount.current = world.sproutCount
  }, [world.sproutCount])

  useEffect(() => {
    dispatch({ type: 'frame-puzzle' })
  }, [seed])

  const svgRef = useRef<SVGSVGElement>(null)
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    function handleWheel(event: WheelEvent) {
      event.preventDefault()
      if (event.ctrlKey) {
        dispatch({ type: 'zoom', factor: Math.exp(-event.deltaY * WHEEL_ZOOM_SENSITIVITY) })
      } else {
        dispatch({ type: 'pan', dx: event.deltaX, dy: event.deltaY })
      }
    }
    svg.addEventListener('wheel', handleWheel, { passive: false })
    return () => svg.removeEventListener('wheel', handleWheel)
  }, [])

  const dragRef = useRef<DragState>({ pointers: new Map(), lastPinchDistance: null })

  function handlePointerDown(event: React.PointerEvent<SVGSVGElement>) {
    dragRef.current.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {}
  }

  function handlePointerMove(event: React.PointerEvent<SVGSVGElement>) {
    const pointers = dragRef.current.pointers
    const previous = pointers.get(event.pointerId)
    if (!previous) return
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (pointers.size === 1) {
      dispatch({ type: 'pan', dx: previous.x - event.clientX, dy: previous.y - event.clientY })
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()]
      const distance = Math.hypot(a.x - b.x, a.y - b.y)
      if (dragRef.current.lastPinchDistance !== null && dragRef.current.lastPinchDistance > 0) {
        dispatch({ type: 'zoom', factor: distance / dragRef.current.lastPinchDistance })
      }
      dragRef.current.lastPinchDistance = distance
    }
  }

  function handlePointerEnd(event: React.PointerEvent<SVGSVGElement>) {
    dragRef.current.pointers.delete(event.pointerId)
    if (dragRef.current.pointers.size < 2) dragRef.current.lastPinchDistance = null
  }

  const newestSproutIndex = newestPlacement(world).node.sproutIndex
  const limbById = new Map(art.branchLimbs.map((limb) => [limb.nodeId, limb]))
  const twigById = new Map(art.twigs.map((twig) => [twig.nodeId, twig]))

  let growElementIndex = 0
  function nextGrowDelay(): React.CSSProperties {
    const style: React.CSSProperties = {
      animationDelay: `${growElementIndex * STAGGER_MS}ms`,
    }
    growElementIndex += 1
    return style
  }

  function renderNode(id: string, parent: WorldPlacement | null) {
    const placement = world.placements[id]
    const { node } = placement
    const isNew = node.sproutIndex === newestSproutIndex && node.sproutIndex >= 0
    const limb = parent ? limbById.get(node.id) : undefined
    const twig = node.word === null ? undefined : twigById.get(node.id)
    return (
      <g key={node.id} className={isNew ? 'grow' : undefined}>
        {limb && (
          <path
            d={limb.d}
            pathLength={1}
            className="branch"
            style={{
              stroke: ART_COLORS.branch,
              strokeWidth: limb.width,
              ...(isNew ? nextGrowDelay() : {}),
            }}
          />
        )}
        {node.word && twig ? (
          <>
            <path
              d={twig.d}
              pathLength={1}
              className="twig"
              style={{ stroke: ART_COLORS.twig, ...(isNew ? nextGrowDelay() : {}) }}
            />
            <circle
              cx={twig.leafX}
              cy={twig.leafY}
              r={4}
              className="leaf-dot"
              style={{ ...(isNew ? nextGrowDelay() : {}) }}
            />
            <text
              x={twig.labelX}
              y={twig.labelY}
              className="leaf-label"
              style={{ ...(isNew ? nextGrowDelay() : {}) }}
            >
              {node.word}
            </text>
          </>
        ) : (
          <>
            <circle
              cx={placement.x}
              cy={placement.y}
              r={3}
              className="stem-dot"
              style={{ ...(isNew ? nextGrowDelay() : {}) }}
            />
            {node.kind && (
              <text
                x={placement.x + 8}
                y={placement.y + 4}
                className="chunk-label"
                style={{ ...(isNew ? nextGrowDelay() : {}) }}
              >
                {node.chunk.toUpperCase()}
              </text>
            )}
          </>
        )}
        {world.childOrder[id].map((childId) => renderNode(childId, placement))}
      </g>
    )
  }

  const ground = groundSpan(world)
  return (
    <>
      <svg
        ref={svgRef}
        role="img"
        aria-label="Tree"
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        className="h-full w-full touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onPointerLeave={handlePointerEnd}
      >
        <g
          className={camera.eased ? 'camera-group eased' : 'camera-group'}
          style={{ transform: cameraTransform(camera), transformOrigin: '0 0', transformBox: 'view-box' }}
        >
          <g className="roots-in">
            {art.roots.map((root, index) => (
              <path
                key={index}
                d={root.d}
                pathLength={1}
                className="root"
                style={{ stroke: ART_COLORS.root, strokeWidth: root.width }}
              />
            ))}
          </g>
          <line
            x1={ground.left}
            y1={groundY}
            x2={ground.right}
            y2={groundY}
            pathLength={1}
            className="ground"
            style={{ stroke: ART_COLORS.ground }}
          />
          <g className="grass">
            {art.grassTufts.map((tuft, index) => (
              <path
                key={index}
                d={tuft.d}
                className="grass-blade"
                style={{ stroke: ART_COLORS.grass }}
              />
            ))}
          </g>
          {renderNode(ROOT_ID, null)}
        </g>
        <g className="height-scale">
          <line x1={RULER_X} y1={0} x2={RULER_X} y2={VIEW_HEIGHT} className="height-ruler" />
          {heightScaleView(camera).map((tick) => (
            <g key={tick.meters}>
              <line
                x1={RULER_X - (tick.major ? MAJOR_TICK_LENGTH : MINOR_TICK_LENGTH)}
                y1={tick.screenY}
                x2={RULER_X}
                y2={tick.screenY}
                className={tick.major ? 'height-tick-major' : 'height-tick-minor'}
              />
              {tick.major && (
                <text
                  x={RULER_X + TICK_LABEL_GAP}
                  y={tick.screenY + TICK_LABEL_BASELINE}
                  className="height-tick-label"
                >
                  {tick.meters} m
                </text>
              )}
            </g>
          ))}
        </g>
      </svg>
      {!camera.following && (
        <button
          type="button"
          onClick={() => dispatch({ type: 'resume-follow' })}
          className="fixed bottom-6 left-6 z-20 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
        >
          Follow the Tree
        </button>
      )}
    </>
  )
}
