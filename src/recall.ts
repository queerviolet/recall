import WeakishTrie from './weakish-trie'

interface Return<D> {
  exit: 'return'
  data: D
  errors?: Error[]
}

interface Throw {
  exit: 'throw'
  throw: Error

  // errors will also contain the thrown error
  errors: Error[]
}

type Result<D> = Return<D> | Throw

class Report {
  errors: Error[] | undefined

  report(error: Error) {
    if (!this.errors) this.errors = []
    this.errors.push(error)
  }
}

let currentReport: Report | null = null

export function report(error: Error) {
  if (!currentReport) return console.error(error)
  currentReport.report(error)
}

function execute<F extends (...args: any[]) => any>(fn: F, self: ThisParameterType<F>, args: Parameters<F>): Result<ReturnType<F>> {
  const lastReport = currentReport
  const result: Result<ReturnType<F>> = {
    exit: 'return'
  } as any
  const collector = new Report
  try {
    currentReport = collector
    ;(result as Return<ReturnType<F>>).data = fn.apply(self, args)
  } catch (error) {
    report(error as Error)
    ;(result as Throw).exit = 'throw'
    ;(result as Throw).throw = error as Error
  } finally {
    result.errors = collector.errors
    currentReport = lastReport
  }
  return result
}

class StartEvent<F extends (...args: any[]) => any> {
  get type(): 'start' { return 'start' }
  constructor(
    public readonly fn: F,
    public readonly self: ThisParameterType<F>,
    public readonly args: Parameters<F>,
    public readonly hit: boolean) {}

  fnIs<Q extends (...args: any[]) => any>(fn: F): this is StartEvent<Q> {
    return this.fn === fn
  }
}

class EndEvent<F extends (...args: any[]) => any> {
  get type(): 'end' { return 'end' }
  constructor(
    public readonly call: StartEvent<F>,
    public readonly result: Result<ReturnType<F>>
  ) {}
}

export type Event<F extends (...args: any[]) => any> =
  StartEvent<F> | EndEvent<F>

type Tracer = (event: Event<any>) => void
let currentTrace: Tracer | null = null

function emit<E extends Event<any>>(event: E): E | null {
  if (!currentTrace) return null
  currentTrace(event)
  return event
}

export function trace<F extends () => any>(block: F, tracer: Tracer) {
  let lastTrace = currentTrace
  try {
    currentTrace = tracer
    block()
  } finally {
    currentTrace = lastTrace
  }
}

const cache = new WeakishTrie<Result<any>>()

export type Recall<F extends (...args: any[]) => any> = F & {
  getResult(this: ThisParameterType<F>, ...args: Parameters<F>): Result<ReturnType<F>>
  getExisting(this: ThisParameterType<F>, ...args: Parameters<F>): Result<ReturnType<F>> | undefined
}

function createRecall<F extends (...args: any[]) => any>(fn: F): Recall<F> {
  function call(this: ThisParameterType<F>, ...args: Parameters<F>): ReturnType<F> {
    const result = getResult.apply(this, args)
    if (didThrow(result)) throw result.throw
    return result.data
  }

  function getResult(this: ThisParameterType<F>, ...args: Parameters<F>): Result<ReturnType<F>> {
    const entry = cache.entry(fn, this, ...args)
    const start = currentTrace ?
      emit(new StartEvent(fn, this, args, entry.exists))
      : null
    const result = entry.value ? entry.value : entry.set(execute(fn, this, args))    
    if (start) emit(new EndEvent(start, result))
    return result
  }

  function getExisting(this: ThisParameterType<F>, ...args: Parameters<F>): Result<ReturnType<F>> | undefined {
    return cache.entry(fn, this, ...args).value
  }

  call.getResult = getResult
  call.getExisting = getExisting
  return call as any as Recall<F>
}

function didThrow(result: any): result is Throw {
  return result.exit === 'throw'
}

export const recall = createRecall(createRecall)
export default recall
