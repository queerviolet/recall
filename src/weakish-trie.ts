/**
 * A mapping of key paths [a, b, c, ...] -> V
 * 
 * Keys are held as weakly as possible.
 */
export class WeakishTrie<V> {
  private readonly root = new Node<V>()

  entry(...key: any): Occupied<V> | Vacant<V> {
    let node = this.root
    let i = key.length; while (i --> 0) {
      const part = key[i]
      const next = node.child(part)
      if (!next) return new Vacant(node, key, i + 1)
      node = next
    }
    if (typeof node.data === 'undefined')
      return new Vacant(node, key, 0)
    return new Occupied(node, key)
  }
}

type RefType = 'strong' | 'weak'

function getRefType(o: any) {
  if (o == null) return 'strong'
  if (typeof o === 'object') return 'weak'
  return 'strong'
}

class Node<V> {
  data?: V
  strong?: Map<any, Node<V>>
  weak?: WeakMap<any, Node<V>>

  child(keyPart: any): Node<V> | undefined {
    return this[getRefType(keyPart)]?.get(keyPart)
  }

  findOrCreateChild(keyPart: any): Node<V> {
    const type = getRefType(keyPart)
    const map = this.getOrCreateMap(type)
    const existing = map.get(keyPart)
    if (existing) return existing
    const created = new Node<V>()
    map.set(keyPart, created)
    return created
  }

  getOrCreateMap<T extends RefType>(type: T) {
    if (type === 'strong')
      return this.strong ? this.strong : (this.strong = new Map)
    else
      return this.weak ? this.weak : (this.weak = new WeakMap)
  }
}


class Vacant<V> {
  constructor(
    private readonly node: Node<V>,
    public readonly key: any[],
    private readonly startIndex: number,
    ) {}

  readonly exists = false
  get value(): V | undefined { return undefined }

  set(value: V): V {
    let node = this.node
    const {key, startIndex} = this
    let i = startIndex; while (i --> 0) {
      const part = key[i]
      node = node.findOrCreateChild(part)
    }
    node.data = value
    return value
  }

  orSet(value: V) {
    return this.set(value)
  }

  orSetWith(create: (key: any[]) => V) {
    return this.set(create(this.key))
  }
}

class Occupied<V> {
  constructor(
    private readonly node: Node<V>,
    public readonly key: any[]) {}

  readonly exists = true
  get value() { return this.node.data }
  
  set(value: V): V {
    return this.node.data = value
  }

  orSet(_: V) {
    return this.node.data
  }

  orSetWith(_: (key: any[]) => V) {
    return this.node.data
  }
}

export default WeakishTrie