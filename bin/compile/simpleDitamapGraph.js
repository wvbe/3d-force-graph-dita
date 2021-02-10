const { evaluateXPathToBoolean } = require('fontoxpath');
const { getDitaTableOfContents, getFadTableOfContents } = require('../../dist');
const fadNsUri = 'http://www.fontoxml.com/ns/api-documentation';

function prefixIds(prefix, nodes) {
	nodes.forEach(node => {
		node.id = prefix + node.id;
		prefixIds(prefix, node.children);
	});
	return nodes;
}
async function compile(includeToc, cache, sitemap) {
	const tree = await sitemap.getTree();
	const ROOT = tree[0];
	const NODES = [ROOT];

	await (async function recursiveMap(nods, parent, depth = 0) {
		parent.depth = depth;
		const notResourceTopics = nods.filter(nod => !nod.resource);

		for await (const nod of notResourceTopics) {
			nod.parent = parent.id;

			if (includeToc && nod.target) {
				const doc = await cache.getDocument(nod.target);
				const isFad = evaluateXPathToBoolean('namespace-uri(/*) = $fadNsUri', doc, null, {
					fadNsUri
				});
				const toc = prefixIds(
					nod.id,
					isFad ? getFadTableOfContents(doc) : getDitaTableOfContents(doc)
				);
				nod.children = [...nod.children, ...toc];
			}

			await recursiveMap(nod.children, nod, depth + 1);

			NODES.push(nod);
		}
	})(ROOT.children, ROOT);

	const nodes = NODES.map(node => ({
		...node,
		children: node.children.filter(nod => !nod.resource).map(c => c.id)
	}));

	return {
		nodes: nodes.map(node => ({
			id: node.id,
			label: node.navtitle || node.label,
			val: node.children.length,
			group: node.depth
		})),
		links: nodes
			.filter(node => Boolean(node.parent))
			.map(node => ({
				source: node.id,
				target: node.parent
			}))
	};
}

module.exports = {
	normal: compile.bind(undefined, false),
	expanded: compile.bind(undefined, true)
};
