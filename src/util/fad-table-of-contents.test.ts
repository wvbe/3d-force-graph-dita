import fs from 'fs';
import path from 'path';
import { sync } from 'slimdom-sax-parser';
import { SectionInfo } from '../types';
import { getFadTableOfContents } from './fad-table-of-contents';

function stripNodeFromToc(toc: SectionInfo): any {
	return {
		label: toc.label,
		id: toc.id,
		children: toc.children.map(stripNodeFromToc)
	};
}

describe('getFadTableOfContents', () => {
	it('for narrative pages', () => {
		const dom = sync(
			fs.readFileSync(
				path.resolve(__dirname, '../../test/xml/fad/narrative-headings-test.xml'),
				'utf8'
			)
		);
		// console.log(slimdom.serializeToWellFormedString(dom));
		expect(
			getFadTableOfContents((dom as unknown) as Document).map(stripNodeFromToc)
		).toMatchSnapshot();
	});
	it('for React component type pages', () => {
		const dom = sync(
			fs.readFileSync(path.resolve(__dirname, '../../test/xml/fad/Button.xml'), 'utf8')
		);
		// console.log(slimdom.serializeToWellFormedString(dom));
		expect(
			getFadTableOfContents((dom as unknown) as Document).map(stripNodeFromToc)
		).toMatchSnapshot();
	});
	it('for an operation', () => {
		const dom = sync(
			fs.readFileSync(
				path.resolve(__dirname, '../../test/xml/fad/horizontal-insert.xml'),
				'utf8'
			)
		);
		// console.log(slimdom.serializeToWellFormedString(dom));
		expect(
			getFadTableOfContents((dom as unknown) as Document).map(stripNodeFromToc)
		).toMatchSnapshot();
	});
	it('for a class with both methods and properties', () => {
		const dom = sync(
			fs.readFileSync(
				path.resolve(__dirname, '../../test/xml/fad/BlueprintRange.xml'),
				'utf8'
			)
		);
		// console.log(slimdom.serializeToWellFormedString(dom));
		expect(
			getFadTableOfContents((dom as unknown) as Document).map(stripNodeFromToc)
		).toMatchSnapshot();
	});
});
