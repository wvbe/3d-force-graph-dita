import { describe, expect, it } from '@jest/globals';
import { evaluateXPathToBoolean, evaluateXPathToString } from 'fontoxpath';
import fs from 'fs/promises';
import { posix as path } from 'path';
import { createTransformingFileCacheForVersion } from './resolving-dom-cache';

describe('[createTransformingFileCacheForVersion]', () => {
	const { cache } = createTransformingFileCacheForVersion(filePath =>
		fs.readFile(
			path.resolve(__dirname, '..', '..', 'test', 'transformation-test', filePath),
			'utf8'
		)
	);

	it('resolves simple references', async () => {
		const dom = await cache.getDocument('subdir/simple-reference.xml');
		expect(evaluateXPathToString('//xref/@href', dom)).toBe('topic.xml');
	});

	it('resolves DITA conrefs', async () => {
		const dom = await cache.getDocument('subdir/conref-chain-1.xml');
		expect(evaluateXPathToString('//p', dom).trim()).toBe('REUSED PARAGRAPH');
	});

	it('resolves FAD conrefs', async () => {
		const dom = await cache.getDocument('api/Button.xml');
		expect(
			evaluateXPathToString('/*/arguments/*[./name = "icon"]/restrict/*/description', dom)
		).toMatch(
			// This text comes from FDS.xml, not Button.xml
			/The name of the icon displayed in the component./
		);
	});

	it('resolves FAD conrefs only if the target is an inner member', async () => {
		const dom = await cache.getDocument('api/primitives.xml');
		expect(
			evaluateXPathToBoolean(
				'/*/members/*[./name = "applyModelUsingStencil"]/restrict/type/source',
				dom
			)
		).toBeFalsy();
	});

	it('is not broken in case of circular dependencies', async () => {
		const dom = await cache.getDocument('circular/one.xml');
		// console.log(serializeToWellFormedString(dom));
		// This code would never be reached if the resolving file cache did not protect against circular dependencies
		expect(evaluateXPathToBoolean('/*', dom)).toBe(true);
	});

	it('when running into circular dependency, conreffing is no longer applied but reference resolving is', async () => {
		const dom = await cache.getDocument('circular/one.xml');

		expect(evaluateXPathToString('/*/name', dom)).toBe('One');

		expect(evaluateXPathToString('/*/members[1]/type/name', dom)).toBe('Two');

		// First time entering the circular object
		expect(evaluateXPathToString('/*/members[1]/type/restrict/type/name', dom)).toBe(
			'ReusableTwo'
		);

		expect(
			evaluateXPathToString('/*/members[1]/type/restrict/type/restrict/type/name', dom)
		).toBe('ReusableOne');

		// Second time hitting two.xml. The @reference will not be replaced with contents of two.xml,
		// so there is no <name>
		expect(
			evaluateXPathToBoolean(
				'/*/members[1]/type/restrict/type/restrict/type/restrict/type/name',
				dom
			)
		).toBeFalsy();
	});
});
