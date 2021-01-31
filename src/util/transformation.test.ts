import { describe, expect, it } from '@jest/globals';
import { serializeToWellFormedString } from 'slimdom';
import { sync } from 'slimdom-sax-parser';
import { transformNode, TransformationXquf } from './transformation';

describe('transform()', () => {
	it('transforms', async () => {
		const dom = sync(`<foo />`);
		await transformNode(
			dom,
			[new TransformationXquf<{}>(`replace node /foo with <bar />`)],
			{}
		);
		expect(serializeToWellFormedString(dom)).toBe(`<bar/>`);
	});
});
