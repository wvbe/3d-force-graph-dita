import { evaluateXPath } from 'fontoxpath';
import { SectionInfo } from '../types';

const QUERY = `
	declare function Q{get-dita-page-menu-items}recurse($node) {
		array{
			$node/(topic|concept)/map {
				"label": string(./title),
				"id": string(@id),
				"node": .,
				"children": Q{get-dita-page-menu-items}recurse(.),
				"traversal": "./node()"
			},
			$node[self::task]/taskbody/steps/step/(
				let $index := count(preceding-sibling::step) + 1
				return map {
					"label": concat("Step ", $index, ": ", string(./cmd)),
					"id": concat("step-", $index),
					"node": .,
					"children": array{},
					"traversal": "./node()"
				}
			)
		}
	};
	Q{get-dita-page-menu-items}recurse(/*)
`;

/**
 * Retrieves a hierarchical object that represents significant sections in DITA content.
 *
 * - For normal topics that means all sub- and descendant topics.
 * - For DITA tasks, each step is a section.
 *
 * The returned object can be used by <PageMenu>
 *
 */
export function getDitaTableOfContents(node: Document): SectionInfo[] {
	return evaluateXPath(QUERY, node, undefined, undefined, undefined, {
		language: evaluateXPath.XQUERY_3_1_LANGUAGE
	});
}

// @TODO throw away, it is not being used.
export function getDitaClosestTableOfContentsNode(node: Node): SectionInfo | null {
	return evaluateXPath(
		`let $index := count(preceding-sibling::step) + 1
		return ancestor-or-self::*[name() = ("topic", "concept", "step")][1]/map {
			"label": if (self::step)
				then concat("Step ", $index, ": ", string(./cmd))
				else string(./title),
			"id": if (self::step)
				then concat("step-", $index)
				else string(@id),
			"node": .,
			(: TODO code-share the recursive function from earlier to _actuall_ get the children :)
			"children": array {},
			"traversal": "./node()"
		}`,
		node
	);
}
