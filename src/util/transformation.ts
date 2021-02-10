import { evaluateUpdatingExpression, executePendingUpdateList } from 'fontoxpath';
import slimdom from 'slimdom';

type TransformerFn<T> = (dom: Node, variables: T) => Promise<Node>;

export class TransformationCallback<T extends {}> {
	private callback: TransformerFn<T>;
	constructor(callback: TransformerFn<T>) {
		this.callback = callback;
	}
	async run(dom: Node, variables: T): Promise<Node> {
		return this.callback(dom, variables);
	}
}

export class TransformationXquf<T extends {}> {
	private times: number = 1;
	private expression: string;

	constructor(expression: string) {
		this.expression = expression;
	}

	// When one expression hits two elements that are ancestor/descendant of one another,
	// then the ancestor element does not "get" the updates to the descendant, or the other way around.
	//
	// ```xq
	//   for $thing in //thing
	//    return replace node $thing with <new>{$thing/node()}</new>
	// ```
	//
	// Unfortunately that appears to be according to spec, so here's a "repeat" workaround that lets you simply
	// run the same transform multiple times.
	public repeat(n: number): TransformationXquf<T> {
		this.times = n;
		return this;
	}

	public async run(dom: Node, variables: T): Promise<Node> {
		return Array.from(new Array(this.times)).reduce(async (previous, _) => {
			const intermediaryDom = await previous;
			const { pendingUpdateList } = await evaluateUpdatingExpression(
				this.expression,
				intermediaryDom,
				null,
				variables,
				{
					// @TODO make configurable:
					debug: true
				}
			);

			executePendingUpdateList(pendingUpdateList);

			return intermediaryDom;
		}, dom);
	}
}

export async function transformNode<T extends {}>(
	dom: Node | slimdom.Node,
	xqufs: (TransformationCallback<T> | TransformationXquf<T>)[],
	variables: T
): Promise<Node> {
	return await xqufs.reduce<Node | Promise<Node>>(
		async (dom, transformer) => transformer.run(await dom, variables),
		(dom as unknown) as Node
	);
}
