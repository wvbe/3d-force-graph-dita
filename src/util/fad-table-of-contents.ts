import {
	evaluateXPathToBoolean,
	evaluateXPathToFirstNode,
	evaluateXPathToNodes,
	evaluateXPathToString
} from 'fontoxpath';
import { SectionInfo } from '../types';

type SectionTypeWithoutVariants = {
	test: string;
	label: string | ((node: Node) => string);
	id: string | ((node: Node) => string);
	// Decides what is shown in the section. Defaults to "."
	traversal?: string;
};

type SectionTypeWithVariants = {
	// Decides what the context node is. If no context node, this section is not shown:
	test: string;
	variants: SectionType[];
};

type SectionType = SectionTypeWithVariants | SectionTypeWithoutVariants;

// This is a format in which the table-of-contents of a FAD file can be specified without repeating too much of
//   ourselves. Any element may yield zero, one or more table-of-contents items (eg. <members> results in both a
//   "Properties" and "Methods" section.
export const FAD_SECTIONS = {
	ARGUMENTS: {
		test: 'self::arguments',
		variants: [
			{
				label: 'Props',
				id: 'arguments',
				test: '../restrict/type/@base = "component"'
			},
			{
				// Arguments to Javascript classes are constructor arguments
				label: 'Constructor arguments',
				id: 'arguments',
				test: '../restrict/type/@base = "class"'
			},
			{
				// Arguments to operation data are called "imported operation data",
				//   and they are only shown if they are properly documented.
				label: 'Imported operation data',
				id: 'arguments',
				test: 'ancestor-or-self::operation or ancestor-or-self::operation-step',
				traversal: './type[1]/members/*'
			},
			{
				// All other types of arguments are simply called arguments
				label: 'Arguments',
				id: 'arguments',
				test: `
					not(../restrict/type/@base = "component") and
					not(../restrict/type/@base = "class") and
					not(ancestor-or-self::operation or ancestor-or-self::operation-step)
				`
			}
		]
	},

	RETURNS: {
		test: 'self::return or self::returns',
		variants: [
			{
				label: 'Returns',
				id: 'returns',
				test: 'not(ancestor-or-self::operation or ancestor-or-self::operation-step)'
			},
			{
				label: 'Exported operation data',
				id: 'returns',
				test: 'ancestor-or-self::operation or ancestor-or-self::operation-step',
				traversal: './type[1]/members/*'
			}
		]
	},

	DEFAULT: {
		label: 'Default value',
		id: 'default',
		test: 'self::default'
	},

	MEMBERS: {
		test: 'self::members[child::*[@sdk]]',
		variants: [
			{
				label: 'Methods',
				id: 'methods',
				test: 'child::*[./restrict/type/@base = "function"]',
				traversal: './*[@sdk and ./restrict/type/@base = "function"]'
			},
			{
				label: 'Properties',
				id: 'properties',
				test: 'child::*[not(./restrict/type/@base = "function")]',
				traversal: './*[@sdk and not(./restrict/type/@base = "function")]'
			}
		]
	},

	STATIC_MEMBERS: {
		label: 'Static properties',
		id: 'static-members',
		test: 'self::static-members[child::*[@sdk]]'
	},

	RELATED_LINKS: {
		label: 'Related links',
		id: 'related-links',
		test: 'self::related-links'
	},

	HEADING: {
		label: (node: Node) => evaluateXPathToString('.', node),
		id: (node: Node) =>
			evaluateXPathToString('.', node)
				.toLowerCase()
				.replace(/\W+/g, ' ')
				.trim()
				.replace(/\s/g, '-'),
		test: 'self::heading'
	}
};

// The order of FAD section types;
const FAD_SECTIONS_LIST: SectionType[] = [
	FAD_SECTIONS.ARGUMENTS,
	FAD_SECTIONS.RETURNS,
	FAD_SECTIONS.DEFAULT,
	FAD_SECTIONS.MEMBERS,
	FAD_SECTIONS.STATIC_MEMBERS,
	FAD_SECTIONS.RELATED_LINKS,
	FAD_SECTIONS.HEADING
];

const FAD_SECTIONS_FLAT_LIST = (function getFlattenedSectionTypeList(
	sectionTypes: SectionType[]
): SectionTypeWithoutVariants[] {
	return sectionTypes.reduce((flattenedSectionTypes, sectionType) => {
		if ((sectionType as SectionTypeWithVariants).variants) {
			const children = getFlattenedSectionTypeList(
				(sectionType as SectionTypeWithVariants).variants
			);
			return flattenedSectionTypes.concat(
				children.map(c => ({
					...c,
					test: `[${sectionType.test}]${c.test}`
				}))
			);
		}
		flattenedSectionTypes.push({
			...(sectionType as SectionTypeWithoutVariants),
			test: `[${sectionType.test}]`
		});
		return flattenedSectionTypes;
	}, [] as SectionTypeWithoutVariants[]);
})(FAD_SECTIONS_LIST);

