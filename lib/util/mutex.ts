export interface Mutex {
  locked: boolean;
  queue: (() => void)[];
}

export const Mutex = {
  new: (): Mutex => ({
    locked: false,
    queue: [],
  }),
};
export const takeMutex = async (mut: Mutex): Promise<void> => {
  return new Promise((resolve) => {
    if (mut.locked) {
      mut.queue.push(resolve);
    } else {
      mut.locked = true;
      resolve();
    }
  });
};
export const giveMutex = async (mut: Mutex) => {
  if (mut.queue.length) {
    mut.queue.shift()!();
  } else {
    mut.locked = false;
  }
};

export interface Semaphore {
  max: number;
  count: number;
  queue: (() => void)[];
}
export const Semaphore = {
  new: (max: number): Semaphore => ({ max, count: 0, queue: [] }),
};
export const takeSemaphore = async (sem: Semaphore): Promise<void> => {
  return new Promise((resolve) => {
    if (sem.count < sem.max) {
      sem.count++;
      resolve();
    } else {
      sem.queue.push(resolve);
    }
  });
};
export const giveSemaphore = (sem: Semaphore) => {
  if (sem.queue.length) {
    sem.queue.shift()!();
  } else {
    sem.count--;
  }
};
