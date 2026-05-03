// ==UserScript==
// @name         Simple Icons Companion
// @namespace    https://github.com/simple-icons/simple-icons
// @version      0.0.0
// @description  Adds Overlay mode plus Points and Color toggles to Simple Icons SVG diffs on GitHub.
// @license      MIT
// @updateURL    https://github.com/LitoMore/simple-icons-companion/raw/refs/heads/main/simple-icons-companion.user.js
// @downloadURL  https://github.com/LitoMore/simple-icons-companion/raw/refs/heads/main/simple-icons-companion.user.js
// @match        https://github.com/simple-icons/simple-icons/*
// @match        https://viewscreen.githubusercontent.com/diff/svg*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
	'use strict';

	const SIMPLE_ICONS_REPOSITORY_PATH = '/simple-icons/simple-icons';
	const SIMPLE_ICONS_NWO = 'simple-icons/simple-icons';
	const OVERLAY_MODE = 'overlay';
	const DEFAULT_SVG_SIZE = 300;
	const OVERLAY_FRAME_SIZE = 302;
	const STYLE_ID = 'simple-icons-companion-styles';
	const SVG_NS = 'http://www.w3.org/2000/svg';
	const PATH_COMMAND_PATTERN = /^[AaCcHhLlMmQqSsTtVvZz]$/;
	const POINTS_STORAGE_KEY = 'simple-icons-companion:points-enabled';
	const COLOR_STORAGE_KEY = 'simple-icons-companion:color-enabled';
	const simpleIconsMetadataCache = new Map();

	if (isSimpleIconsRepositoryPage()) {
		return;
	}

	if (!isSimpleIconsSvgDiffFrame()) {
		return;
	}

	initCompanionModes();

	function isSimpleIconsRepositoryPage() {
		return (
			window.location.hostname === 'github.com' &&
			window.location.pathname.startsWith(`${SIMPLE_ICONS_REPOSITORY_PATH}/`)
		);
	}

	function isSimpleIconsSvgDiffFrame() {
		if (
			window.location.hostname !== 'viewscreen.githubusercontent.com' ||
			!window.location.pathname.startsWith('/diff/svg')
		) {
			return false;
		}

		const params = new URLSearchParams(window.location.search);
		if (params.get('nwo') === SIMPLE_ICONS_NWO) {
			return true;
		}

		if (!document.referrer) {
			return false;
		}

		try {
			const referrer = new URL(document.referrer);
			return (
				referrer.hostname === 'github.com' &&
				referrer.pathname.startsWith(`${SIMPLE_ICONS_REPOSITORY_PATH}/`)
			);
		} catch {
			return false;
		}
	}

	function initCompanionModes() {
		const shell = document.querySelector(
			'.js-render-shell [data-type="diff"][data-file1][data-file2]',
		);

		if (!shell || shell.dataset.simpleIconsCompanionOverlay === 'true') {
			return;
		}

		const deletedUrl = shell.dataset.file1;
		const addedUrl = shell.dataset.file2;
		const renderBar = shell.querySelector('.js-render-bar');
		const modes = shell.querySelector('fieldset.js-view-modes');

		if (!deletedUrl || !addedUrl || !renderBar || !modes) {
			return;
		}

		shell.dataset.simpleIconsCompanionOverlay = 'true';
		injectStyles();

		const pointsState = {
			deletedSvg: null,
			addedSvg: null,
			deletedColor: null,
			addedColor: null,
		};
		const overlayView = createOverlayView();
		shell.insertBefore(overlayView, renderBar);
		appendModeControl(modes, OVERLAY_MODE, 'Overlay');
		appendPointsToggle(shell, modes);
		appendColorToggle(shell, modes);
		bindModeSwitching(shell, modes);

		renderOverlay(overlayView, deletedUrl, addedUrl, pointsState);
		renderPreviewEnhancements(
			shell,
			overlayView,
			deletedUrl,
			addedUrl,
			pointsState,
		);
	}

	function createOverlayView() {
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

	function appendModeControl(modes, value, labelText) {
		if (modes.querySelector(`input[value="${cssAttributeValue(value)}"]`)) {
			return;
		}

		const label = document.createElement('label');
		label.className = 'js-view-mode-item';

		const input = document.createElement('input');
		input.name = 'view-mode';
		input.type = 'radio';
		input.value = value;

		label.append(input, document.createTextNode(labelText));
		modes.append(label);
	}

	function appendPointsToggle(shell, modes) {
		const existingInput = document.getElementById(
			'simple-icons-companion-points-toggle',
		);
		if (existingInput instanceof HTMLInputElement) {
			return existingInput;
		}

		const label = document.createElement('label');
		label.className = 'simple-icons-companion-points-toggle';
		label.htmlFor = 'simple-icons-companion-points-toggle';

		const input = document.createElement('input');
		input.id = 'simple-icons-companion-points-toggle';
		input.type = 'checkbox';
		input.checked = readStoredToggle(POINTS_STORAGE_KEY);
		shell.classList.toggle(
			'simple-icons-companion-points-enabled',
			input.checked,
		);

		input.addEventListener('change', () => {
			writeStoredToggle(POINTS_STORAGE_KEY, input.checked);
			shell.classList.toggle(
				'simple-icons-companion-points-enabled',
				input.checked,
			);
		});

		label.append(input, document.createTextNode('Points'));

		const tooltip = document.createElement('span');
		tooltip.className = 'simple-icons-companion-points-tooltip';
		tooltip.tabIndex = 0;
		tooltip.setAttribute('role', 'img');
		tooltip.setAttribute(
			'aria-label',
			'Point color legend: yellow means initial move points, red means path endpoints.',
		);
		tooltip.textContent = 'i';

		const tooltipText = document.createElement('span');
		tooltipText.className = 'simple-icons-companion-points-tooltip-text';
		tooltipText.textContent = [
			'Yellow: initial move points.',
			'Red: path endpoints.',
		].join('\n');
		tooltip.append(tooltipText);

		const wrapper = getCompanionControls(modes);
		wrapper.append(label, tooltip);

		return input;
	}

	function appendColorToggle(shell, modes) {
		const existingInput = document.getElementById(
			'simple-icons-companion-color-toggle',
		);
		if (existingInput instanceof HTMLInputElement) {
			return existingInput;
		}

		const label = document.createElement('label');
		label.className = 'simple-icons-companion-color-toggle';
		label.classList.add('simple-icons-companion-color-toggle-disabled');
		label.htmlFor = 'simple-icons-companion-color-toggle';
		label.title = 'Loading Simple Icons colors...';

		const input = document.createElement('input');
		input.id = 'simple-icons-companion-color-toggle';
		input.type = 'checkbox';
		input.disabled = true;
		input.checked = readStoredToggle(COLOR_STORAGE_KEY);
		shell.classList.toggle(
			'simple-icons-companion-color-enabled',
			input.checked,
		);

		input.addEventListener('change', () => {
			writeStoredToggle(COLOR_STORAGE_KEY, input.checked);
			shell.classList.toggle(
				'simple-icons-companion-color-enabled',
				input.checked,
			);
		});

		label.append(input, document.createTextNode('Color'));
		getCompanionControls(modes).append(label);

		return input;
	}

	function getCompanionControls(modes) {
		const existingWrapper = modes.parentElement?.querySelector(
			'.simple-icons-companion-controls',
		);
		if (existingWrapper) {
			return existingWrapper;
		}

		const wrapper = document.createElement('span');
		wrapper.className =
			'simple-icons-companion-controls simple-icons-companion-points-control';
		modes.insertAdjacentElement('afterend', wrapper);

		return wrapper;
	}

	function readStoredToggle(key) {
		try {
			return window.localStorage.getItem(key) === 'true';
		} catch {
			return false;
		}
	}

	function writeStoredToggle(key, value) {
		try {
			window.localStorage.setItem(key, value ? 'true' : 'false');
		} catch {
			// Storage can be blocked for embedded iframes; the checkbox still works.
		}
	}

	function bindModeSwitching(shell, modes) {
		if (modes.dataset.simpleIconsCompanionOverlay === 'true') {
			return;
		}

		modes.dataset.simpleIconsCompanionOverlay = 'true';
		modes.addEventListener('change', (event) => {
			const input = event.target;

			if (!(input instanceof HTMLInputElement) || input.name !== 'view-mode') {
				return;
			}

			switchMode(shell, modes, input.value);
		});
	}

	function switchMode(shell, modes, mode) {
		const targetView = Array.from(shell.querySelectorAll('.view')).find(
			(view) => view.classList.contains(mode),
		);

		if (!targetView) {
			return;
		}

		for (const view of shell.querySelectorAll('.view')) {
			view.style.display = 'none';
		}

		targetView.style.display = mode === OVERLAY_MODE ? 'flex' : 'block';

		for (const label of modes.querySelectorAll('.js-view-mode-item')) {
			label.classList.remove('selected');
		}

		modes
			.querySelector(`input[value="${cssAttributeValue(mode)}"]`)
			?.closest('.js-view-mode-item')
			?.classList.add('selected');

		requestAnimationFrame(() => resizeParent(shell, targetView, mode));
	}

	function resizeParent(shell, view, mode) {
		const renderBarHeight =
			shell.querySelector('.js-render-bar')?.getBoundingClientRect().height ??
			0;
		let extraHeight = renderBarHeight + 40;

		if (mode === 'swipe') {
			extraHeight += 14;
		} else if (mode === 'onion-skin') {
			extraHeight += 45;
		}

		const height = Math.ceil(view.getBoundingClientRect().height + extraHeight);
		const identity = window.location.hash.slice(1);
		let targetOrigin = '*';

		if (document.referrer) {
			try {
				targetOrigin = new URL(document.referrer).origin;
			} catch {
				targetOrigin = '*';
			}
		}

		window.parent.postMessage(
			{
				type: 'render',
				body: 'resize',
				payload: {height},
				identity,
			},
			targetOrigin,
		);
	}

	async function renderOverlay(view, deletedUrl, addedUrl, pointsState) {
		const frame = view.querySelector('.simple-icons-companion-overlay-frame');

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
				const shell = view.closest('[data-type="diff"]');
				if (shell) {
					resizeParent(shell, view, OVERLAY_MODE);
				}
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unknown error';
			frame.replaceChildren(`Overlay failed to load: ${message}`);
			frame.classList.add('simple-icons-companion-overlay-error');
		}
	}

	async function renderPreviewEnhancements(
		shell,
		overlayView,
		deletedUrl,
		addedUrl,
		pointsState,
	) {
		try {
			const [deletedSvg, addedSvg] = await Promise.all([
				fetchSvg(deletedUrl, false),
				fetchSvg(addedUrl, false),
			]);

			pointsState.deletedSvg = deletedSvg.element;
			pointsState.addedSvg = addedSvg.element;

			attachBuiltInPoints(shell, 'deleted', pointsState.deletedSvg);
			attachBuiltInPoints(shell, 'added', pointsState.addedSvg);
			watchSwipePoints(shell);
			attachOverlayPoints(overlayView, pointsState);
			loadPreviewColors(shell, deletedUrl, addedUrl, pointsState);
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unknown error';
			const toggle = document.querySelector(
				'.simple-icons-companion-points-toggle',
			);
			const input = toggle?.querySelector('input');

			if (toggle) {
				toggle.title = `Points failed to load: ${message}`;
				toggle.classList.add('simple-icons-companion-points-toggle-error');
			}

			if (input instanceof HTMLInputElement) {
				input.disabled = true;
			}
		}
	}

	async function loadPreviewColors(shell, deletedUrl, addedUrl, pointsState) {
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
			shell.style.setProperty(
				'--simple-icons-companion-added-color',
				addedColor,
			);

			attachBuiltInColor(
				shell,
				'deleted',
				pointsState.deletedSvg,
				deletedColor,
			);
			attachBuiltInColor(shell, 'added', pointsState.addedSvg, addedColor);
			enableColorToggle(deletedColor, addedColor);
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unknown error';
			disableColorToggle(shell, message);
		}
	}

	function attachBuiltInPoints(shell, side, sourceSvg) {
		const frames = shell.querySelectorAll(
			`.two-up .${side}-frame, .swipe .${side}-frame, .onion-skin .${side}-frame`,
		);

		for (const frame of frames) {
			attachPointsLayer(frame, sourceSvg);
		}
	}

	function attachBuiltInColor(shell, side, sourceSvg, color) {
		const frames = shell.querySelectorAll(
			`.two-up .${side}-frame, .swipe .${side}-frame, .onion-skin .${side}-frame`,
		);

		for (const frame of frames) {
			attachColorLayer(frame, sourceSvg, color);
		}
	}

	function watchSwipePoints(shell) {
		const swipeFrame = shell.querySelector('.swipe .swipe-frame');
		const swipeShell = swipeFrame?.querySelector('.swipe-shell');

		if (!swipeFrame || !swipeShell) {
			return;
		}

		syncSwipePointsClip(swipeFrame, swipeShell);

		if (swipeFrame.dataset.simpleIconsCompanionSwipePoints === 'true') {
			return;
		}

		swipeFrame.dataset.simpleIconsCompanionSwipePoints = 'true';

		const sync = () => {
			syncSwipePointsClip(swipeFrame, swipeShell);
		};

		if ('ResizeObserver' in window) {
			new ResizeObserver(sync).observe(swipeShell);
		}

		const observer = new MutationObserver(() => {
			requestAnimationFrame(sync);
		});
		const swipeBar = swipeFrame.querySelector('.swipe-bar');

		observer.observe(swipeShell, {
			attributes: true,
			attributeFilter: ['class', 'style'],
		});

		if (swipeBar) {
			observer.observe(swipeBar, {
				attributes: true,
				attributeFilter: ['class', 'style'],
			});
		}

		window.addEventListener('resize', sync);
	}

	function syncSwipePointsClip(swipeFrame, swipeShell) {
		const width = Math.max(0, swipeShell.getBoundingClientRect().width);
		swipeFrame.style.setProperty(
			'--simple-icons-companion-swipe-added-width',
			`${width}px`,
		);
	}

	function attachOverlayPoints(overlayView, pointsState) {
		if (!pointsState.deletedSvg || !pointsState.addedSvg) {
			return;
		}

		attachPointsLayer(
			overlayView.querySelector('.simple-icons-companion-overlay-deleted'),
			pointsState.deletedSvg,
		);
		attachPointsLayer(
			overlayView.querySelector('.simple-icons-companion-overlay-added'),
			pointsState.addedSvg,
		);
	}

	function attachPointsLayer(host, sourceSvg) {
		if (!host || !sourceSvg) {
			return;
		}

		host.classList.add('simple-icons-companion-points-host');

		for (const child of Array.from(host.children)) {
			if (child.classList.contains('simple-icons-companion-points-layer')) {
				child.remove();
			}
		}

		host.append(createPathPointsLayer(sourceSvg));
	}

	function attachColorLayer(host, sourceSvg, color) {
		if (!host || !sourceSvg || !color) {
			return;
		}

		host.classList.add('simple-icons-companion-color-host');

		for (const child of Array.from(host.children)) {
			if (child.classList.contains('simple-icons-companion-color-layer')) {
				child.remove();
			}
		}

		const layer = document.createElement('span');
		const coloredSvg = sourceSvg.cloneNode(true);

		layer.className = 'simple-icons-companion-color-layer';
		forceSvgFill(coloredSvg, color);
		layer.append(coloredSvg);
		host.append(layer);
	}

	function enableColorToggle(deletedColor, addedColor) {
		const toggle = document.querySelector(
			'.simple-icons-companion-color-toggle',
		);
		const input = toggle?.querySelector('input');

		if (toggle) {
			toggle.title = `Deleted: ${deletedColor}; Added: ${addedColor}`;
			toggle.classList.remove('simple-icons-companion-color-toggle-error');
			toggle.classList.remove('simple-icons-companion-color-toggle-disabled');
		}

		if (input instanceof HTMLInputElement) {
			input.disabled = false;
		}
	}

	function disableColorToggle(shell, message) {
		const toggle = document.querySelector(
			'.simple-icons-companion-color-toggle',
		);
		const input = toggle?.querySelector('input');

		if (toggle) {
			toggle.title = `Color failed to load: ${message}`;
			toggle.classList.add('simple-icons-companion-color-toggle-error');
			toggle.classList.add('simple-icons-companion-color-toggle-disabled');
		}

		if (input instanceof HTMLInputElement) {
			input.checked = false;
			input.disabled = true;
		}

		shell.classList.remove('simple-icons-companion-color-enabled');
		writeStoredToggle(COLOR_STORAGE_KEY, false);
	}

	async function fetchSimpleIconColor(svgUrl, sourceSvg) {
		const rawFile = parseRawGitHubFileUrl(svgUrl);
		const title = sourceSvg.querySelector('title')?.textContent.trim() ?? '';

		if (!rawFile) {
			throw new Error('Missing raw GitHub URL');
		}

		if (!title) {
			throw new Error('Missing SVG title');
		}

		const icons = await fetchSimpleIconsMetadata(rawFile);
		const slug = getSvgSlug(rawFile.path);
		const icon = findSimpleIconMetadata(icons, title, slug);

		if (!icon) {
			throw new Error(`Missing metadata for ${title}`);
		}

		return normalizeHexColor(icon.hex);
	}

	async function fetchSimpleIconsMetadata(rawFile) {
		const cacheKey = `${rawFile.owner}/${rawFile.repo}/${rawFile.ref}`;

		if (simpleIconsMetadataCache.has(cacheKey)) {
			return simpleIconsMetadataCache.get(cacheKey);
		}

		const metadataUrl = `https://raw.githubusercontent.com/${rawFile.owner}/${rawFile.repo}/${rawFile.ref}/data/simple-icons.json`;
		const response = await fetch(metadataUrl);

		if (!response.ok) {
			throw new Error(`Metadata HTTP ${response.status}`);
		}

		const data = await response.json();
		const icons = Array.isArray(data) ? data : data.icons;

		if (!Array.isArray(icons)) {
			throw new Error('Invalid Simple Icons metadata');
		}

		simpleIconsMetadataCache.set(cacheKey, icons);
		return icons;
	}

	function parseRawGitHubFileUrl(url) {
		try {
			const parsed = new URL(url);
			const parts = parsed.pathname.split('/').filter(Boolean);

			if (parts.length < 4) {
				return undefined;
			}

			return {
				owner: parts[0],
				repo: parts[1],
				ref: parts[2],
				path: parts.slice(3).join('/'),
			};
		} catch {
			return undefined;
		}
	}

	function findSimpleIconMetadata(icons, title, slug) {
		const matchingTitle = icons.find((icon) => icon.title === title);
		if (matchingTitle) {
			return matchingTitle;
		}

		return icons.find((icon) => slugifyIconTitle(icon.title) === slug);
	}

	function getSvgSlug(path) {
		const fileName = path.split('/').pop() ?? '';
		return fileName.replace(/\.svg$/i, '');
	}

	function slugifyIconTitle(title) {
		if (typeof title !== 'string') {
			return '';
		}

		return title
			.toLowerCase()
			.replaceAll('&', 'and')
			.replaceAll('+', 'plus')
			.replaceAll('.', 'dot')
			.replace(/[^a-z0-9]/g, '');
	}

	function normalizeHexColor(value) {
		if (typeof value !== 'string') {
			throw new Error('Invalid hex color');
		}

		const hex = value.trim().replace(/^#/, '');

		if (!/^[\da-f]{6}$/i.test(hex)) {
			throw new Error(`Invalid hex color ${value}`);
		}

		return `#${hex.toUpperCase()}`;
	}

	async function fetchSvg(url, forceWhite) {
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

	function parseSvg(source) {
		const document = new DOMParser().parseFromString(source, 'image/svg+xml');
		const parserError = document.querySelector('parsererror');

		if (parserError) {
			throw new Error('Invalid SVG');
		}

		const svg = document.querySelector('svg');

		if (!(svg instanceof SVGSVGElement)) {
			throw new Error('Missing SVG root');
		}

		return window.document.importNode(svg, true);
	}

	function sanitizeSvg(svg) {
		for (const element of svg.querySelectorAll(
			'script, foreignObject, iframe, object, embed',
		)) {
			element.remove();
		}

		for (const element of [svg, ...svg.querySelectorAll('*')]) {
			for (const attribute of Array.from(element.attributes)) {
				const name = attribute.name.toLowerCase();
				const value = attribute.value.trim().toLowerCase();

				if (name.startsWith('on') || value.startsWith('javascript:')) {
					element.removeAttribute(attribute.name);
				}
			}
		}
	}

	function forceSvgFill(svg, color) {
		svg.setAttribute('fill', color);
		svg.style.color = color;
		svg.style.fill = color;

		for (const element of svg.querySelectorAll('*')) {
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

	function normalizeSvgElement(svg) {
		svg.classList.add('simple-icons-companion-preview-svg');
		svg.removeAttribute('width');
		svg.removeAttribute('height');
		svg.setAttribute('aria-hidden', 'true');
		svg.setAttribute('focusable', 'false');
		svg.style.width = '100%';
		svg.style.height = '100%';
	}

	function createPathPointsLayer(svg) {
		const viewBox = parseViewBox(svg.getAttribute('viewBox')) ?? {
			x: 0,
			y: 0,
			width: svg.viewBox?.baseVal?.width || DEFAULT_SVG_SIZE,
			height: svg.viewBox?.baseVal?.height || DEFAULT_SVG_SIZE,
		};
		const overlay = document.createElementNS(SVG_NS, 'svg');
		const markerRadius = Math.max(viewBox.width, viewBox.height) / 120;
		const strokeWidth = Math.max(viewBox.width, viewBox.height) / 240;
		let pointCount = 0;

		overlay.classList.add('simple-icons-companion-points-layer');
		overlay.setAttribute(
			'viewBox',
			`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`,
		);
		overlay.setAttribute('aria-hidden', 'true');
		overlay.setAttribute('focusable', 'false');

		for (const path of svg.querySelectorAll('path[d]')) {
			const pathData = path.getAttribute('d');
			if (!pathData) {
				continue;
			}

			const pathPoints = parsePathControlPoints(pathData);
			const visiblePoints = pathPoints.points.filter(
				(point) => point.kind !== 'control',
			);

			if (!visiblePoints.length) {
				continue;
			}

			const group = document.createElementNS(SVG_NS, 'g');
			const transform = getInheritedTransform(path, svg);

			if (transform) {
				group.setAttribute('transform', transform);
			}

			for (const point of visiblePoints) {
				group.append(createPointMarker(point, markerRadius, strokeWidth));
			}

			pointCount += visiblePoints.length;
			overlay.append(group);
		}

		if (!pointCount) {
			const text = document.createElementNS(SVG_NS, 'text');
			text.classList.add('simple-icons-companion-points-empty');
			text.setAttribute('x', `${viewBox.x + viewBox.width / 2}`);
			text.setAttribute('y', `${viewBox.y + viewBox.height / 2}`);
			text.setAttribute('text-anchor', 'middle');
			text.setAttribute('dominant-baseline', 'middle');
			text.textContent = 'No path points';
			overlay.append(text);
		}

		return overlay;
	}

	function getInheritedTransform(element, root) {
		const transforms = [];
		let current = element;

		while (current && current !== root) {
			if (current instanceof SVGElement) {
				const transform = current.getAttribute('transform');
				if (transform) {
					transforms.unshift(transform);
				}
			}

			current = current.parentElement;
		}

		return transforms.join(' ');
	}

	function createPointMarker(point, radius, strokeWidth) {
		const element = document.createElementNS(SVG_NS, 'circle');

		element.classList.add('simple-icons-companion-point-marker');
		element.classList.add(`simple-icons-companion-point-${point.kind}`);
		element.setAttribute('cx', `${point.x}`);
		element.setAttribute('cy', `${point.y}`);
		element.setAttribute('r', `${radius}`);
		element.setAttribute('stroke-width', `${strokeWidth}`);

		const title = document.createElementNS(SVG_NS, 'title');
		title.textContent = `${point.command} ${point.kind} point (${trimNumber(point.x)}, ${trimNumber(point.y)})`;
		element.append(title);

		return element;
	}

	function parsePathControlPoints(pathData) {
		const scanner = createPathDataScanner(pathData);
		const points = [];
		const lines = [];
		let command = '';
		let previousCommand = '';
		let current = {x: 0, y: 0};
		let subpathStart = {x: 0, y: 0};
		let lastCubicControl = null;
		let lastQuadraticControl = null;

		while (!scanner.isAtEnd()) {
			const nextCommand = scanner.readCommand();
			if (nextCommand) {
				command = nextCommand;
			}

			if (!command) {
				break;
			}

			const lowerCommand = command.toLowerCase();
			const isAbsolute = command === command.toUpperCase();
			const commandDataStart = scanner.index;

			if (lowerCommand === 'm') {
				const point = scanner.readPoint(current, isAbsolute);
				if (!point) {
					break;
				}

				const lineCommand = isAbsolute ? 'L' : 'l';

				current = point;
				points.push(createParsedPoint(point, 'anchor', command));
				subpathStart = {...point};
				clearControlState();
				previousCommand = lowerCommand;

				while (true) {
					const end = scanner.readPoint(current, isAbsolute);
					if (!end) {
						break;
					}

					current = end;
					points.push(createParsedPoint(end, 'end', lineCommand));
					clearControlState();
					previousCommand = 'l';
				}

				command = lineCommand;
				continue;
			}

			if (lowerCommand === 'z') {
				current = {...subpathStart};
				points.push(createParsedPoint(current, 'end', command));
				clearControlState();
				previousCommand = lowerCommand;
				command = '';
				continue;
			}

			if (lowerCommand === 'l') {
				while (true) {
					const end = scanner.readPoint(current, isAbsolute);
					if (!end) {
						break;
					}

					current = end;
					points.push(createParsedPoint(end, 'end', command));
					clearControlState();
					previousCommand = lowerCommand;
				}
				if (scanner.index === commandDataStart) {
					break;
				}
				continue;
			}

			if (lowerCommand === 'h') {
				while (true) {
					const x = scanner.readNumber();
					if (x === null) {
						break;
					}

					const end = {
						x: isAbsolute ? x : current.x + x,
						y: current.y,
					};
					current = end;
					points.push(createParsedPoint(end, 'end', command));
					clearControlState();
					previousCommand = lowerCommand;
				}
				if (scanner.index === commandDataStart) {
					break;
				}
				continue;
			}

			if (lowerCommand === 'v') {
				while (true) {
					const y = scanner.readNumber();
					if (y === null) {
						break;
					}

					const end = {
						x: current.x,
						y: isAbsolute ? y : current.y + y,
					};
					current = end;
					points.push(createParsedPoint(end, 'end', command));
					clearControlState();
					previousCommand = lowerCommand;
				}
				if (scanner.index === commandDataStart) {
					break;
				}
				continue;
			}

			if (lowerCommand === 'c') {
				while (true) {
					const segment = scanner.readCubicSegment(current, isAbsolute);
					if (!segment) {
						break;
					}

					const start = current;
					const {control1, control2, end} = segment;

					lines.push({from: start, to: control1}, {from: control2, to: end});
					points.push(
						createParsedPoint(control1, 'control', command),
						createParsedPoint(control2, 'control', command),
						createParsedPoint(end, 'end', command),
					);

					current = end;
					lastCubicControl = control2;
					lastQuadraticControl = null;
					previousCommand = lowerCommand;
				}
				if (scanner.index === commandDataStart) {
					break;
				}
				continue;
			}

			if (lowerCommand === 's') {
				while (true) {
					const segment = scanner.readSmoothCubicSegment(current, isAbsolute);
					if (!segment) {
						break;
					}

					const start = current;
					const hasPreviousCubic =
						previousCommand === 'c' || previousCommand === 's';
					const control1 =
						hasPreviousCubic && lastCubicControl
							? reflectPoint(lastCubicControl, current)
							: current;
					const {control2, end} = segment;

					if (hasPreviousCubic) {
						lines.push({from: start, to: control1});
						points.push(createParsedPoint(control1, 'control', command));
					}

					lines.push({from: control2, to: end});
					points.push(
						createParsedPoint(control2, 'control', command),
						createParsedPoint(end, 'end', command),
					);

					current = end;
					lastCubicControl = control2;
					lastQuadraticControl = null;
					previousCommand = lowerCommand;
				}
				if (scanner.index === commandDataStart) {
					break;
				}
				continue;
			}

			if (lowerCommand === 'q') {
				while (true) {
					const segment = scanner.readQuadraticSegment(current, isAbsolute);
					if (!segment) {
						break;
					}

					const start = current;
					const {control, end} = segment;

					lines.push({from: start, to: control}, {from: control, to: end});
					points.push(
						createParsedPoint(control, 'control', command),
						createParsedPoint(end, 'end', command),
					);

					current = end;
					lastCubicControl = null;
					lastQuadraticControl = control;
					previousCommand = lowerCommand;
				}
				if (scanner.index === commandDataStart) {
					break;
				}
				continue;
			}

			if (lowerCommand === 't') {
				while (true) {
					const end = scanner.readPoint(current, isAbsolute);
					if (!end) {
						break;
					}

					const start = current;
					const hasPreviousQuadratic =
						previousCommand === 'q' || previousCommand === 't';
					const control =
						hasPreviousQuadratic && lastQuadraticControl
							? reflectPoint(lastQuadraticControl, current)
							: current;

					if (hasPreviousQuadratic) {
						lines.push({from: start, to: control}, {from: control, to: end});
						points.push(createParsedPoint(control, 'control', command));
					}

					points.push(createParsedPoint(end, 'end', command));

					current = end;
					lastCubicControl = null;
					lastQuadraticControl = control;
					previousCommand = lowerCommand;
				}
				if (scanner.index === commandDataStart) {
					break;
				}
				continue;
			}

			if (lowerCommand === 'a') {
				while (true) {
					const segment = scanner.readArcSegment(current, isAbsolute);
					if (!segment) {
						break;
					}

					current = segment.end;
					points.push(createParsedPoint(segment.end, 'end', command));
					clearControlState();
					previousCommand = lowerCommand;
				}
				if (scanner.index === commandDataStart) {
					break;
				}
				continue;
			}

			break;
		}

		return {points, lines};

		function clearControlState() {
			lastCubicControl = null;
			lastQuadraticControl = null;
		}
	}

	function createPathDataScanner(source) {
		return {
			index: 0,
			isAtEnd() {
				this.skipSeparators();
				return this.index >= source.length;
			},
			readCommand() {
				this.skipSeparators();
				if (isPathCommand(source[this.index])) {
					const command = source[this.index];
					this.index += 1;
					return command;
				}

				return '';
			},
			readNumber() {
				this.skipSeparators();

				const start = this.index;
				let index = start;
				let hasDigit = false;

				if (source[index] === '+' || source[index] === '-') {
					index += 1;
				}

				while (isDigit(source[index])) {
					index += 1;
					hasDigit = true;
				}

				if (source[index] === '.') {
					index += 1;

					while (isDigit(source[index])) {
						index += 1;
						hasDigit = true;
					}
				}

				if (!hasDigit) {
					return null;
				}

				if (source[index] === 'e' || source[index] === 'E') {
					let exponentIndex = index + 1;
					let hasExponentDigit = false;

					if (source[exponentIndex] === '+' || source[exponentIndex] === '-') {
						exponentIndex += 1;
					}

					while (isDigit(source[exponentIndex])) {
						exponentIndex += 1;
						hasExponentDigit = true;
					}

					if (hasExponentDigit) {
						index = exponentIndex;
					}
				}

				const value = Number.parseFloat(source.slice(start, index));

				if (!Number.isFinite(value)) {
					return null;
				}

				this.index = index;
				return value;
			},
			readArcFlag() {
				this.skipSeparators();

				const flag = source[this.index];
				if (flag !== '0' && flag !== '1') {
					return null;
				}

				this.index += 1;
				return Number(flag);
			},
			readPoint(current, isAbsolute) {
				const mark = this.index;
				const x = this.readNumber();
				const y = this.readNumber();

				if (x === null || y === null) {
					this.index = mark;
					return null;
				}

				if (isAbsolute) {
					return {x, y};
				}

				return {
					x: current.x + x,
					y: current.y + y,
				};
			},
			readCubicSegment(current, isAbsolute) {
				const mark = this.index;
				const control1 = this.readPoint(current, isAbsolute);
				const control2 = this.readPoint(current, isAbsolute);
				const end = this.readPoint(current, isAbsolute);

				if (!control1 || !control2 || !end) {
					this.index = mark;
					return null;
				}

				return {control1, control2, end};
			},
			readSmoothCubicSegment(current, isAbsolute) {
				const mark = this.index;
				const control2 = this.readPoint(current, isAbsolute);
				const end = this.readPoint(current, isAbsolute);

				if (!control2 || !end) {
					this.index = mark;
					return null;
				}

				return {control2, end};
			},
			readQuadraticSegment(current, isAbsolute) {
				const mark = this.index;
				const control = this.readPoint(current, isAbsolute);
				const end = this.readPoint(current, isAbsolute);

				if (!control || !end) {
					this.index = mark;
					return null;
				}

				return {control, end};
			},
			readArcSegment(current, isAbsolute) {
				const mark = this.index;
				const radiusX = this.readNumber();
				const radiusY = this.readNumber();
				const rotation = this.readNumber();
				const largeArcFlag = this.readArcFlag();
				const sweepFlag = this.readArcFlag();
				const end = this.readPoint(current, isAbsolute);

				if (
					radiusX === null ||
					radiusY === null ||
					rotation === null ||
					largeArcFlag === null ||
					sweepFlag === null ||
					!end
				) {
					this.index = mark;
					return null;
				}

				return {end};
			},
			skipSeparators() {
				while (source[this.index] && /[\s,]/.test(source[this.index])) {
					this.index += 1;
				}
			},
		};
	}

	function createParsedPoint(point, kind, command) {
		return {
			x: point.x,
			y: point.y,
			kind,
			command,
		};
	}

	function isPathCommand(token) {
		return typeof token === 'string' && PATH_COMMAND_PATTERN.test(token);
	}

	function isDigit(character) {
		return character >= '0' && character <= '9';
	}

	function reflectPoint(point, origin) {
		return {
			x: origin.x * 2 - point.x,
			y: origin.y * 2 - point.y,
		};
	}

	function getSvgSize(svg) {
		const width = parseSvgLength(svg.getAttribute('width'));
		const height = parseSvgLength(svg.getAttribute('height'));
		const viewBox = parseViewBox(svg.getAttribute('viewBox'));

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
				return {width: DEFAULT_SVG_SIZE, height: DEFAULT_SVG_SIZE / ratio};
			}

			return {width: DEFAULT_SVG_SIZE * ratio, height: DEFAULT_SVG_SIZE};
		}

		return {
			width: width ?? DEFAULT_SVG_SIZE,
			height: height ?? DEFAULT_SVG_SIZE,
		};
	}

	function createOverlayLayout(deletedSvg, addedSvg) {
		const contentFrame = {
			width: DEFAULT_SVG_SIZE,
			height: DEFAULT_SVG_SIZE,
		};
		const frame = {
			width: OVERLAY_FRAME_SIZE,
			height: OVERLAY_FRAME_SIZE,
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

	function createSvgLayer(className, svg, size) {
		const layer = document.createElement('span');
		layer.className = `simple-icons-companion-overlay-layer ${className}`;
		layer.style.width = `${size.width}px`;
		layer.style.height = `${size.height}px`;
		layer.append(svg);

		return layer;
	}

	function scaleToFitFrame(size, frame) {
		const scale = Math.min(
			frame.width / size.width,
			frame.height / size.height,
		);
		return {
			width: size.width * scale,
			height: size.height * scale,
		};
	}

	function parseSvgLength(value) {
		if (!value || value.endsWith('%')) {
			return undefined;
		}

		const parsed = Number.parseFloat(value);
		return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
	}

	function parseViewBox(value) {
		if (!value) {
			return undefined;
		}

		const parts = value
			.trim()
			.split(/[\s,]+/)
			.map((part) => Number.parseFloat(part));

		if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) {
			return undefined;
		}

		const [x, y, width, height] = parts;

		if (width <= 0 || height <= 0) {
			return undefined;
		}

		return {x, y, width, height};
	}

	function trimNumber(value) {
		return Number.parseFloat(value.toFixed(4)).toString();
	}

	function cssAttributeValue(value) {
		return value.replaceAll('\\', '\\\\').replaceAll('"', '\\"');
	}

	function injectStyles() {
		if (document.getElementById(STYLE_ID)) {
			return;
		}

		const style = document.createElement('style');
		style.id = STYLE_ID;
		style.textContent = `
      .simple-icons-companion-overlay-view {
        flex-direction: column;
        align-items: center;
        margin: 0 auto;
        text-align: center;
        line-height: 0;
      }

      .simple-icons-companion-overlay-title {
        display: block;
        top: auto;
        margin-bottom: 4px;
        line-height: 1;
      }

      .simple-icons-companion-overlay-frame {
        position: relative;
        display: inline-block;
        overflow: hidden;
        box-sizing: content-box;
        background: url("/static/bg.gif") right bottom var(--bgColor-muted);
        border: 1px solid var(--borderColor-danger-emphasis);
        border-radius: 3px;
        line-height: 0;
      }

      .simple-icons-companion-overlay-layer {
        position: absolute;
        inset: 0;
        display: block;
        margin: auto;
        line-height: 0;
        pointer-events: none;
      }

      .simple-icons-companion-overlay-layer > .simple-icons-companion-preview-svg {
        display: block;
        width: 100%;
        height: 100%;
        border: 0;
        border-radius: 0;
        overflow: visible;
      }

      .simple-icons-companion-overlay-added > .simple-icons-companion-preview-svg,
      .simple-icons-companion-overlay-added > .simple-icons-companion-preview-svg * {
        color: #fff !important;
        fill: #fff !important;
      }

      .simple-icons-companion-color-enabled .simple-icons-companion-overlay-deleted > .simple-icons-companion-preview-svg,
      .simple-icons-companion-color-enabled .simple-icons-companion-overlay-deleted > .simple-icons-companion-preview-svg * {
        color: var(--simple-icons-companion-deleted-color) !important;
        fill: var(--simple-icons-companion-deleted-color) !important;
      }

      .simple-icons-companion-color-enabled .simple-icons-companion-overlay-added > .simple-icons-companion-preview-svg,
      .simple-icons-companion-color-enabled .simple-icons-companion-overlay-added > .simple-icons-companion-preview-svg * {
        color: var(--simple-icons-companion-added-color) !important;
        fill: var(--simple-icons-companion-added-color) !important;
      }

      .simple-icons-companion-overlay-loading,
      .simple-icons-companion-overlay-error {
        display: inline-flex;
        min-width: 260px;
        min-height: 260px;
        align-items: center;
        justify-content: center;
        box-sizing: border-box;
        padding: 16px;
        color: var(--fgColor-muted);
        line-height: 1.4;
        text-align: center;
      }

      .simple-icons-companion-points-control {
        display: flex;
        margin-top: 6px;
        align-items: center;
        justify-content: center;
        gap: 6px;
        line-height: 16px;
      }

      .simple-icons-companion-points-toggle,
      .simple-icons-companion-color-toggle {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        color: var(--fgColor-default);
        line-height: 16px;
        cursor: pointer;
      }

      .simple-icons-companion-points-toggle input,
      .simple-icons-companion-color-toggle input {
        margin: 0;
      }

      .simple-icons-companion-points-toggle-error,
      .simple-icons-companion-color-toggle-error {
        color: var(--fgColor-danger);
      }

      .simple-icons-companion-color-toggle-disabled {
        color: var(--fgColor-disabled, var(--fgColor-muted));
        cursor: default;
      }

      .simple-icons-companion-points-tooltip {
        position: relative;
        display: inline-flex;
        width: 14px;
        height: 14px;
        flex: 0 0 auto;
        align-items: center;
        justify-content: center;
        box-sizing: border-box;
        color: var(--fgColor-muted);
        font-size: 10px;
        font-weight: bold;
        line-height: 1;
        border: 1px solid var(--borderColor-default);
        border-radius: 50%;
        cursor: help;
      }

      .simple-icons-companion-points-tooltip:hover,
      .simple-icons-companion-points-tooltip:focus-visible {
        color: var(--fgColor-default);
        border-color: var(--borderColor-accent-emphasis);
        outline: none;
      }

      .simple-icons-companion-points-tooltip-text {
        position: absolute;
        bottom: calc(100% + 6px);
        left: 50%;
        z-index: 3;
        display: none;
        width: 245px;
        padding: 6px 8px;
        color: var(--fgColor-onEmphasis);
        font-size: 11px;
        font-weight: normal;
        line-height: 1.35;
        text-align: left;
        white-space: pre-wrap;
        background: var(--bgColor-emphasis);
        border-radius: 6px;
        box-shadow: var(--shadow-floating-small);
        transform: translateX(-50%);
      }

      .simple-icons-companion-points-tooltip:hover .simple-icons-companion-points-tooltip-text,
      .simple-icons-companion-points-tooltip:focus-visible .simple-icons-companion-points-tooltip-text {
        display: block;
      }

      .two-up .simple-icons-companion-points-host,
      .two-up .simple-icons-companion-color-host {
        position: relative;
      }

      .simple-icons-companion-color-layer {
        position: absolute;
        inset: 0;
        z-index: 1;
        display: none;
        width: ${DEFAULT_SVG_SIZE}px;
        height: ${DEFAULT_SVG_SIZE}px;
        margin: auto;
        line-height: 0;
        overflow: visible;
        pointer-events: none;
      }

      .simple-icons-companion-color-layer > .simple-icons-companion-preview-svg {
        display: block;
        width: 100%;
        height: 100%;
        border: 0;
        border-radius: 0;
        overflow: visible;
      }

      .simple-icons-companion-color-enabled .simple-icons-companion-color-layer {
        display: block;
      }

      .simple-icons-companion-color-enabled .simple-icons-companion-color-host > img.asset {
        opacity: 0;
      }

      .swipe .swipe-frame {
        isolation: isolate;
        --simple-icons-companion-swipe-added-width: 0px;
      }

      .swipe .swipe-frame .deleted-frame {
        z-index: 0;
      }

      .swipe .swipe-frame .swipe-shell {
        z-index: 1;
      }

      .swipe .swipe-frame .deleted-frame > .simple-icons-companion-points-layer {
        clip-path: inset(0 var(--simple-icons-companion-swipe-added-width) 0 0);
      }

      .simple-icons-companion-points-layer {
        position: absolute;
        inset: 0;
        z-index: 2;
        display: none;
        width: 100%;
        height: 100%;
        overflow: visible;
        pointer-events: none;
      }

      .simple-icons-companion-points-enabled .simple-icons-companion-points-layer {
        display: block;
      }

      .simple-icons-companion-point-marker {
        stroke: #fff;
        vector-effect: non-scaling-stroke;
      }

      .simple-icons-companion-point-end {
        color: #d1242f;
        fill: #d1242f;
      }

      .simple-icons-companion-point-anchor {
        color: #bf8700;
        fill: #bf8700;
      }

      .simple-icons-companion-points-empty {
        fill: var(--fgColor-muted);
        font: 1px Helvetica, arial, sans-serif;
      }
    `;

		document.head.append(style);
	}
})();
