import { evaluateXPathToFirstNode } from 'fontoxpath';
import fs from 'fs';
import path from 'path';
import { sync } from 'slimdom-sax-parser';
import { SectionInfo } from '../types';
import {
	getDitaClosestTableOfContentsNode,
	getDitaTableOfContents
} from './dita-table-of-contents';

function stripNodeFromToc(toc: SectionInfo | null): any {
	if (!toc) return toc;

	return {
		label: toc.label,
		id: toc.id,
		children: toc.children.map(stripNodeFromToc)
	};
}

describe('getDitaTableOfContents', () => {
	it('for (nested) topics', () => {
		const dom = sync(
			fs.readFileSync(
				path.resolve(
					__dirname,
					'../../test/xml/dita/xpath-3-1-selectors.xml'
				),
				'utf8'
			)
		);
		expect(
			getDitaTableOfContents((dom as unknown) as Document).map(
				stripNodeFromToc
			)
		).toMatchSnapshot();
	});
	it('for tasks', () => {
		const dom = sync(
			fs.readFileSync(
				path.resolve(
					__dirname,
					'../../test/xml/dita/create-a-popover.xml'
				),
				'utf8'
			)
		);
		expect(
			getDitaTableOfContents((dom as unknown) as Document).map(
				stripNodeFromToc
			)
		).toMatchSnapshot();
	});
});

describe('getDitaClosestTableOfContentsNode', () => {
	it('for (nested) topics', () => {
		const dom = sync(
			fs.readFileSync(
				path.resolve(
					__dirname,
					'../../test/xml/dita/xpath-3-1-selectors.xml'
				),
				'utf8'
			)
		);
		const contextNode = evaluateXPathToFirstNode(
			'//note[@id="id-8fdd9a80-4f16-45b0-fb71-86dd4d84c337"]',
			dom
		);
		expect(
			stripNodeFromToc(
				getDitaClosestTableOfContentsNode(contextNode as Node)
			)
		).toMatchSnapshot();
	});
	it('for tasks', () => {
		const dom = sync(
			fs.readFileSync(
				path.resolve(
					__dirname,
					'../../test/xml/dita/create-a-popover.xml'
				),
				'utf8'
			)
		);
		const contextNode = evaluateXPathToFirstNode(
			'//fig[@id="id-83a443ca-356a-4473-c1cf-57eee752ff89"]',
			dom
		);
		expect(
			stripNodeFromToc(
				getDitaClosestTableOfContentsNode(contextNode as Node)
			)
		).toMatchSnapshot();
	});
});
