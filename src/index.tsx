export { getDitaTableOfContents } from './util/dita-table-of-contents';
export { getFadTableOfContents } from './util/fad-table-of-contents';

export {
	createTransformingFileCacheForVersion,
	TRANSFORM_RELATIVE_TO_ABSOLUTE_XML_REFERENCES,
	TRANSFORM_REPLACE_CONTENT_REFERENCES_WITH_XML_TARGETS
} from './util/resolving-dom-cache';
export { FileCache } from './util/dom-caching';
export { Sitemap } from './util/sitemap';
