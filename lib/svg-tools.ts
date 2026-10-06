const allowedTags = new Set(["svg", "g", "path", "circle", "ellipse", "rect", "line", "polyline", "polygon", "defs", "lineargradient", "radialgradient", "stop", "clippath", "mask", "title", "desc", "use"]);
const allowedAttributes = new Set(["xmlns", "viewbox", "width", "height", "fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin", "stroke-miterlimit", "stroke-dasharray", "stroke-dashoffset", "fill-rule", "clip-rule", "opacity", "fill-opacity", "stroke-opacity", "transform", "d", "x", "y", "x1", "x2", "y1", "y2", "cx", "cy", "r", "rx", "ry", "points", "offset", "stop-color", "stop-opacity", "gradientunits", "gradienttransform", "spreadmethod", "id", "class", "clip-path", "mask", "preserveaspectratio", "role", "aria-label", "aria-labelledby"]);

export type SvgReport = { removedElements: number; removedAttributes: number; externalReferences: number; warnings: string[] };

export const hasDangerousSvgMarkup = (source: string) => /<\s*(script|foreignObject|iframe|object|embed)|\son[a-z]+\s*=|javascript\s*:|https?:\/\//i.test(source);

export const sanitizeSvg = (source: string): { svg: string; report: SvgReport } => {
  const parser = new DOMParser();
  const document = parser.parseFromString(source, "image/svg+xml");
  if (document.querySelector("parsererror") || document.documentElement.tagName.toLowerCase() !== "svg") throw new Error("The file is not valid SVG markup.");
  const report: SvgReport = { removedElements: 0, removedAttributes: 0, externalReferences: 0, warnings: [] };
  const all = Array.from(document.querySelectorAll("*"));
  all.forEach((element) => {
    const tag = element.tagName.toLowerCase();
    if (!allowedTags.has(tag)) { element.remove(); report.removedElements += 1; return; }
    Array.from(element.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim();
      const external = name === "href" || name === "xlink:href";
      if (external) {
        if (!value.startsWith("#")) { element.removeAttribute(attribute.name); report.externalReferences += 1; }
        return;
      }
      if (!allowedAttributes.has(name) || name.startsWith("on") || /javascript\s*:|data\s*:|https?:\/\//i.test(value)) {
        element.removeAttribute(attribute.name); report.removedAttributes += 1;
      }
    });
  });
  const root = document.documentElement;
  root.removeAttribute("style");
  root.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  if (!root.getAttribute("viewBox")) {
    const width = Number.parseFloat(root.getAttribute("width") ?? "");
    const height = Number.parseFloat(root.getAttribute("height") ?? "");
    if (Number.isFinite(width) && Number.isFinite(height)) root.setAttribute("viewBox", `0 0 ${width} ${height}`);
    else report.warnings.push("No viewBox or numeric width and height were found.");
  }
  root.removeAttribute("width"); root.removeAttribute("height");
  const svg = new XMLSerializer().serializeToString(root).replace(/>\s+</g, "><").replace(/\s{2,}/g, " ").trim();
  return { svg, report };
};

export const recolorSvg = (source: string, colour: string, mode: "all" | "monochrome" = "all") => {
  const parser = new DOMParser();
  const document = parser.parseFromString(source, "image/svg+xml");
  document.querySelectorAll("path,circle,ellipse,rect,line,polyline,polygon").forEach((element) => {
    const fill = element.getAttribute("fill");
    const stroke = element.getAttribute("stroke");
    if (mode === "monochrome" || (fill && fill !== "none")) element.setAttribute("fill", colour);
    if (mode === "monochrome" || (stroke && stroke !== "none")) element.setAttribute("stroke", colour);
    if (!fill && !stroke) element.setAttribute("fill", colour);
  });
  return new XMLSerializer().serializeToString(document.documentElement);
};

export const tightenSvgViewBox = async (source: string) => {
  const wrapper = document.createElement("div");
  wrapper.style.cssText = "position:fixed;left:-10000px;top:-10000px;width:1000px;height:1000px;visibility:hidden";
  wrapper.innerHTML = source;
  document.body.append(wrapper);
  try {
    const svg = wrapper.querySelector("svg");
    if (!svg) throw new Error("No SVG root found.");
    const box = svg.getBBox();
    if (!box.width || !box.height) throw new Error("The visible artwork has no measurable bounds.");
    const padding = Math.max(box.width, box.height) * .02;
    svg.setAttribute("viewBox", `${box.x - padding} ${box.y - padding} ${box.width + padding * 2} ${box.height + padding * 2}`);
    return new XMLSerializer().serializeToString(svg);
  } finally { wrapper.remove(); }
};

export const svgToReactComponent = (source: string, componentName = "KritivaIcon") => {
  const jsx = source
    .replace(/class=/g, "className=")
    .replace(/stroke-width=/g, "strokeWidth=")
    .replace(/stroke-linecap=/g, "strokeLinecap=")
    .replace(/stroke-linejoin=/g, "strokeLinejoin=")
    .replace(/fill-rule=/g, "fillRule=")
    .replace(/clip-rule=/g, "clipRule=")
    .replace(/<svg([^>]*)>/, `<svg$1 {...props}>`);
  return `import type { SVGProps } from "react";\n\nexport function ${componentName}(props: SVGProps<SVGSVGElement>) {\n  return (\n    ${jsx}\n  );\n}\n`;
};
