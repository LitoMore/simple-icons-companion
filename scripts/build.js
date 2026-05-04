import {readFile, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import * as esbuild from 'esbuild';
import prettier from 'prettier';

const entryPoint = fileURLToPath(
	new URL('../source/index.ts', import.meta.url),
);
const outfile = fileURLToPath(
	new URL('../simple-icons-companion.user.js', import.meta.url),
);
const packageVersion = await readPackageVersion();
const userscriptHeader = await readUserscriptHeader(packageVersion);

const result = await esbuild.build({
	entryPoints: [entryPoint],
	bundle: true,
	outfile,
	format: 'iife',
	platform: 'browser',
	target: 'es2023',
	banner: {
		js: userscriptHeader,
	},
	legalComments: 'none',
	write: false,
});

const [outputFile] = result.outputFiles;

if (!outputFile) {
	throw new Error('esbuild did not return an output file.');
}

const prettierOptions = await prettier.resolveConfig(outfile);
const formattedOutput = await prettier.format(outputFile.text, {
	...prettierOptions,
	filepath: outfile,
});
await writeFile(outfile, formattedOutput);

async function readPackageVersion() {
	const fileContent = await readFile(
		new URL('../package.json', import.meta.url),
		'utf8',
	);
	const packageJson = JSON.parse(fileContent);

	if (!isRecord(packageJson) || typeof packageJson.version !== 'string') {
		throw new TypeError('Missing package.json version.');
	}

	const {version} = packageJson;

	if (!/^\S+$/v.test(version)) {
		throw new Error('Invalid package.json version.');
	}

	return version;
}

async function readUserscriptHeader(version) {
	const fileContent = await readFile(
		new URL('../source/userscript-header.txt', import.meta.url),
		'utf8',
	);
	const text = fileContent.trimEnd();
	const versionPattern = /^\/\/ @version\s+.*$/mv;

	if (
		!text.startsWith('// ==UserScript==') ||
		!text.endsWith('// ==/UserScript==')
	) {
		throw new Error('Invalid userscript metadata block.');
	}

	if (!versionPattern.test(text)) {
		throw new Error('Missing userscript @version metadata.');
	}

	return text.replace(versionPattern, `// @version      ${version}`);
}

function isRecord(value) {
	return typeof value === 'object' && value !== null;
}
