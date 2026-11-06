export function removeObjectsById(objects, ids) {
  return objects.flatMap((object) => {
    if (ids.has(object.id)) return [];
    if (object.type === "group") return [{ ...object, children: removeObjectsById(object.children ?? [], ids) }];
    return [object];
  });
}

export function transformEffectOffset(object, x, y) {
  const localX = x * (object.flipHorizontal ? -1 : 1);
  const localY = y * (object.flipVertical ? -1 : 1);
  const angle = (object.rotation ?? 0) * Math.PI / 180;
  return {
    x: localX * Math.cos(angle) - localY * Math.sin(angle),
    y: localX * Math.sin(angle) + localY * Math.cos(angle),
  };
}
