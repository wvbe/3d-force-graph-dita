const { evaluateXPathToStrings, evaluateXPathToBoolean } = require('fontoxpath');

const fadNsUri = 'http://www.fontoxml.com/ns/api-documentation';
module.exports = {
	all: compileCrossReferenceData.bind(undefined, {
		query: '//*/(@href, @conref, @reference)',
		filterer: () => true
	}),
	dita: compileCrossReferenceData.bind(undefined, {
		query: '//*/(@href, @conref)',
		filterer: ({ document }) =>
			!evaluateXPathToBoolean('namespace-uri(/*) = $fadNsUri', document, null, { fadNsUri })
	}),
	fad: compileCrossReferenceData.bind(undefined, {
		query: '//*/@reference',
		filterer: ({ document }) =>
			evaluateXPathToBoolean('namespace-uri(/*) = $fadNsUri', document, null, { fadNsUri })
	})
};

async function compileCrossReferenceData({ query, filterer }, cache, sitemap) {
	const nodes = (
		await Promise.all(
			(await sitemap.getNodes())
				.filter(reference => Boolean(reference.target && !reference.resource))
				.map(async node => ({
					node,
					document: await cache.getDocument(node.target)
				}))
		)
	).filter(filterer);
	const nodeIdsByFilePath = nodes.reduce(
		(all, { node }) =>
			Object.assign(all, {
				[node.target]: node.id
			}),
		{}
	);

	const data = {
		nodes: [],
		links: []
	};
	for await (const { node, document } of nodes) {
		data.nodes.push({
			id: node.id,
			label: node.navtitle,
			group: evaluateXPathToBoolean('namespace-uri(/*) = $fadNsUri', document, null, {
				fadNsUri
			})
				? 'fad'
				: 'dita'
		});
		data.links.splice(
			0,
			0,
			...evaluateXPathToStrings(query, document)
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
	data.nodes.forEach(node => {
		node.val = data.links.filter(
			link => link.source === node.id || link.target === node.id
		).length;
	});

	return data;
}
