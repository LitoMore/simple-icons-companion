import {overlayMode} from './constants';
import {
	appendColorToggle,
	appendModeControl,
	appendOutlineToggle,
	appendPointsToggle,
	getCompanionControls,
} from './controls';
import {
	bindModeSwitching,
	watchDiffParentResize,
	watchSinglePreviewParentResize,
} from './modes';
import {
	createOverlayView,
	renderOverlay,
	renderPreviewEnhancements,
	renderSinglePreviewControls,
} from './preview';
import {
	getSinglePreviewSide,
	getSinglePreviewSvgUrl,
	isSimpleIconsRepositoryPage,
	isSimpleIconsSvgPreviewFrame,
} from './routing';
import {injectStyles} from './styles';

export function initCompanion() {
	if (!isSimpleIconsRepositoryPage() && isSimpleIconsSvgPreviewFrame()) {
		initCompanionModes();
	}
}

function initCompanionModes() {
	const shell = document.querySelector<HTMLElement>(
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
	const renderBar = shell.querySelector<HTMLElement>('.js-render-bar');
	const modes = shell.querySelector<HTMLFieldSetElement>(
		'fieldset.js-view-modes',
	);

	if (!deletedUrl || !addedUrl || !renderBar || !modes) {
		return;
	}

	shell.dataset['simpleIconsCompanionOverlay'] = 'true';
	injectStyles();

	const pointsState = {
		deletedSvg: undefined,
		addedSvg: undefined,
		deletedColor: undefined,
		addedColor: undefined,
	};
	const overlayView = createOverlayView();
	renderBar.before(overlayView);
	appendModeControl(modes, overlayMode, 'Overlay');
	const controls = getCompanionControls(modes);
	appendPointsToggle(shell, controls);
	appendColorToggle(shell, controls);
	appendOutlineToggle(shell, controls);
	bindModeSwitching(shell, modes);
	watchDiffParentResize(shell, modes);

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
	const shell = document.querySelector<HTMLElement>('.js-render-shell');
	const frame = shell?.querySelector<HTMLElement>('.border-wrap.img-view');
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
	appendOutlineToggle(shell, controls);
	watchSinglePreviewParentResize(shell);
	void renderSinglePreviewControls(shell, frame, side, svgUrl);
}
