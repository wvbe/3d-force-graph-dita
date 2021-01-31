import { describe, expect, it } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';
import { FileCache } from './dom-caching';

const XML_DIR = path.join(__dirname, '..', '..', 'test', 'simple-map');

const mockFileRead = jest.fn((name, options) => fs.readFile(name, options));

describe('FileCache', () => {
	const fileCache = new FileCache({
		resolve: name => path.join(XML_DIR, name),
		fetch: async name => String(await mockFileRead(name, 'utf8'))
	});

	it('Minimizes time spent reading from disk', async () => {
		await fileCache.getDocument('v1.main.xml');
		await fileCache.getDocument('v1.main.xml');
		expect(mockFileRead.mock.calls).toHaveLength(1);
	});

	// @TODO
	// - Test that string cache is bust when DOM is exported
	// - Test the amount of file access in case of circular conrefs
});
