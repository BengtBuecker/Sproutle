export type ChunkKind = 'prefix' | 'suffix'

export interface TreeNode {
  id: string
  parent: string | null
  chunk: string
  kind: ChunkKind | null
  word: string | null
  sproutIndex: number
}

export interface TreeModel {
  nodes: Record<string, TreeNode>
  childOrder: Record<string, string[]>
  creationOrder: string[]
}

export const ROOT_ID = 'root'

export function buildTree(stem: string, sprouts: readonly string[]): TreeModel {
  const model: TreeModel = { nodes: {}, childOrder: {}, creationOrder: [] }
  model.nodes[ROOT_ID] = {
    id: ROOT_ID,
    parent: null,
    chunk: '',
    kind: null,
    word: null,
    sproutIndex: -1,
  }
  model.childOrder[ROOT_ID] = []
  model.creationOrder.push(ROOT_ID)

  sprouts.forEach((sprout, index) => {
    growSprout(model, stem, sprout, index)
  })
  return model
}

function growSprout(model: TreeModel, stem: string, word: string, index: number): void {
  const base = findBase(model, word)
  if (base) {
    const extension = extensionOf(base.word, word)
    addChild(model, base.node.id, extension.chunk, extension.kind, word, index)
    return
  }
  const at = word.indexOf(stem)
  const pre = word.slice(0, at)
  const post = word.slice(at + stem.length)
  let parentId = ROOT_ID
  if (pre.length > 0) {
    const branch = addChild(model, parentId, pre, 'prefix', post.length > 0 ? null : word, index)
    parentId = branch.id
  }
  if (post.length > 0 || pre.length === 0) {
    addChild(model, parentId, post, 'suffix', word, index)
  }
}

function findBase(model: TreeModel, word: string): { node: TreeNode; word: string } | null {
  let best: { node: TreeNode; word: string } | null = null
  for (const id of model.creationOrder) {
    const node = model.nodes[id]
    if (node.word === null || node.word === word) continue
    if (word.startsWith(node.word) || word.endsWith(node.word)) {
      if (best === null || node.word.length > best.word.length) {
        best = { node, word: node.word }
      }
    }
  }
  return best
}

function extensionOf(baseWord: string, word: string): { chunk: string; kind: ChunkKind } {
  if (word.startsWith(baseWord)) {
    return { chunk: word.slice(baseWord.length), kind: 'suffix' }
  }
  return { chunk: word.slice(0, word.length - baseWord.length), kind: 'prefix' }
}

function addChild(
  model: TreeModel,
  parentId: string,
  chunk: string,
  kind: ChunkKind,
  word: string | null,
  index: number,
): TreeNode {
  const id = `${parentId}|${kind[0]}|${chunk}`
  const existing = model.nodes[id]
  if (existing) {
    if (word !== null && existing.word === null) {
      existing.word = word
      existing.sproutIndex = index
    }
    return existing
  }
  const node: TreeNode = { id, parent: parentId, chunk, kind, word, sproutIndex: index }
  model.nodes[id] = node
  model.childOrder[id] = []
  model.childOrder[parentId].push(id)
  model.creationOrder.push(id)
  return node
}
