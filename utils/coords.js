export function convertToPdfPoints(section, pageDims, renderedDims) {
  const scaleX = pageDims.width / renderedDims.width;
  const scaleY = pageDims.height / renderedDims.height;
  return {
    page: section.page,
    x: Math.round(section.x * scaleX),
    y: Math.round(section.y * scaleY),
    width: Math.round(section.width * scaleX),
    height: Math.round(section.height * scaleY),
  };
}