function getMatchingFadSectionsTypesForNode(
	node: Node,
	possibleSectionTypes: SectionType[]
): SectionTypeWithoutVariants[] {
	return possibleSectionTypes
		.filter(sectionType => evaluateXPathToBoolean(sectionType.test, node))
		.reduce(
			(sectionTypes, sectionType) =>
				(sectionType as SectionTypeWithVariants).variants
					? sectionTypes.concat(
							getMatchingFadSectionsTypesForNode(
								node,
								(sectionType as SectionTypeWithVariants).variants
							)
					  )
					: sectionTypes.concat([sectionType as SectionTypeWithoutVariants]),
			[] as SectionTypeWithoutVariants[]
		);
}

// The sections of a <type> documentation, in specific order, and skipping sections without public SDK items
export const QUERY_FAD_SECTIONS = `
	source,
	deprecated,
	summary,
	description,
	example,
	user-facing,
	${FAD_SECTIONS_LIST.map(sectionType => `./*[${sectionType.test}]`).join(',')}
`;

function insertItemAtLevelRelativeToLast(
	// The (depth-first) previous item
	lastSectionInfo: SectionInfo & {
		parent?: SectionInfo;
	},
	sectionInfo: SectionInfo & {
		parent?: SectionInfo;
	}
): SectionInfo {
	// level 0 = insert as sibling
	// level > 1 = insert as descendant
	// level < 1 = insert as sibling of ancestor
	const levelDiff =
		parseInt((sectionInfo.node as Element).getAttribute('level') || '0', 10) -
		parseInt((lastSectionInfo.node as Element | undefined)?.getAttribute('level') || '0', 10);
	if (levelDiff < 1 && lastSectionInfo.parent) {
		insertItemAtLevelRelativeToLast(lastSectionInfo.parent, sectionInfo);
	} else if (levelDiff > 1 && lastSectionInfo.children.length > 0) {
		insertItemAtLevelRelativeToLast(
			lastSectionInfo.children[lastSectionInfo.children.length - 1],
			sectionInfo
		);
	} else {
		const parentItem = lastSectionInfo;
		parentItem.children.push(sectionInfo);
		sectionInfo.parent = parentItem;
	}
	return sectionInfo;
}

function getFadTableOfContentsForReadme(document: Document): SectionInfo[] {
	const root = { children: [], parent: undefined };
	evaluateXPathToNodes('//heading', document).reduce<SectionInfo>(
		(lastSectionInfo, node) =>
			insertItemAtLevelRelativeToLast(
				lastSectionInfo,
				getFadSectionInfo(node as Node, FAD_SECTIONS.HEADING)
			),
		(root as unknown) as SectionInfo
	);
	return root.children;
}

function getFadSectionInfo(node: Node, sectionType: SectionTypeWithoutVariants): SectionInfo {
	return {
		id: typeof sectionType.id === 'string' ? sectionType.id : sectionType.id(node),
		label: typeof sectionType.label === 'string' ? sectionType.label : sectionType.label(node),

		node: node as Node,

		traversal: sectionType.traversal || './node()',

		// FAD article TOC's do not have nesting, madlad
		children: []
	};
}

export function getMatchingFadSectionsForNode(node: Node): SectionInfo[] {
	return getMatchingFadSectionsTypesForNode(node, FAD_SECTIONS_LIST).map(sectionType =>
		getFadSectionInfo(node, sectionType)
	);
}

export function getFirstMatchingFadSectionForNode(
	node: Node,
	possibleSectionTypes: SectionType[] = FAD_SECTIONS_LIST
): SectionInfo {
	const sectionType = possibleSectionTypes.find(sectionType =>
		evaluateXPathToBoolean(sectionType.test, node)
	);
	if (sectionType && (sectionType as SectionTypeWithVariants).variants) {
		return getFirstMatchingFadSectionForNode(
			node,
			(sectionType as SectionTypeWithVariants).variants
		);
	}
	if (!sectionType) {
		throw new Error(`Node <${node.nodeName}> is not a valid section`);
	}

	return getFadSectionInfo(node, sectionType as SectionTypeWithoutVariants);
}

export function getFadTableOfContents(document: Document): SectionInfo[] {
	if (document.documentElement.nodeName === 'narrative') {
		// @TODO check this more nicely, keep namespaces into account etc.
		return getFadTableOfContentsForReadme(document);
	}

	return FAD_SECTIONS_FLAT_LIST.map(sectionType => {
		const node = evaluateXPathToFirstNode(
			'./*' + sectionType.test,
			document.documentElement
		) as Node;
		return node ? getFadSectionInfo(node, sectionType) : null;
	}).filter(Boolean) as SectionInfo[];
}
