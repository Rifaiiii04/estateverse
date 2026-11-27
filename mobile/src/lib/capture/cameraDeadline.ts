// cameraDeadline bounds native bridge work and releases any result that arrives after the caller has moved on.
export function cameraDeadline<T>(task: Promise<T>, timeout: number, message: string, discard?: (value: T) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    let expired = false;
    const timer = setTimeout(() => {
      expired = true;
      reject(new Error(message));
    }, timeout);
    task.then(value => {
      clearTimeout(timer);
      if (expired) discard?.(value);
      else resolve(value);
    }, error => { clearTimeout(timer); reject(error); });
  });
}
