import { beforeAll, describe, expect, it } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';
import { FileCache } from './dom-caching';
import { extractItemTree, getCompressedItemTree, Sitemap } from './sitemap';

const XML_DIR = path.join(__dirname, '..', '..', 'test', 'simple-map');

describe('In v1.main.xml', () => {
	const fileCache = new FileCache({
		resolve: p => path.join(XML_DIR, p),
		fetch: p => fs.readFile(p, 'utf8')
	});
	const sitemap = new Sitemap(fileCache, 'v1.main.xml');

	let tree: any, extracted: any;

	beforeAll(async () => {
		tree = await getCompressedItemTree(fileCache, await sitemap.getNodes(), 'v1.main.xml');
		extracted = extractItemTree(tree, await sitemap.getNodes());
	});

	it('[Sitemap#getMaps] finds the expected amount of maps', async () => {
		expect(await sitemap.getMaps()).toHaveLength(2);
	});

	it('[Sitemap#getTopics] finds the expected amount of items', async () => {
		expect(await sitemap.getNodes()).toHaveLength(9);
	});

	it('[getCompressedItemTree] returns the expected array', async () => {
		expect(tree).toEqual([
			0, //root
			[
				1, // 1
				[
					2, // 1.1
					3, // 1.2
					[
						4 // 1.2.1
					]
				],
				5, // 2
				[
					6, // 2.1
					7, // 2.2
					8 // 2.3
				]
			]
		]);
	});

	it('[Sitemap#getExpandedItemTree] returns the expected array', async () => {
		expect(await sitemap.getTree()).toMatchSnapshot();
	});

	it('[extractItemTree] extracts to the expected object', async () => {
		expect(extracted).toEqual(await sitemap.getTree());
	});
});
