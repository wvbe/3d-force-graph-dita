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

const RUNNERS = [
	['simpleDitamapGraphNormal', require('./compile/simpleDitamapGraph').normal],
	['simpleDitamapGraphExpanded', require('./compile/simpleDitamapGraph').expanded],
	['crossReferenceGraphAll', require('./compile/crossReferenceGraph').all],
	['crossReferenceGraphDita', require('./compile/crossReferenceGraph').dita],
	['crossReferenceGraphFad', require('./compile/crossReferenceGraph').fad],
	['keywordGraph', require('./compile/keywordGraph').keywords]
];
console.log('>>> START <<<');
console.log('Runners:');
console.log(RUNNERS);

(async initialXmlFilePath => {
	const sitemap = new Sitemap(cache, initialXmlFilePath);

	await RUNNERS.reduce(async (last, fileName) => {
		await last;
		let filePath, callback;
		if (Array.isArray(fileName)) {
			filePath = path.join(TARGET_DIR, fileName[0] + '.json');
			callback = fileName[1];
		} else {
			filePath = path.join(TARGET_DIR, fileName + '.json');
			callback = require('./compile/' + fileName);
		}

		console.group(filePath);

		const data = Object.assign({ nodes: [], links: [] }, await callback(cache, sitemap));
		await fs.writeFile(filePath, JSON.stringify(data, null, '\t'));
		console.log(`${data.nodes.length} nodes, ${data.links.length} links`);
		console.groupEnd();
	}, null);
	console.error('>>> FINISH <<<');
})(path.join('docs', 'index.xml')).catch(error => {
	console.error('>>> FATAL ERROR <<<');
	console.error(error.stack);
	process.exit(1);
});
