import createDataStory from './util/story-template';

export default {
	title: '3. Keyword analysis'
};

export const S2 = createDataStory(require('./data/keywordGraph.json'));
S2.storyName = 'Top keywords with strongest links';
