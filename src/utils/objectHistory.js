export function serializeObjectSnapshot(objects) {
  return JSON.stringify(objects);
}

export function restoreObjectSnapshot(snapshot) {
  return JSON.parse(snapshot);
}
