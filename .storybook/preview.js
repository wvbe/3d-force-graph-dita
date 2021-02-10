// https://storybook.js.org/docs/react/writing-stories/parameters#global-parameters
export const parameters = {
	// https://storybook.js.org/docs/react/essentials/actions#automatically-matching-args
	actions: { argTypesRegex: '^on.*' }
};
export const decorators = [
	Story => (
		<div
			style={{
				position: 'absolute',
				backgroundColor: '#202020',
				top: 0,
				left: 0,
				right: 0,
				bottom: 0
			}}
		>
			<Story />
		</div>
	)
];
