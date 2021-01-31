import slimdom, { serializeToWellFormedString } from 'slimdom';
import { sync } from 'slimdom-sax-parser';

export type FileCacheOptions = {
	resolve: (filePath: string) => string;
	fetch: (filePath: string) => Promise<string>;
};

export class FileCache {
	private stringByName: { [filePath: string]: string | null } = {};
	private domByFileName: { [filePath: string]: Document } = {};
	private options: FileCacheOptions;

	constructor(options: FileCacheOptions) {
		this.options = options;
	}

	public knowsAbout(filePath: string): boolean {
		return !!this.stringByName[filePath];
	}

	public async getString(filePath: string): Promise<string> {
		if (!this.stringByName[filePath] && this.domByFileName[filePath]) {
			// This cache was removed after getDocument returned it (after which it may have been changed by reference).
			this.stringByName[filePath] = serializeToWellFormedString(
				(this.domByFileName[filePath] as unknown) as slimdom.Node
			);
		}

		if (!this.stringByName[filePath]) {
			// Either this thing was never fetched before, or someone botched busting the cache
			const resolvedFilePath = this.options.resolve(filePath);
			this.stringByName[filePath] = await this.options.fetch(resolvedFilePath);
		}

		return this.stringByName[filePath] as string;
	}

	public async getDocument(filePath: string): Promise<Document> {
		// NOTE caching on the filePath key, not a resolved file path. This is probably fine for a while.
		if (this.domByFileName[filePath]) {
			return this.domByFileName[filePath];
		}

		const fetchedContent = await this.getString(filePath);

		this.domByFileName[filePath] = (sync(fetchedContent) as unknown) as Document;

		// The DOM may be changed after it is returned, so unset that cache and let getString serialize the DOm back
		// to a string next thime it is asked.
		this.stringByName[filePath] = null;

		return this.domByFileName[filePath];
	}

	public bustFile(filePath: string): void {
		delete this.stringByName[filePath];
		delete this.domByFileName[filePath];
	}
}
