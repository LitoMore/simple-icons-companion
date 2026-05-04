import {defaultSvgSize, overlayFrameSize} from './constants';
import type {Size, SourceSvg, ViewBox} from './types';

export async function fetchSvg(
	url: string,
	forceWhite: boolean,
): Promise<SourceSvg> {
	const response = await fetch(url);

	if (!response.ok) {
		throw new Error(`HTTP ${response.status}`);
	}

	const source = await response.text();
	const svg = parseSvg(source);
	sanitizeSvg(svg);
	const size = getSvgSize(svg);

	if (forceWhite) {
		forceSvgFill(svg, '#fff');
	}

	normalizeSvgElement(svg);

	return {
		element: svg,
		size,
	};
}

function parseSvg(source: string) {
	const svgDocument = new DOMParser().parseFromString(source, 'image/svg+xml');
	const parserError = svgDocument.querySelector('parsererror');

	if (parserError) {
		throw new Error('Invalid SVG');
	}

	const svg = svgDocument.querySelector('svg');

	if (!(svg instanceof SVGSVGElement)) {
		throw new TypeError('Missing SVG root');
	}

	return document.importNode(svg, true);
}

function sanitizeSvg(svg: SVGSVGElement) {
	for (const element of svg.querySelectorAll(
		'script, foreignObject, iframe, object, embed',
	)) {
		element.remove();
	}

	for (const element of [svg, ...svg.querySelectorAll('*')]) {
		for (const attribute of element.attributes) {
			const name = attribute.name.toLowerCase();
			const value = attribute.value.trim().toLowerCase();

			const scriptProtocol = ['java', 'script:'].join('');

			if (name.startsWith('on') || value.startsWith(scriptProtocol)) {
				element.removeAttribute(attribute.name);
			}
		}
	}
}

export function forceSvgFill(svg: SVGSVGElement, color: string) {
	svg.setAttribute('fill', color);
	svg.style.color = color;
	svg.style.fill = color;

	for (const element of svg.querySelectorAll<SVGElement>('*')) {
		const fill = element.getAttribute('fill');
		const stroke = element.getAttribute('stroke');

		if (fill !== 'none') {
			element.setAttribute('fill', color);
			element.style.fill = color;
		}

		if (stroke && stroke !== 'none') {
			element.setAttribute('stroke', color);
			element.style.stroke = color;
		}
	}
}

function normalizeSvgElement(svg: SVGSVGElement) {
	svg.classList.add('simple-icons-companion-preview-svg');
	svg.removeAttribute('width');
	svg.removeAttribute('height');
	svg.setAttribute('aria-hidden', 'true');
	svg.setAttribute('focusable', 'false');
	svg.style.width = '100%';
	svg.style.height = '100%';
}

function getSvgSize(svg: SVGSVGElement): Size {
	const width = parseSvgLength(svg.getAttribute('width') ?? undefined);
	const height = parseSvgLength(svg.getAttribute('height') ?? undefined);
	const viewBox = parseViewBox(svg.getAttribute('viewBox') ?? undefined);

	if (width && height) {
		return {width, height};
	}

	if (viewBox) {
		const ratio = viewBox.width / viewBox.height;

		if (width) {
			return {width, height: width / ratio};
		}

		if (height) {
			return {width: height * ratio, height};
		}

		if (ratio >= 1) {
			return {width: defaultSvgSize, height: defaultSvgSize / ratio};
		}

		return {width: defaultSvgSize * ratio, height: defaultSvgSize};
	}

	return {
		width: width ?? defaultSvgSize,
		height: height ?? defaultSvgSize,
	};
}

export function createOverlayLayout(
	deletedSvg: SourceSvg,
	addedSvg: SourceSvg,
) {
	const contentFrame: Size = {
		width: defaultSvgSize,
		height: defaultSvgSize,
	};
	const frame: Size = {
		width: overlayFrameSize,
		height: overlayFrameSize,
	};
	const deletedSize = scaleToFitFrame(deletedSvg.size, contentFrame);
	const addedSize = scaleToFitFrame(addedSvg.size, contentFrame);

	return {
		frame,
		deletedLayer: createSvgLayer(
			'simple-icons-companion-overlay-deleted',
			deletedSvg.element,
			deletedSize,
		),
		addedLayer: createSvgLayer(
			'simple-icons-companion-overlay-added',
			addedSvg.element,
			addedSize,
		),
	};
}

function createSvgLayer(className: string, svg: SVGSVGElement, size: Size) {
	const layer = document.createElement('span');
	layer.className = `simple-icons-companion-overlay-layer ${className}`;
	layer.style.width = `${size.width}px`;
	layer.style.height = `${size.height}px`;
	layer.append(svg);

	return layer;
}

function scaleToFitFrame(size: Size, frame: Size): Size {
	const scale = Math.min(frame.width / size.width, frame.height / size.height);
	return {
		width: size.width * scale,
		height: size.height * scale,
	};
}

function parseSvgLength(value: string | undefined) {
	if (!value || value.endsWith('%')) {
		return undefined;
	}

	const parsed = Number.parseFloat(value);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

export function parseViewBox(value: string | undefined): ViewBox | undefined {
	if (!value) {
		return undefined;
	}

	const parts = value
		.trim()
		.split(/[\s,]+/v)
		.map((part) => Number.parseFloat(part));

	if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) {
		return undefined;
	}

	const [x, y, width, height] = parts;

	if (
		x === undefined ||
		y === undefined ||
		width === undefined ||
		height === undefined ||
		width <= 0 ||
		height <= 0
	) {
		return undefined;
	}

	return {x, y, width, height};
}
