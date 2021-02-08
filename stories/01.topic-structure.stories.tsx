import createDataStory from './util/story-template';

export default {
	title: '1. Topic structure'
};

const N = 10;
createDataStory({
	nodes: [...Array(N).keys()].map(i => ({ id: i })),
	links: [...Array(N - 4).keys()]
		.filter(id => id)
		.map(id => ({
			source: id,
			target: Math.round(Math.random() * (id - 1))
		}))
});

export const S1 = createDataStory(require('./data/simpleDitamapGraphNormal.json'));
S1.storyName = 'Topic structure';

export const S2 = createDataStory(require('./data/simpleDitamapGraphExpanded.json'));
S2.storyName = 'Topic & subtopic structure';
