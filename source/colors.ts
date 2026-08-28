import type {RawGitHubFile, SimpleIconMetadata} from './types';

const simpleIconsMetadataCache = new Map<string, SimpleIconMetadata[]>();

export async function fetchSimpleIconColor(
	svgUrl: string,
	sourceSvg: SVGSVGElement | undefined,
) {
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

async function fetchSimpleIconsMetadata(rawFile: RawGitHubFile) {
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

	const data: unknown = await response.json();
	const icons = Array.isArray(data)
		? data
		: isRecord(data)
			? data['icons']
			: undefined;

	if (!isSimpleIconMetadataArray(icons)) {
		throw new Error('Invalid Simple Icons metadata');
	}

	simpleIconsMetadataCache.set(cacheKey, icons);
	return icons;
}

function parseRawGitHubFileUrl(url: string): RawGitHubFile | undefined {
	try {
		const parsed = new URL(url);
		const parts = parsed.pathname.split('/').filter(Boolean);

		if (parts.length < 4) {
			return undefined;
		}

		const [owner, repo, ref, ...pathParts] = parts;

		if (!owner || !repo || !ref || pathParts.length === 0) {
			return undefined;
		}

		return {
			owner,
			repo,
			ref,
			path: pathParts.join('/'),
		};
	} catch {
		return undefined;
	}
}

function findSimpleIconMetadata(
	icons: SimpleIconMetadata[],
	title: string,
	slug: string,
) {
	const matchingTitle = icons.find((icon) => icon.title === title);
	if (matchingTitle) {
		return matchingTitle;
	}

	return icons.find((icon) => slugifyIconTitle(icon.title) === slug);
}

function isSimpleIconMetadataArray(
	value: unknown,
): value is SimpleIconMetadata[] {
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

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function getSvgSlug(path: string) {
	const fileName = path.split('/').pop() ?? '';
	return fileName.replace(/\.svg$/iv, '');
}

function slugifyIconTitle(title: string) {
	return title
		.toLowerCase()
		.replaceAll('&', 'and')
		.replaceAll('+', 'plus')
		.replaceAll('.', 'dot')
		.replaceAll(/[^a-z0-9]/gv, '');
}

function normalizeHexColor(value: string) {
	const hex = value.trim().replace(/^#/v, '');

	if (!/^[\da-f]{6}$/iv.test(hex)) {
		throw new Error(`Invalid hex color ${value}`);
	}

	return `#${hex.toUpperCase()}`;
}
