// ==UserScript==
// @name         Simple Icons Companion
// @namespace    https://github.com/simple-icons/simple-icons
// @version      0.0.0
// @description  Adds Overlay mode plus Points and Color toggles to Simple Icons SVG previews on GitHub.
// @license      MIT
// @updateURL    https://github.com/LitoMore/simple-icons-companion/raw/refs/heads/main/simple-icons-companion.user.js
// @downloadURL  https://github.com/LitoMore/simple-icons-companion/raw/refs/heads/main/simple-icons-companion.user.js
// @match        https://github.com/simple-icons/simple-icons/*
// @match        https://viewscreen.githubusercontent.com/added/svg*
// @match        https://viewscreen.githubusercontent.com/deleted/svg*
// @match        https://viewscreen.githubusercontent.com/diff/svg*
// @run-at       document-idle
// @grant        none
// ==/UserScript==
'use strict';
(() => {
	// source/constants.ts
	var simpleIconsRepositoryPath = '/simple-icons/simple-icons';
	var simpleIconsNwo = 'simple-icons/simple-icons';
	var overlayMode = 'overlay';
	var defaultSvgSize = 300;
	var overlayFrameSize = 302;
	var styleId = 'simple-icons-companion-styles';
	var svgNamespace = 'http://www.w3.org/2000/svg';
	var pathCommandPattern = new RegExp('^[AaCcHhLlMmQqSsTtVvZz]$', 'v');
	var pointsStorageKey = 'simple-icons-companion:points-enabled';
	var colorStorageKey = 'simple-icons-companion:color-enabled';

	// source/utils.ts
	function trimNumber(value) {
		return Number.parseFloat(value.toFixed(4)).toString();
	}
	function cssAttributeValue(value) {
		return value.replaceAll('\\', '\\\\').replaceAll('"', String.raw`\"`);
	}

	// source/controls.ts
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
	function appendPointsToggle(shell, controls) {
		const existingInput = document.querySelector(
			'#simple-icons-companion-points-toggle',
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
		input.checked = readStoredToggle(pointsStorageKey);
		shell.classList.toggle(
			'simple-icons-companion-points-enabled',
			input.checked,
		);
		input.addEventListener('change', () => {
			writeStoredToggle(pointsStorageKey, input.checked);
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
		controls.append(label, tooltip);
		return input;
	}
	function appendColorToggle(shell, controls) {
		const existingInput = document.querySelector(
			'#simple-icons-companion-color-toggle',
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
		input.checked = readStoredToggle(colorStorageKey);
		shell.classList.toggle(
			'simple-icons-companion-color-enabled',
			input.checked,
		);
		input.addEventListener('change', () => {
			writeStoredToggle(colorStorageKey, input.checked);
			shell.classList.toggle(
				'simple-icons-companion-color-enabled',
				input.checked,
			);
		});
		label.append(input, document.createTextNode('Color'));
		controls.append(label);
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
		modes.after(wrapper);
		return wrapper;
	}
	function readStoredToggle(key) {
		try {
			return globalThis.localStorage.getItem(key) === 'true';
		} catch {
			return false;
		}
	}
	function writeStoredToggle(key, value) {
		try {
			globalThis.localStorage.setItem(key, value ? 'true' : 'false');
		} catch {}
	}
	function disablePointsToggle(message) {
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
	function enableColorToggle(colors) {
		const toggle = document.querySelector(
			'.simple-icons-companion-color-toggle',
		);
		const input = toggle?.querySelector('input');
		const colorDetails = [
			colors.deleted ? `Deleted: ${colors.deleted}` : '',
			colors.added ? `Added: ${colors.added}` : '',
		]
			.filter(Boolean)
			.join('; ');
		if (toggle) {
			toggle.title = colorDetails;
			toggle.classList.remove(
				'simple-icons-companion-color-toggle-error',
				'simple-icons-companion-color-toggle-disabled',
			);
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
			toggle.classList.add(
				'simple-icons-companion-color-toggle-error',
				'simple-icons-companion-color-toggle-disabled',
			);
		}
		if (input instanceof HTMLInputElement) {
			input.checked = false;
			input.disabled = true;
		}
		shell.classList.remove('simple-icons-companion-color-enabled');
		writeStoredToggle(colorStorageKey, false);
	}

	// source/modes.ts
	function bindModeSwitching(shell, modes) {
		if (modes.dataset['simpleIconsCompanionOverlay'] === 'true') {
			return;
		}
		modes.dataset['simpleIconsCompanionOverlay'] = 'true';
		modes.addEventListener('change', (event) => {
			const input = event.target;
			if (!(input instanceof HTMLInputElement) || input.name !== 'view-mode') {
				return;
			}
			switchMode(shell, modes, input.value);
		});
	}
	function switchMode(shell, modes, mode) {
		const targetView = [...shell.querySelectorAll('.view')].find((view) =>
			view.classList.contains(mode),
		);
		if (!targetView) {
			return;
		}
		for (const view of shell.querySelectorAll('.view')) {
			view.style.display = 'none';
		}
		targetView.style.display = mode === overlayMode ? 'flex' : 'block';
		for (const label of modes.querySelectorAll('.js-view-mode-item')) {
			label.classList.remove('selected');
		}
		modes
			.querySelector(`input[value="${cssAttributeValue(mode)}"]`)
			?.closest('.js-view-mode-item')
			?.classList.add('selected');
		requestAnimationFrame(() => {
			resizeParent(shell, targetView, mode);
		});
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
		const identity = globalThis.location.hash.slice(1);
		let targetOrigin = '*';
		if (document.referrer) {
			try {
				targetOrigin = new URL(document.referrer).origin;
			} catch {
				targetOrigin = '*';
			}
		}
		globalThis.parent.postMessage(
			{
				type: 'render',
				body: 'resize',
				payload: {height},
				identity,
			},
			targetOrigin,
		);
	}

	// source/svg.ts
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
		const svgDocument = new DOMParser().parseFromString(
			source,
			'image/svg+xml',
		);
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
	function sanitizeSvg(svg) {
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
	function getSvgSize(svg) {
		const width = parseSvgLength(svg.getAttribute('width') ?? void 0);
		const height = parseSvgLength(svg.getAttribute('height') ?? void 0);
		const viewBox = parseViewBox(svg.getAttribute('viewBox') ?? void 0);
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
	function createOverlayLayout(deletedSvg, addedSvg) {
		const contentFrame = {
			width: defaultSvgSize,
			height: defaultSvgSize,
		};
		const frame = {
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
			return void 0;
		}
		const parsed = Number.parseFloat(value);
		return Number.isFinite(parsed) && parsed > 0 ? parsed : void 0;
	}
	function parseViewBox(value) {
		if (!value) {
			return void 0;
		}
		const parts = value
			.trim()
			.split(new RegExp('[\\s,]+', 'v'))
			.map((part) => Number.parseFloat(part));
		if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) {
			return void 0;
		}
		const [x, y, width, height] = parts;
		if (
			x === void 0 ||
			y === void 0 ||
			width === void 0 ||
			height === void 0 ||
			width <= 0 ||
			height <= 0
		) {
			return void 0;
		}
		return {x, y, width, height};
	}

	// source/colors.ts
	var simpleIconsMetadataCache = /* @__PURE__ */ new Map();
	async function fetchSimpleIconColor(svgUrl, sourceSvg) {
		const rawFile = parseRawGitHubFileUrl(svgUrl);
		const title = sourceSvg?.querySelector('title')?.textContent?.trim() ?? '';
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
		const cachedIcons = simpleIconsMetadataCache.get(cacheKey);
		if (cachedIcons) {
			return cachedIcons;
		}
		const metadataUrl = `https://raw.githubusercontent.com/${rawFile.owner}/${rawFile.repo}/${rawFile.ref}/data/simple-icons.json`;
		const response = await fetch(metadataUrl);
		if (!response.ok) {
			throw new Error(`Metadata HTTP ${response.status}`);
		}
		const data = await response.json();
		const icons = Array.isArray(data)
			? data
			: isRecord(data)
				? data['icons']
				: void 0;
		if (!isSimpleIconMetadataArray(icons)) {
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
				return void 0;
			}
			const [owner, repo, ref, ...pathParts] = parts;
			if (!owner || !repo || !ref || pathParts.length === 0) {
				return void 0;
			}
			return {
				owner,
				repo,
				ref,
				path: pathParts.join('/'),
			};
		} catch {
			return void 0;
		}
	}
	function findSimpleIconMetadata(icons, title, slug) {
		const matchingTitle = icons.find((icon) => icon.title === title);
		if (matchingTitle) {
			return matchingTitle;
		}
		return icons.find((icon) => slugifyIconTitle(icon.title) === slug);
	}
	function isSimpleIconMetadataArray(value) {
		return (
			Array.isArray(value) &&
			value.every((icon) => {
				if (!isRecord(icon)) {
					return false;
				}
				return (
					typeof icon['title'] === 'string' && typeof icon['hex'] === 'string'
				);
			})
		);
	}
	function isRecord(value) {
		return typeof value === 'object' && value !== null;
	}
	function getSvgSlug(path) {
		const fileName = path.split('/').pop() ?? '';
		return fileName.replace(new RegExp('\\.svg$', 'iv'), '');
	}
	function slugifyIconTitle(title) {
		return title
			.toLowerCase()
			.replaceAll('&', 'and')
			.replaceAll('+', 'plus')
			.replaceAll('.', 'dot')
			.replaceAll(new RegExp('[^a-z0-9]', 'gv'), '');
	}
	function normalizeHexColor(value) {
		const hex = value.trim().replace(new RegExp('^#', 'v'), '');
		if (!new RegExp('^[\\da-f]{6}$', 'iv').test(hex)) {
			throw new Error(`Invalid hex color ${value}`);
		}
		return `#${hex.toUpperCase()}`;
	}
	function attachBuiltInColor(shell, side, sourceSvg, color) {
		const frames = shell.querySelectorAll(
			`.two-up .${side}-frame, .swipe .${side}-frame, .onion-skin .${side}-frame`,
		);
		for (const frame of frames) {
			attachColorLayer(frame, sourceSvg, color);
		}
	}
	function attachColorLayer(host, sourceSvg, color) {
		if (!host || !sourceSvg || !color) {
			return;
		}
		host.classList.add('simple-icons-companion-color-host');
		for (const child of host.children) {
			if (child.classList.contains('simple-icons-companion-color-layer')) {
				child.remove();
			}
		}
		const layer = document.createElement('span');
		const coloredSvg = sourceSvg.cloneNode(true);
		if (!(coloredSvg instanceof SVGSVGElement)) {
			return;
		}
		layer.className = 'simple-icons-companion-color-layer';
		forceSvgFill(coloredSvg, color);
		layer.append(coloredSvg);
		host.append(layer);
	}

	// source/points.ts
	function attachBuiltInPoints(shell, side, sourceSvg) {
		const frames = shell.querySelectorAll(
			`.two-up .${side}-frame, .swipe .${side}-frame, .onion-skin .${side}-frame`,
		);
		for (const frame of frames) {
			attachPointsLayer(frame, sourceSvg);
		}
	}
	function watchSwipePoints(shell) {
		const swipeFrame = shell.querySelector('.swipe .swipe-frame');
		const swipeShell = swipeFrame?.querySelector('.swipe-shell');
		if (!swipeFrame || !swipeShell) {
			return;
		}
		syncSwipePointsClip(swipeFrame, swipeShell);
		if (swipeFrame.dataset['simpleIconsCompanionSwipePoints'] === 'true') {
			return;
		}
		swipeFrame.dataset['simpleIconsCompanionSwipePoints'] = 'true';
		const sync = () => {
			syncSwipePointsClip(swipeFrame, swipeShell);
		};
		if ('ResizeObserver' in globalThis) {
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
		globalThis.addEventListener('resize', sync);
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
			overlayView.querySelector('.simple-icons-companion-overlay-deleted') ??
				void 0,
			pointsState.deletedSvg,
		);
		attachPointsLayer(
			overlayView.querySelector('.simple-icons-companion-overlay-added') ??
				void 0,
			pointsState.addedSvg,
		);
	}
	function attachPointsLayer(host, sourceSvg) {
		if (!host || !sourceSvg) {
			return;
		}
		host.classList.add('simple-icons-companion-points-host');
		for (const child of host.children) {
			if (child.classList.contains('simple-icons-companion-points-layer')) {
				child.remove();
			}
		}
		host.append(createPathPointsLayer(sourceSvg));
	}
	function createPathPointsLayer(svg) {
		const viewBox = parseViewBox(svg.getAttribute('viewBox') ?? void 0) ?? {
			x: 0,
			y: 0,
			width: svg.viewBox.baseVal.width || defaultSvgSize,
			height: svg.viewBox.baseVal.height || defaultSvgSize,
		};
		const overlay = document.createElementNS(svgNamespace, 'svg');
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
			if (visiblePoints.length === 0) {
				continue;
			}
			const group = document.createElementNS(svgNamespace, 'g');
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
			const text = document.createElementNS(svgNamespace, 'text');
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
			current = current.parentElement ?? void 0;
		}
		return transforms.join(' ');
	}
	function createPointMarker(point, radius, strokeWidth) {
		const element = document.createElementNS(svgNamespace, 'circle');
		element.classList.add(
			'simple-icons-companion-point-marker',
			`simple-icons-companion-point-${point.kind}`,
		);
		element.setAttribute('cx', `${point.x}`);
		element.setAttribute('cy', `${point.y}`);
		element.setAttribute('r', `${radius}`);
		element.setAttribute('stroke-width', `${strokeWidth}`);
		const title = document.createElementNS(svgNamespace, 'title');
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
		let lastCubicControl;
		let lastQuadraticControl;
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
					if (x === void 0) {
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
					if (y === void 0) {
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
					lastQuadraticControl = void 0;
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
					lastQuadraticControl = void 0;
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
					lastCubicControl = void 0;
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
					lastCubicControl = void 0;
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
			lastCubicControl = void 0;
			lastQuadraticControl = void 0;
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
				const command = source[this.index];
				if (isPathCommand(command)) {
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
					return void 0;
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
					return void 0;
				}
				this.index = index;
				return value;
			},
			readArcFlag() {
				this.skipSeparators();
				const flag = source[this.index];
				if (flag !== '0' && flag !== '1') {
					return void 0;
				}
				this.index += 1;
				return Number(flag);
			},
			readPoint(current, isAbsolute) {
				const mark = this.index;
				const x = this.readNumber();
				const y = this.readNumber();
				if (x === void 0 || y === void 0) {
					this.index = mark;
					return void 0;
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
					return void 0;
				}
				return {control1, control2, end};
			},
			readSmoothCubicSegment(current, isAbsolute) {
				const mark = this.index;
				const control2 = this.readPoint(current, isAbsolute);
				const end = this.readPoint(current, isAbsolute);
				if (!control2 || !end) {
					this.index = mark;
					return void 0;
				}
				return {control2, end};
			},
			readQuadraticSegment(current, isAbsolute) {
				const mark = this.index;
				const control = this.readPoint(current, isAbsolute);
				const end = this.readPoint(current, isAbsolute);
				if (!control || !end) {
					this.index = mark;
					return void 0;
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
					radiusX === void 0 ||
					radiusY === void 0 ||
					rotation === void 0 ||
					largeArcFlag === void 0 ||
					sweepFlag === void 0 ||
					!end
				) {
					this.index = mark;
					return void 0;
				}
				return {end};
			},
			skipSeparators() {
				let character = source[this.index];
				while (
					character !== void 0 &&
					new RegExp('[\\s,]', 'v').test(character)
				) {
					this.index += 1;
					character = source[this.index];
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
		return typeof token === 'string' && pathCommandPattern.test(token);
	}
	function isDigit(character) {
		return character !== void 0 && character >= '0' && character <= '9';
	}
	function reflectPoint(point, origin) {
		return {
			x: origin.x * 2 - point.x,
			y: origin.y * 2 - point.y,
		};
	}

	// source/preview.ts
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
					resizeParent(shell, view, overlayMode);
				}
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unknown error';
			frame.replaceChildren(`Overlay failed to load: ${message}`);
			frame.classList.add('simple-icons-companion-overlay-error');
		}
	}
	async function renderPreviewEnhancements({
		shell,
		overlayView,
		deletedUrl,
		addedUrl,
		pointsState,
	}) {
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
			void loadPreviewColors(shell, deletedUrl, addedUrl, pointsState);
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unknown error';
			disablePointsToggle(message);
		}
	}
	async function renderSinglePreviewControls(shell, frame, side, svgUrl) {
		try {
			const svg = await fetchSvg(svgUrl, false);
			attachPointsLayer(frame, svg.element);
			void loadSinglePreviewColor({
				shell,
				frame,
				side,
				svgUrl,
				sourceSvg: svg.element,
			});
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unknown error';
			disablePointsToggle(message);
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
			enableColorToggle({deleted: deletedColor, added: addedColor});
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unknown error';
			disableColorToggle(shell, message);
		}
	}
	async function loadSinglePreviewColor({
		shell,
		frame,
		side,
		svgUrl,
		sourceSvg,
	}) {
		try {
			const color = await fetchSimpleIconColor(svgUrl, sourceSvg);
			shell.style.setProperty(`--simple-icons-companion-${side}-color`, color);
			attachColorLayer(frame, sourceSvg, color);
			enableColorToggle({[side]: color});
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unknown error';
			disableColorToggle(shell, message);
		}
	}

	// source/routing.ts
	function isSimpleIconsRepositoryPage() {
		return (
			globalThis.location.hostname === 'github.com' &&
			globalThis.location.pathname.startsWith(`${simpleIconsRepositoryPath}/`)
		);
	}
	function isSimpleIconsSvgPreviewFrame() {
		if (
			globalThis.location.hostname !== 'viewscreen.githubusercontent.com' ||
			!isSupportedSvgPreviewPath(globalThis.location.pathname)
		) {
			return false;
		}
		const parameters = new URLSearchParams(globalThis.location.search);
		if (parameters.get('nwo') === simpleIconsNwo) {
			return true;
		}
		if (!document.referrer) {
			return false;
		}
		try {
			const referrer = new URL(document.referrer);
			return (
				referrer.hostname === 'github.com' &&
				referrer.pathname.startsWith(`${simpleIconsRepositoryPath}/`)
			);
		} catch {
			return false;
		}
	}
	function isSupportedSvgPreviewPath(pathname) {
		return (
			pathname.startsWith('/added/svg') ||
			pathname.startsWith('/deleted/svg') ||
			pathname.startsWith('/diff/svg')
		);
	}
	function getSinglePreviewSide() {
		if (globalThis.location.pathname.startsWith('/added/svg')) {
			return 'added';
		}
		if (globalThis.location.pathname.startsWith('/deleted/svg')) {
			return 'deleted';
		}
		return '';
	}
	function getSinglePreviewSvgUrl(frame) {
		return (
			decodeHexEncodedUrl(
				new URLSearchParams(globalThis.location.search).get('enc_url') ??
					void 0,
			) ??
			frame.dataset['image'] ??
			''
		);
	}
	function decodeHexEncodedUrl(value) {
		if (
			!value ||
			value.length % 2 !== 0 ||
			new RegExp('[^\\da-f]', 'iv').test(value)
		) {
			return void 0;
		}
		const characters = [];
		for (let index = 0; index < value.length; index += 2) {
			characters.push(
				String.fromCodePoint(
					Number.parseInt(value.slice(index, index + 2), 16),
				),
			);
		}
		const decoded = characters.join('');
		try {
			return new URL(decoded).href;
		} catch {
			return void 0;
		}
	}

	// source/styles.ts
	function injectStyles() {
		if (document.querySelector(`#${cssAttributeValue(styleId)}`)) {
			return;
		}
		const style = document.createElement('style');
		style.id = styleId;
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
        width: ${defaultSvgSize}px;
        height: ${defaultSvgSize}px;
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

      .simple-icons-companion-single-shell > .simple-icons-companion-single-view {
        position: relative;
        box-sizing: border-box;
        width: ${overlayFrameSize}px !important;
        height: ${overlayFrameSize}px !important;
        overflow: visible;
        border-style: unset !important;
      }

      .simple-icons-companion-single-shell > .simple-icons-companion-single-view > img {
        display: block;
        width: ${defaultSvgSize}px !important;
        height: ${defaultSvgSize}px !important;
        max-width: none;
        max-height: none;
      }

      .simple-icons-companion-single-shell.simple-icons-companion-color-enabled .simple-icons-companion-color-host > img {
        opacity: 0;
      }

      .simple-icons-companion-single-view > .simple-icons-companion-points-layer {
        inset: 1px;
        width: ${defaultSvgSize}px;
        height: ${defaultSvgSize}px;
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

	// source/app.ts
	function initCompanion() {
		if (!isSimpleIconsRepositoryPage() && isSimpleIconsSvgPreviewFrame()) {
			initCompanionModes();
		}
	}
	function initCompanionModes() {
		const shell = document.querySelector(
			'.js-render-shell [data-type="diff"][data-file1][data-file2]',
		);
		if (!shell) {
			initSinglePreviewEnhancements();
			return;
		}
		if (shell.dataset['simpleIconsCompanionOverlay'] === 'true') {
			return;
		}
		const deletedUrl = shell.dataset['file1'];
		const addedUrl = shell.dataset['file2'];
		const renderBar = shell.querySelector('.js-render-bar');
		const modes = shell.querySelector('fieldset.js-view-modes');
		if (!deletedUrl || !addedUrl || !renderBar || !modes) {
			return;
		}
		shell.dataset['simpleIconsCompanionOverlay'] = 'true';
		injectStyles();
		const pointsState = {
			deletedSvg: void 0,
			addedSvg: void 0,
			deletedColor: void 0,
			addedColor: void 0,
		};
		const overlayView = createOverlayView();
		renderBar.before(overlayView);
		appendModeControl(modes, overlayMode, 'Overlay');
		const controls = getCompanionControls(modes);
		appendPointsToggle(shell, controls);
		appendColorToggle(shell, controls);
		bindModeSwitching(shell, modes);
		void renderOverlay(overlayView, deletedUrl, addedUrl, pointsState);
		void renderPreviewEnhancements({
			shell,
			overlayView,
			deletedUrl,
			addedUrl,
			pointsState,
		});
	}
	function initSinglePreviewEnhancements() {
		const shell = document.querySelector('.js-render-shell');
		const frame = shell?.querySelector('.border-wrap.img-view');
		const side = getSinglePreviewSide();
		if (
			!shell ||
			!frame ||
			!side ||
			frame.dataset['simpleIconsCompanionSingle'] === 'true'
		) {
			return;
		}
		const svgUrl = getSinglePreviewSvgUrl(frame);
		if (!svgUrl) {
			return;
		}
		frame.dataset['simpleIconsCompanionSingle'] = 'true';
		shell.classList.add('simple-icons-companion-single-shell');
		frame.classList.add(
			'simple-icons-companion-single-view',
			`simple-icons-companion-single-${side}`,
		);
		injectStyles();
		const controls = document.createElement('div');
		controls.className =
			'simple-icons-companion-controls simple-icons-companion-points-control simple-icons-companion-single-controls';
		frame.after(controls);
		appendPointsToggle(shell, controls);
		appendColorToggle(shell, controls);
		void renderSinglePreviewControls(shell, frame, side, svgUrl);
	}

	// source/index.ts
	initCompanion();
})();
