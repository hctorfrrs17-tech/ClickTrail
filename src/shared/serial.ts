export function createSerialQueue() {
  let tail: Promise<void> = Promise.resolve();

  return function enqueue<T>(operation: () => Promise<T> | T): Promise<T> {
    const result = tail.then(operation, operation);
    tail = result.then(() => undefined, () => undefined);
    return result;
  };
}
