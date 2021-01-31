import React, { FC, HTMLAttributes, ReactChild, useEffect, useRef, useState } from 'react';
import { Meta, Story } from '@storybook/react';
import ForceGraph3D from '3d-force-graph';
export interface Props extends HTMLAttributes<HTMLDivElement> {
	/** custom content, defaults to 'the snozzberries taste like snozzberries' */
	children?: ReactChild;
}

// const N = 300;

// Please do not use types off of a default export module or else Storybook Docs will suffer.
// see: https://github.com/storybookjs/storybook/issues/9556
/**
 * A custom Thing component. Neat!
 */
type GraphData = Parameters<ReturnType<ReturnType<typeof ForceGraph3D>>['graphData']>[0];

const ForceGraph: FC<{ data: GraphData }> = ({ data }) => {
	const divElementRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		if (!divElementRef.current || !data) {
			return;
		}
		const force3dGraph = ForceGraph3D();
		const Graph = force3dGraph(divElementRef.current)
			.graphData(data)
			.nodeLabel('navtitle')
			.nodeAutoColorBy('depth')
			// .linkDirectionalArrowLength(3.5)
			// .linkDirectionalArrowRelPos(1)
			// .linkCurvature(0.25)
			.onNodeDragEnd((node: any) => {
				node.fx = node.x;
				node.fy = node.y;
				node.fz = node.z;
			})
			.onNodeClick((node: any) => {
				Graph.cameraPosition(
					Graph.camera().position, // new position
					node, // lookAt ({ x, y, z })
					3000 // ms transition duration
				);
			});
		// Graph.d3Force('charge';
		return () => {
			Graph.graphData({
				nodes: [],
				links: []
			});
			Graph.pauseAnimation();
		};
	}, [divElementRef.current]);
	return (
		<div
			ref={divElementRef}
			style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
		/>
	);
};

const Showcase: FC<{ data: GraphData }> = ({ data }) => {
	const [show, setShown] = useState(false);

	useEffect(() => {
		if (show) {
			setShown(false);
		}
		setTimeout(() => setShown(true), 100);
	}, [data]);
	return show ? <ForceGraph data={data} /> : 'Waiting';
};

export default {
	title: 'Welcome'
};

const Template: Story<Props> = args => <Showcase {...args} />;
const N = 10;
export const HelloWorld = Object.assign(Template.bind({}), {
	args: {
		data: {
			nodes: [...Array(N).keys()].map(i => ({ id: i })),
			links: [...Array(N - 4).keys()]
				.filter(id => id)
				.map(id => ({
					source: id,
					target: Math.round(Math.random() * (id - 1))
				}))
		}
	}
});
const M = 100;
export const HelloWorld2 = Object.assign(Template.bind({}), {
	args: {
		data: {
			nodes: [...Array(M).keys()].map(i => ({ id: i })),
			links: [...Array(M - 4).keys()]
				.filter(id => id)
				.map(id => ({
					source: id,
					target: Math.round(Math.random() * (id - 1))
				}))
		}
	}
});

export const Ditamap = Object.assign(Template.bind({}), {
	args: {
		data: require('./data/simpleDitamapGraph.json')
	}
});
Ditamap.storyName = 'Simple DITAMAP graph';

export const Ditamap2 = Object.assign(Template.bind({}), {
	args: {
		data: require('./data/crossReferenceGraph.json')
	}
});
Ditamap2.storyName = 'Cross-reference graph';
