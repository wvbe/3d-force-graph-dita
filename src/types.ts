import { ReactElement } from 'react';

export type SectionInfo = {
	label: string;
	id: string;
	node: Node;
	children: SectionInfo[];
	traversal: string;
};

export type RenderingContext = {
	articleHeroWidget: ReactElement | null;
};
