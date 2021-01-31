import {
	evaluateXPathToBoolean,
	evaluateXPathToFirstNode,
	evaluateXPathToNodes,
	evaluateXPathToString,
	registerCustomXPathFunction
} from 'fontoxpath';
import path from 'path';
import slimdom, { serializeToWellFormedString } from 'slimdom';
import { sync as parseXmlToDom } from 'slimdom-sax-parser';
import { FileCache } from './dom-caching';
import { transformNode, TransformationCallback, TransformationXquf } from './transformation';

const NS = 'Q{skrrrr}';
const NS_URI_FAD = 'fuck';
type TransformationVariables = {
	documentUri: string;
	cacheIdentifier: string;
};

registerCustomXPathFunction(
	{
		namespaceURI: 'skrrrr',
		localName: 'resolve-relative-reference'
	},
	['xs:string', 'xs:string'],
	'xs:string',
	(_: any, referrer: string, target: string) => {
		if (
			target.startsWith('http://') ||
			target.startsWith('https://') ||
			target.startsWith('//')
		) {
			return target;
		}
		if (target.startsWith('#')) {
			return referrer + target;
		}
		if (target === '.') {
			return referrer;
		}
		return path.join(path.dirname(referrer), target);
	}
);

export const TRANSFORM_RELATIVE_TO_ABSOLUTE_XML_REFERENCES = new TransformationXquf<
	TransformationVariables
>(`
	for $reference in //*[(@href and not(@scope='external')) or @conref or @reference]
		let $attr := $reference/(@href, @conref, @reference)[1],
			$originalValue := string($attr)
		return (
			replace value of node $attr with ${NS}resolve-relative-reference(
				$documentUri,
				$originalValue
			),
			insert nodes (
				attribute original-reference { $originalValue }
			) into $reference
		)
`);

const circularProtection: {
	[cacheId: string]: string[];
} = {};

export const TRANSFORM_REPLACE_CONTENT_REFERENCES_WITH_XML_TARGETS = new TransformationCallback<
	TransformationVariables
>(
	// Recursively supplant conrefs:
	async (dom: Node, { cacheIdentifier, documentUri }) => {
		if (!circularProtection[cacheIdentifier]) {
			circularProtection[cacheIdentifier] = [];
		}
		if (circularProtection[cacheIdentifier].includes(documentUri)) {
			// If this is the second time that a file is being transformed while rendering itself (aka a circular
			// dependency) quit without transforming. The orginal retrieval of this file will still return a transformed
			// DOM although its possible that very deep subtrees contain copies of an untransformed DOM.
			return dom;
		}
		circularProtection[cacheIdentifier].push(documentUri);

		const conrefElements = evaluateXPathToNodes(
			`//*[
				not(@unresolved-reference) and
				(
					(
						not(namespace-uri(.) = $fadNamespaceUri) and
						@conref
					) or
					(
						name() = ('type', 'configuration', 'operation', 'step') and
						@reference
					)
				)
			]`,
			dom,
			null,
			{
				fadNamespaceUri: NS_URI_FAD
			}
		) as Node[];

		for await (const conrefElement of conrefElements) {
			const target = evaluateXPathToString('@conref, @reference', conrefElement);
			const conrefElementIdentifier = evaluateXPathToString('@id', conrefElement);
			const [targetFilePath, conrefIdentifiersPart] = target.split('#');
			const targetElementIdentifier = conrefIdentifiersPart?.split('/').pop();
			const targetFileDom =
				targetFilePath === documentUri
					? dom
					: targetFilePath
					? await CACHES_BY_ID[cacheIdentifier].getDocument(targetFilePath)
					: dom;
			if (!targetFileDom) {
				throw new Error(
					`A dead conref was found, pointing to document "${targetFilePath}"`
				);
			}

			const targetElement = (targetElementIdentifier
				? evaluateXPathToFirstNode('//*[@id = $id]', targetFileDom, null, {
						id: targetElementIdentifier
				  })
				: (targetFileDom as Document).documentElement) as Element | null;
			if (!targetElement) {
				throw new Error(
					`A dead conref was found, pointing to element "${targetElementIdentifier}"`
				);
			}

			if (
				evaluateXPathToBoolean(
					`
						namespace-uri(.) = $fadNamespaceUri and
						not(ancestor-or-self::inner-members)
					`,
					targetElement,
					null,
					{
						fadNamespaceUri: NS_URI_FAD
					}
				)
			) {
				// The conref target points to a member, static member or other thing, but _not_ an inner member and
				// therefore we don't need to replace XML-ish stuffs.
				continue;
			}

			// Clone, copy over identifier, and replace conrefElement with targetElement
			const targetElementClone = targetElement.cloneNode(true) as any;
			targetElementClone.setAttribute(
				'included-from-context',
				targetElement.parentNode?.nodeName || '#document'
			);
			if (conrefElementIdentifier) {
				targetElementClone.setAttribute('id', conrefElementIdentifier);
			}
			conrefElement.parentElement?.insertBefore(targetElementClone, conrefElement);
			conrefElement.parentElement?.removeChild(conrefElement);
		}

		circularProtection[cacheIdentifier].pop();
		return dom;
	}
);

const CACHES_BY_ID: { [cacheIdentifier: string]: FileCache } = {};

/**
 * Provides an instance of FileCache that is configured to transform DITA files so that @href and @conref targets are
 * resolved to absolute references (relative to CMS root).
 *
 * Also, replaces @conref with the conreffed target, recursively, so that conrefs within conrefs will also work.
 *
 * @TODO Fix 'er up for FAD documents and inner member references.
 */
export function createTransformingFileCacheForVersion(
	readFile: (fileName: string) => Promise<string>,
	transformations: (
		| TransformationCallback<TransformationVariables>
		| TransformationXquf<TransformationVariables>
	)[] = [
		TRANSFORM_RELATIVE_TO_ABSOLUTE_XML_REFERENCES,
		TRANSFORM_REPLACE_CONTENT_REFERENCES_WITH_XML_TARGETS
	]
): { cache: FileCache; clear: () => void } {
	const cacheIdentifier = ['file-cache', Date.now(), Math.floor(Math.random() * 1000000)].join(
		'/'
	);

	// A random identifier is being used so that an XPath function (which are registered globally in XPath) can find
	// its way back to the FileCache instance.
	if (CACHES_BY_ID[cacheIdentifier]) {
		throw new Error(
			`Cache identifier "${cacheIdentifier}" not unique. Please reuse prior cache, or clear the old one`
		);
	}

	CACHES_BY_ID[cacheIdentifier] = new FileCache({
		resolve: (filePath: string) => {
			// The raw @href values may have to be decoded first, such as the refrence to
			// operations/untoggle-wide-canvas-content-view-to-150%25-text-size-not-150%25.xml
			return decodeURI(filePath);
		},
		fetch: async (filePath: string) => {
			// XQuery variables that are made available in precookXqufTransformations:
			const precookXqufVariables: TransformationVariables = {
				documentUri: filePath,
				cacheIdentifier: cacheIdentifier
			};

			const content = await readFile(filePath);

			const dom = await transformNode<TransformationVariables>(
				parseXmlToDom(content),
				transformations,
				precookXqufVariables
			);

			return serializeToWellFormedString((dom as unknown) as slimdom.Node);
		}
	});

	return {
		cache: CACHES_BY_ID[cacheIdentifier],
		clear: () => {
			delete CACHES_BY_ID[cacheIdentifier];
		}
	};
}
