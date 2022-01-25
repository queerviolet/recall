import WeakishTrie from './weakish-trie'

interface IResult<D=any> {
  didReturn(): this is Return<D>
  didThrow(): this is Throw

  readonly log: Log
  errors(): Iterable<Error>
}

export interface Log extends Iterable<any> {
  readonly messages?: ReadonlyArray<any>
  filter<S = any>(pred?: (e: any) => e is S): Iterable<S>
}

interface Return<D> extends IResult<D> {
  exit: 'return'
  data: D
}

interface Throw extends IResult {
  exit: 'throw'
  error: any
}

export type Result<D> = Return<D> | Throw

export class Exit<D=any> implements IResult<D> {
  didThrow(): this is Throw {
    return this.exit === 'throw'
  }

  didReturn(): this is Return<D> {
    return this.exit === 'return'
  }

  get error() { return this.data }

  *errors(): Iterable<Error> {
    for (const error of this.log.filter(isError))
      yield error
    if (this.didThrow() && this.error instanceof Error)
      yield this.error
  }
  
  constructor (
    public readonly exit: 'return' | 'throw',
    public readonly log: Log,
    public readonly data: any) { }
}

function isError(m: any): m is Error {
  return m instanceof Error
}

const YES = () => true
class Report implements Log {
  messages?: any[]

  *[Symbol.iterator](): Iterator<any> {
    if (!this.messages) return
    for (const m of this.messages) {
      if (m instanceof Report) yield *m
      else yield m
    }
  }

  *filter<S>(pred: (e: any) => e is S = YES as any): Iterable<S> {
    for (const m of this) if (pred(m)) yield m
  }

  report(msg: any) {
    if (!this.messages) this.messages = []
    this.messages.push(msg)
  }  
}

let currentLog: Report | null = null

export function report<T>(msg: T): T {
  currentLog?.report(msg)
  return msg
}

function execute<F extends (...args: any[]) => any>(fn: F, self: ThisParameterType<F>, args: Parameters<F>): Result<ReturnType<F>> {
  const lastLog = currentLog
  const log = new Report
  let exit: 'return' | 'throw' = 'return'
  let data: any = null
  try {
    currentLog = log
    data = fn.apply(self, args)
  } catch (error) {
    exit = 'throw'
    data = error as Error
  } finally {
    currentLog = lastLog
  }
  return new Exit(exit, log, data)
}

const cache = new WeakishTrie<Result<any>>()

export type Recall<F extends (...args: any[]) => any> = F & {
  getResult(this: ThisParameterType<F>, ...args: Parameters<F>): Result<ReturnType<F>>
  getExisting(this: ThisParameterType<F>, ...args: Parameters<F>): Result<ReturnType<F>> | undefined
}

function createRecall<F extends (...args: any[]) => any>(fn: F): Recall<F> {
  type This = ThisParameterType<F>
  type Args = Parameters<F>
  type Return = ReturnType<F>
  function call(this: This, ...args: Args): Return {
    const result = getResult.apply(this, args)
    if (currentLog) report(result.log)
    if (result.didThrow()) throw result.error
    return result.data
  }

  function getResult(this: This, ...args: Args): Result<Return> {
    const entry = cache.entry(fn, this, ...args)
    const result = entry.value ? entry.value : entry.set(execute(fn, this, args))
    return result
  }

  function getExisting(this: This, ...args: Args): Result<Return> | undefined {
    return cache.entry(fn, this, ...args).value
  }

  call.getResult = getResult
  call.getExisting = getExisting
  return call as any as Recall<F>
}

export const recall = createRecall(createRecall)
export default recall
