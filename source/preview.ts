import {attachBuiltInSvgLayers, attachSvgLayer} from './appearance';
import {fetchSimpleIconColor} from './colors';
import {overlayMode} from './constants';
import {
	disableColorToggle,
	disableOutlineToggle,
	disablePointsToggle,
	enableColorToggle,
	enableOutlineToggle,
} from './controls';
import {resizeParent} from './modes';
import {
	attachBuiltInPoints,
	attachOverlayPoints,
	attachPointsLayer,
	watchSwipePoints,
} from './points';
import {createOverlayLayout, fetchSvg} from './svg';
import type {
	DiffEnhancementOptions,
	PointsState,
	Side,
	SingleColorOptions,
} from './types';

export function createOverlayView() {
	const view = document.createElement('div');
	view.className = 'overlay view simple-icons-companion-overlay-view';
	view.style.display = 'none';
	view.innerHTML = `
      <span class="frame-label simple-icons-companion-overlay-title">Overlay</span>
      <span class="simple-icons-companion-overlay-frame" aria-label="Deleted SVG with added SVG overlaid">
        <span class="simple-icons-companion-overlay-loading">Loading overlay...</span>
      </span>
    `;

	return view;
}

export async function renderOverlay(
	view: HTMLElement,
	deletedUrl: string,
	addedUrl: string,
	pointsState: PointsState,
) {
	const frame = view.querySelector<HTMLElement>(
		'.simple-icons-companion-overlay-frame',
	);

	if (!frame) {
		return;
	}

	try {
		const [deletedSvg, addedSvg] = await Promise.all([
			fetchSvg(deletedUrl, false),
			fetchSvg(addedUrl, false),
		]);

		const layout = createOverlayLayout(deletedSvg, addedSvg);
		frame.replaceChildren(layout.deletedLayer, layout.addedLayer);
		frame.style.width = `${layout.frame.width}px`;
		frame.style.height = `${layout.frame.height}px`;
		attachOverlayPoints(view, pointsState);

		if (view.style.display !== 'none') {
			const shell = view.closest<HTMLElement>('[data-type="diff"]');
			if (shell) {
				resizeParent(shell, view, overlayMode);
			}
		}
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		frame.replaceChildren(`Overlay failed to load: ${message}`);
		frame.classList.add('simple-icons-companion-overlay-error');
	}
}

export async function renderPreviewEnhancements({
	shell,
	overlayView,
	deletedUrl,
	addedUrl,
	pointsState,
}: DiffEnhancementOptions) {
	try {
		const [deletedSvg, addedSvg] = await Promise.all([
			fetchSvg(deletedUrl, false),
			fetchSvg(addedUrl, false),
		]);

		pointsState.deletedSvg = deletedSvg.element;
		pointsState.addedSvg = addedSvg.element;

		attachBuiltInPoints(shell, 'deleted', pointsState.deletedSvg);
		attachBuiltInPoints(shell, 'added', pointsState.addedSvg);
		attachBuiltInSvgLayers(shell, 'deleted', pointsState.deletedSvg);
		attachBuiltInSvgLayers(shell, 'added', pointsState.addedSvg);
		watchSwipePoints(shell);
		attachOverlayPoints(overlayView, pointsState);
		enableOutlineToggle();
		void loadPreviewColors(shell, deletedUrl, addedUrl, pointsState);
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		disablePointsToggle(message);
		disableOutlineToggle(shell, message);
	}
}

export async function renderSinglePreviewControls(
	shell: HTMLElement,
	frame: HTMLElement,
	side: Side,
	svgUrl: string,
) {
	try {
		const svg = await fetchSvg(svgUrl, false);

		attachPointsLayer(frame, svg.element);
		attachSvgLayer(frame, svg.element, side);
		enableOutlineToggle();
		void loadSinglePreviewColor({
			shell,
			side,
			svgUrl,
			sourceSvg: svg.element,
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		disablePointsToggle(message);
		disableOutlineToggle(shell, message);
	}
}

async function loadPreviewColors(
	shell: HTMLElement,
	deletedUrl: string,
	addedUrl: string,
	pointsState: PointsState,
) {
	try {
		const [deletedColor, addedColor] = await Promise.all([
			fetchSimpleIconColor(deletedUrl, pointsState.deletedSvg),
			fetchSimpleIconColor(addedUrl, pointsState.addedSvg),
		]);

		pointsState.deletedColor = deletedColor;
		pointsState.addedColor = addedColor;

		shell.style.setProperty(
			'--simple-icons-companion-deleted-color',
			deletedColor,
		);
		shell.style.setProperty('--simple-icons-companion-added-color', addedColor);

		enableColorToggle({deleted: deletedColor, added: addedColor});
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		disableColorToggle(shell, message);
	}
}

async function loadSinglePreviewColor({
	shell,
	side,
	svgUrl,
	sourceSvg,
}: SingleColorOptions) {
	try {
		const color = await fetchSimpleIconColor(svgUrl, sourceSvg);

		shell.style.setProperty(`--simple-icons-companion-${side}-color`, color);
		enableColorToggle({[side]: color});
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		disableColorToggle(shell, message);
	}
}
