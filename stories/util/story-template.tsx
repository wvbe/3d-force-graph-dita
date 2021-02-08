import ForceGraph3D from '3d-force-graph';
import { Story } from '@storybook/react';
import React, { FC, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

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
			.linkColor((new THREE.Color(0x000000) as unknown) as string)
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
		Graph.scene().background = new THREE.Color(0xffffff);
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

export default function createDataStory(data: GraphData): Story<{}> {
	const story = args => <ForceGraph data={data} />;
	return story;
}
