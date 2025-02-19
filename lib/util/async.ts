import { Semaphore, giveSemaphore, takeSemaphore } from "./mutex";

export const sequence = async (
  ...promises: Promise<unknown>[]
): Promise<void> => {
  for (let p in promises) {
    await p;
  }
};

export const map = async <S, T>(
  arr: S[],
  func: (v: S, i: number) => Promise<T>
): Promise<T[]> => {
  return Promise.all(arr.map(func));
  //   let res: T[] = [];
  //   for (let i = 0; i < arr.length; i++) res.push(await func(arr[i], i));
  //   return res;
};
// export const reduce

export interface Pool {
  sem: Semaphore;
}
export const Pool = {
  new: (max: number): Pool => ({ sem: Semaphore.new(max) }),
};

export const executePooled = async <T>(
  pool: Pool,
  promise: Promise<T>
): Promise<T> => {
  await takeSemaphore(pool.sem);
  let res = await promise;
  giveSemaphore(pool.sem);
  return res;
};
