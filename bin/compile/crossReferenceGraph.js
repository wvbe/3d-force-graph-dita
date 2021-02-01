const { evaluateXPathToStrings } = require('fontoxpath');

module.exports = {
	all: compileCrossReferenceData.bind(undefined, '//*/(@href, @conref, @reference)'),
	dita: compileCrossReferenceData.bind(undefined, '//*/(@href, @conref)'),
	fad: compileCrossReferenceData.bind(undefined, '//*/@reference')
};
async function compileCrossReferenceData(query, cache, sitemap) {
	const nodes = (await sitemap.getNodes()).filter(reference =>
		Boolean(reference.target && !reference.resource)
	);
	const nodeIdsByFilePath = nodes.reduce(
		(all, node) =>
			Object.assign(all, {
				[node.target]: node.id
			}),
		{}
	);

	const data = {
		nodes: [],
		links: []
	};
	for await (const node of nodes) {
		const doc = await cache.getDocument(node.target);
		data.nodes.push({
			id: node.id,
			navtitle: node.navtitle
		});
		data.links.splice(
			0,
			0,
			...evaluateXPathToStrings(query, doc)
				.filter(link => link.startsWith('docs'))
				.map(link => nodeIdsByFilePath[link.split('#')[0]])
				.filter(Boolean)
				.filter((link, i, all) => all.indexOf(link) === i)
				.map(target => ({
					source: node.id,
					target
				}))
		);
	}

	return data;
}
