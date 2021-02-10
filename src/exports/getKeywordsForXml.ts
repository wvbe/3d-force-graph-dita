import VFile from 'vfile';
import retext from 'retext';
import pos from 'retext-pos';
import keywords from 'retext-keywords';
import { evaluateXPathToString } from 'fontoxpath';

export async function getKeywordsForXml(dom: Node) {
	const str = evaluateXPathToString('.', dom);
	const vfile = VFile({ contents: str });

	const file: any = await new Promise((resolve, reject) =>
		retext()
			.use(pos) // Make sure to use `retext-pos` before `retext-keywords`.
			.use(keywords)
			.process(vfile, (err: Error | undefined, file: any) =>
				err ? reject(err) : resolve(file)
			)
	);

	return {
		keywords: file.data.keywords.map((keyword: any) => ({
			content: keyword.stem,
			score: keyword.score,
			amount: keyword.matches.length
		})),
		keyPhrases: file.data.keyphrases.map((phrase: any) => ({
			content: phrase.value,
			score: phrase.score,
			weight: phrase.weight
		}))
	};
}
