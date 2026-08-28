import type {Side} from './types';

export function attachBuiltInSvgLayers(
	shell: HTMLElement,
	side: Side,
	sourceSvg: SVGSVGElement | undefined,
) {
	const frames = shell.querySelectorAll(
		`.two-up .${side}-frame, .swipe .${side}-frame, .onion-skin .${side}-frame`,
	);

	for (const frame of frames) {
		attachSvgLayer(frame, sourceSvg, side);
	}
}

export function attachSvgLayer(
	host: Element | undefined,
	sourceSvg: SVGSVGElement | undefined,
	side: Side,
) {
	if (!host || !sourceSvg) {
		return;
	}

	host.classList.add('simple-icons-companion-svg-host');

	for (const child of host.children) {
		if (child.classList.contains('simple-icons-companion-svg-layer')) {
			child.remove();
		}
	}

	const layer = document.createElement('span');
	const svg = sourceSvg.cloneNode(true);

	if (!(svg instanceof SVGSVGElement)) {
		return;
	}

	layer.className = 'simple-icons-companion-svg-layer';
	layer.style.setProperty(
		'--simple-icons-companion-preview-color',
		`var(--simple-icons-companion-${side}-color)`,
	);
	copyPreviewImageFrameStyles(host, layer);
	layer.append(svg);
	host.append(layer);
}

function copyPreviewImageFrameStyles(host: Element, layer: HTMLElement) {
	const image = host.querySelector<HTMLImageElement>(':scope > img');

	if (!image) {
		return;
	}

	const imageStyle = getComputedStyle(image);
	layer.style.background = imageStyle.background;
	layer.style.borderTop = imageStyle.borderTop;
	layer.style.borderRight = imageStyle.borderRight;
	layer.style.borderBottom = imageStyle.borderBottom;
	layer.style.borderLeft = imageStyle.borderLeft;
	layer.style.borderRadius = imageStyle.borderRadius;
	layer.style.borderImage = imageStyle.borderImage;
	layer.style.boxSizing = imageStyle.boxSizing;
	layer.style.boxShadow = imageStyle.boxShadow;
}
