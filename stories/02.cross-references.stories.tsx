import createDataStory from './util/story-template';

export default {
	title: '2. Cross-references'
};

export const S2 = createDataStory(require('./data/crossReferenceGraphAll.json'));
S2.storyName = 'All';

export const S3 = createDataStory(require('./data/crossReferenceGraphDita.json'));
S3.storyName = 'Narrative only';

export const S4 = createDataStory(require('./data/crossReferenceGraphFad.json'));
S4.storyName = 'API docs only';
