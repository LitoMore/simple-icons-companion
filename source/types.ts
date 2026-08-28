export type Side = 'added' | 'deleted';
export type PointKind = 'anchor' | 'control' | 'end';
export type Point = {
	x: number;
	y: number;
};
export type Size = {
	width: number;
	height: number;
};
export type ViewBox = Point & Size;
export type ParsedPoint = Point & {
	command: string;
	kind: PointKind;
};
export type ParsedLine = {
	from: Point;
	to: Point;
};
export type ParsedPath = {
	lines: ParsedLine[];
	points: ParsedPoint[];
};
export type SourceSvg = {
	element: SVGSVGElement;
	size: Size;
};
export type PointsState = {
	addedColor: string | undefined;
	addedSvg: SVGSVGElement | undefined;
	deletedColor: string | undefined;
	deletedSvg: SVGSVGElement | undefined;
};
export type DiffEnhancementOptions = {
	addedUrl: string;
	deletedUrl: string;
	overlayView: HTMLElement;
	pointsState: PointsState;
	shell: HTMLElement;
};
export type SingleColorOptions = {
	side: Side;
	shell: HTMLElement;
	sourceSvg: SVGSVGElement;
	svgUrl: string;
};
export type ColorDetails = Partial<Record<Side, string>>;
export type RawGitHubFile = {
	owner: string;
	path: string;
	ref: string;
	repo: string;
};
export type SimpleIconMetadata = {
	hex: string;
	title: string;
};
export type CubicSegment = {
	control1: Point;
	control2: Point;
	end: Point;
};
export type SmoothCubicSegment = {
	control2: Point;
	end: Point;
};
export type QuadraticSegment = {
	control: Point;
	end: Point;
};
export type ArcSegment = {
	end: Point;
};
export type PathDataScanner = {
	index: number;
	isAtEnd: () => boolean;
	readArcFlag: () => number | undefined;
	readArcSegment: (
		current: Point,
		isAbsolute: boolean,
	) => ArcSegment | undefined;
	readCommand: () => string;
	readCubicSegment: (
		current: Point,
		isAbsolute: boolean,
	) => CubicSegment | undefined;
	readNumber: () => number | undefined;
	readPoint: (current: Point, isAbsolute: boolean) => Point | undefined;
	readQuadraticSegment: (
		current: Point,
		isAbsolute: boolean,
	) => QuadraticSegment | undefined;
	readSmoothCubicSegment: (
		current: Point,
		isAbsolute: boolean,
	) => SmoothCubicSegment | undefined;
	skipSeparators: () => void;
};
