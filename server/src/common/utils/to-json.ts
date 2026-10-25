export function stripInternalFields(
  _document: unknown,
  result: Record<string, unknown>,
) {
  delete result._id;
  delete result.__v;

  return result;
}
