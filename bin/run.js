const fs = require('fs/promises');
const path = require('path');
const {
	Sitemap,
	createTransformingFileCacheForVersion,
	TRANSFORM_RELATIVE_TO_ABSOLUTE_XML_REFERENCES
} = require('../dist');

const SOURCE_DIR = path.resolve(__dirname, '..', '..', 'fonto-documentation');
const TARGET_DIR = path.resolve(__dirname, '..', 'stories', 'data');

const { cache } = createTransformingFileCacheForVersion(
	p => fs.readFile(path.join(SOURCE_DIR, p), 'utf8'),
	[TRANSFORM_RELATIVE_TO_ABSOLUTE_XML_REFERENCES]
);

const RUNNERS = ['simpleDitamapGraph', 'crossReferenceGraph'];
console.log('>>> START <<<');
console.log(RUNNERS);

(async initialXmlFilePath => {
	const sitemap = new Sitemap(cache, initialXmlFilePath);

	await RUNNERS.reduce(async (last, fileName) => {
		await last;
		const filePath = path.join(TARGET_DIR, fileName + '.json');
		console.group(filePath);

		const data = Object.assign(
			{ nodes: [], links: [] },
			await require('./compile/' + fileName)(cache, sitemap)
		);
		await fs.writeFile(filePath, JSON.stringify(data, null, '\t'));
		console.log(`${data.nodes.length} nodes, ${data.links.length} links`);
		console.groupEnd();
	}, null);
	console.error('>>> STOP <<<');
})(path.join('docs', 'index.xml')).catch(error => {
	console.error('>>> FATAL ERROR <<<');
	console.error(error.stack);
	process.exit(1);
});
