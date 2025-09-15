export async function updateDescendantPaths(LocationModel, rootId) {
  const root = await LocationModel.findById(rootId).lean();
  if (!root) return;
  const queue = [rootId];
  while (queue.length) {
    const currentId = queue.shift();
    const parent = await LocationModel.findById(currentId).lean();
    const children = await LocationModel.find({ parent: currentId }).lean();
    for (const child of children) {
      const newPath = [...(parent.path || []), parent._id];
      await LocationModel.updateOne({ _id: child._id }, { $set: { path: newPath } });
      queue.push(child._id);
    }
  }
}
