import {defaultSvgSize, overlayFrameSize, styleId} from './constants';
import {cssAttributeValue} from './utils';

export function injectStyles() {
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
      .simple-icons-companion-color-toggle,
      .simple-icons-companion-outline-toggle {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        color: var(--fgColor-default);
        line-height: 16px;
        cursor: pointer;
      }

      .simple-icons-companion-points-toggle input,
      .simple-icons-companion-color-toggle input,
      .simple-icons-companion-outline-toggle input {
        margin: 0;
      }

      .simple-icons-companion-points-toggle-error,
      .simple-icons-companion-color-toggle-error {
        color: var(--fgColor-danger);
      }

      .simple-icons-companion-color-toggle-disabled,
      .simple-icons-companion-outline-toggle-disabled {
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
      .two-up .simple-icons-companion-svg-host {
        position: relative;
      }

      .simple-icons-companion-svg-layer {
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

      .simple-icons-companion-svg-layer > .simple-icons-companion-preview-svg {
        display: block;
        width: 100%;
        height: 100%;
        border: 0;
        border-radius: 0;
        overflow: visible;
      }

      .simple-icons-companion-color-enabled .simple-icons-companion-svg-layer,
      .simple-icons-companion-outline-enabled .simple-icons-companion-svg-layer {
        display: block;
      }

      .simple-icons-companion-color-enabled .simple-icons-companion-svg-host > img.asset,
      .simple-icons-companion-outline-enabled .simple-icons-companion-svg-host > img.asset {
        opacity: 0;
      }

      .simple-icons-companion-color-enabled .simple-icons-companion-svg-layer > .simple-icons-companion-preview-svg,
      .simple-icons-companion-color-enabled .simple-icons-companion-svg-layer > .simple-icons-companion-preview-svg * {
        color: var(--simple-icons-companion-preview-color) !important;
        fill: var(--simple-icons-companion-preview-color) !important;
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

      .simple-icons-companion-single-shell.simple-icons-companion-color-enabled .simple-icons-companion-svg-host > img,
      .simple-icons-companion-single-shell.simple-icons-companion-outline-enabled .simple-icons-companion-svg-host > img {
        opacity: 0;
      }

      .simple-icons-companion-outline-enabled .simple-icons-companion-svg-layer > .simple-icons-companion-preview-svg *,
      .simple-icons-companion-outline-enabled .simple-icons-companion-overlay-layer > .simple-icons-companion-preview-svg * {
        fill: none !important;
        stroke: currentColor !important;
        stroke-width: 1px !important;
        vector-effect: non-scaling-stroke;
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
