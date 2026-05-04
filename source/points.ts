import {defaultSvgSize, pathCommandPattern, svgNamespace} from './constants';
import {parseViewBox} from './svg';
import type {
	ParsedLine,
	ParsedPath,
	ParsedPoint,
	PathDataScanner,
	Point,
	PointKind,
	PointsState,
	Side,
} from './types';
import {trimNumber} from './utils';

export function attachBuiltInPoints(
	shell: HTMLElement,
	side: Side,
	sourceSvg: SVGSVGElement | undefined,
) {
	const frames = shell.querySelectorAll(
		`.two-up .${side}-frame, .swipe .${side}-frame, .onion-skin .${side}-frame`,
	);

	for (const frame of frames) {
		attachPointsLayer(frame, sourceSvg);
	}
}

export function watchSwipePoints(shell: HTMLElement) {
	const swipeFrame = shell.querySelector<HTMLElement>('.swipe .swipe-frame');
	const swipeShell = swipeFrame?.querySelector<HTMLElement>('.swipe-shell');

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

function syncSwipePointsClip(swipeFrame: HTMLElement, swipeShell: HTMLElement) {
	const width = Math.max(0, swipeShell.getBoundingClientRect().width);
	swipeFrame.style.setProperty(
		'--simple-icons-companion-swipe-added-width',
		`${width}px`,
	);
}

export function attachOverlayPoints(
	overlayView: HTMLElement,
	pointsState: PointsState,
) {
	if (!pointsState.deletedSvg || !pointsState.addedSvg) {
		return;
	}

	attachPointsLayer(
		overlayView.querySelector('.simple-icons-companion-overlay-deleted') ??
			undefined,
		pointsState.deletedSvg,
	);
	attachPointsLayer(
		overlayView.querySelector('.simple-icons-companion-overlay-added') ??
			undefined,
		pointsState.addedSvg,
	);
}

export function attachPointsLayer(
	host: Element | undefined,
	sourceSvg: SVGSVGElement | undefined,
) {
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

function createPathPointsLayer(svg: SVGSVGElement) {
	const viewBox = parseViewBox(svg.getAttribute('viewBox') ?? undefined) ?? {
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

	for (const path of svg.querySelectorAll<SVGPathElement>('path[d]')) {
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

function getInheritedTransform(element: Element, root: Element) {
	const transforms: string[] = [];
	let current: Element | undefined = element;

	while (current && current !== root) {
		if (current instanceof SVGElement) {
			const transform = current.getAttribute('transform');
			if (transform) {
				transforms.unshift(transform);
			}
		}

		current = current.parentElement ?? undefined;
	}

	return transforms.join(' ');
}

function createPointMarker(
	point: ParsedPoint,
	radius: number,
	strokeWidth: number,
) {
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

function parsePathControlPoints(pathData: string): ParsedPath {
	const scanner = createPathDataScanner(pathData);
	const points: ParsedPoint[] = [];
	const lines: ParsedLine[] = [];
	let command = '';
	let previousCommand = '';
	let current = {x: 0, y: 0};
	let subpathStart = {x: 0, y: 0};
	let lastCubicControl: Point | undefined;
	let lastQuadraticControl: Point | undefined;

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
				if (x === undefined) {
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
				if (y === undefined) {
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
				lastQuadraticControl = undefined;
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
				lastQuadraticControl = undefined;
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
				lastCubicControl = undefined;
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
				lastCubicControl = undefined;
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
		lastCubicControl = undefined;
		lastQuadraticControl = undefined;
	}
}

function createPathDataScanner(source: string): PathDataScanner {
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
				return undefined;
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
				return undefined;
			}

			this.index = index;
			return value;
		},
		readArcFlag() {
			this.skipSeparators();

			const flag = source[this.index];
			if (flag !== '0' && flag !== '1') {
				return undefined;
			}

			this.index += 1;
			return Number(flag);
		},
		readPoint(current: Point, isAbsolute: boolean) {
			const mark = this.index;
			const x = this.readNumber();
			const y = this.readNumber();

			if (x === undefined || y === undefined) {
				this.index = mark;
				return undefined;
			}

			if (isAbsolute) {
				return {x, y};
			}

			return {
				x: current.x + x,
				y: current.y + y,
			};
		},
		readCubicSegment(current: Point, isAbsolute: boolean) {
			const mark = this.index;
			const control1 = this.readPoint(current, isAbsolute);
			const control2 = this.readPoint(current, isAbsolute);
			const end = this.readPoint(current, isAbsolute);

			if (!control1 || !control2 || !end) {
				this.index = mark;
				return undefined;
			}

			return {control1, control2, end};
		},
		readSmoothCubicSegment(current: Point, isAbsolute: boolean) {
			const mark = this.index;
			const control2 = this.readPoint(current, isAbsolute);
			const end = this.readPoint(current, isAbsolute);

			if (!control2 || !end) {
				this.index = mark;
				return undefined;
			}

			return {control2, end};
		},
		readQuadraticSegment(current: Point, isAbsolute: boolean) {
			const mark = this.index;
			const control = this.readPoint(current, isAbsolute);
			const end = this.readPoint(current, isAbsolute);

			if (!control || !end) {
				this.index = mark;
				return undefined;
			}

			return {control, end};
		},
		readArcSegment(current: Point, isAbsolute: boolean) {
			const mark = this.index;
			const radiusX = this.readNumber();
			const radiusY = this.readNumber();
			const rotation = this.readNumber();
			const largeArcFlag = this.readArcFlag();
			const sweepFlag = this.readArcFlag();
			const end = this.readPoint(current, isAbsolute);

			if (
				radiusX === undefined ||
				radiusY === undefined ||
				rotation === undefined ||
				largeArcFlag === undefined ||
				sweepFlag === undefined ||
				!end
			) {
				this.index = mark;
				return undefined;
			}

			return {end};
		},
		skipSeparators() {
			let character = source[this.index];
			while (character !== undefined && /[\s,]/v.test(character)) {
				this.index += 1;
				character = source[this.index];
			}
		},
	};
}

function createParsedPoint(
	point: Point,
	kind: PointKind,
	command: string,
): ParsedPoint {
	return {
		x: point.x,
		y: point.y,
		kind,
		command,
	};
}

function isPathCommand(token: string | undefined): token is string {
	return typeof token === 'string' && pathCommandPattern.test(token);
}

function isDigit(character: string | undefined) {
	return character !== undefined && character >= '0' && character <= '9';
}

function reflectPoint(point: Point, origin: Point) {
	return {
		x: origin.x * 2 - point.x,
		y: origin.y * 2 - point.y,
	};
}
