module.exports = async (cache, sitemap) => {
	const tree = await sitemap.getTree();
	const ROOT = tree[0];
	const NODES = [ROOT];

	(function recursiveMap(nods, parent, depth = 0) {
		parent.depth = depth;
		nods.filter(nod => !nod.resource).forEach(nod => {
			nod.parent = parent.id;
			recursiveMap(nod.children, nod, depth + 1);

			NODES.push(nod);
		});
	})(ROOT.children, ROOT);

	const nodes = NODES.map(node => ({
		...node,
		children: node.children.filter(nod => !nod.resource).map(c => c.id)
	}));

	return {
		nodes: nodes.map(node => ({
			...node,
			val: node.children.length * 2 + 1
		})),
		links: nodes
			.filter(node => Boolean(node.parent))
			.map(node => ({
				source: node.id,
				target: node.parent
			}))
	};
};
