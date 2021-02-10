const { getKeywordsForXml } = require('../../dist');

const MAX_KEYWORD_COUNT = 500;
const MAX_KEYWORD_LINKS = 3;

module.exports = {
	keywords: async (cache, sitemap) => {
		const nodes = (await sitemap.getNodes()).filter(node => Boolean(node.target));

		const KEYWORDS = {};

		for await (const node of nodes) {
			const data = await getKeywordsForXml(await cache.getDocument(node.target));
			data.keywords.forEach(keyword => {
				if (!KEYWORDS['#' + keyword.content]) {
					Object.assign(KEYWORDS, {
						['#' + keyword.content]: {
							content: keyword.content,
							amount: 0,
							links: {}
						}
					});
				}
				const obj = KEYWORDS['#' + keyword.content];
				obj.amount += keyword.amount;
				data.keywords
					.filter(k => k !== keyword)
					.forEach(k => {
						obj.links[k.content] = obj.links[k.content] || 0 + 1;
					});
			});
		}

		const exp = {
			nodes: [],
			links: []
		};
		const topKeywords = Object.keys(KEYWORDS)
			.map(keyword => KEYWORDS[keyword])
			.sort((a, b) => b.amount - a.amount)
			.slice(0, MAX_KEYWORD_COUNT);

		const minAmount = topKeywords.reduce(
			(min, keyword) => Math.min(min, keyword.amount),
			Infinity
		);

		const maxAmount = topKeywords.reduce((max, keyword) => Math.max(max, keyword.amount), 0);

		topKeywords.forEach(keyword => {
			exp.nodes.push({
				label: keyword.content,
				id: keyword.content,
				val: ((keyword.amount - minAmount) / (maxAmount - minAmount)) * 100
			});
			Object.keys(keyword.links)
				.map(link => [link, keyword.links[link]])
				// Only consider links to other top keywords
				.filter(l => topKeywords.some(k => k.content === l[0]))
				// Sort by the most powerful links first
				.sort((a, b) => b[1] - a[1])
				.slice(0, MAX_KEYWORD_LINKS)
				.forEach(l =>
					exp.links.push({
						source: keyword.content,
						target: l[0]
					})
				);
		});
		return exp;
	}
};
