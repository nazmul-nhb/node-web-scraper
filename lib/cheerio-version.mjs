import { intro, outro, spinner } from '@clack/prompts';
import chalk from 'chalk';
import { load } from 'cheerio';
import cloudscraper from 'cloudscraper';
import fs from 'fs';
import path from 'path';
import { mimicClack } from './clack.mjs';
import { baseUrl, pages } from './constants.mjs';
import { delay } from './helpers.mjs';

/**
 * Scrape pages using cloudscraper (bypasses Cloudflare JS challenge)
 * @param {string} baseUrl Base URL to scrape
 * @param {Array<string>} pages List of page paths to scrape
 * @param {string} folder Output folder to save JSON
 */
async function saveData(baseUrl, pages, folder) {
	intro(chalk.cyanBright(`🌍 Started Scraping ${baseUrl}`));

	const outputDir = path.resolve(process.cwd(), folder);

	if (!fs.existsSync(outputDir)) {
		fs.mkdirSync(outputDir);
		mimicClack(chalk.yellowBright(`📂 Created folder "${folder}"`), true);
	}

	const s = spinner();

	for (const page of pages) {
		const pageUrl = `${baseUrl}${page}`;
		s.start(chalk.green(`🧭 Fetching ${pageUrl}`));

		try {
			// cloudscraper will automatically solve CF JS challenge
			const html = await cloudscraper.get(pageUrl, {
				headers: {
					'User-Agent':
						'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.0 Safari/537.36',
					'Accept-Language': 'en-US,en;q=0.9',
				},
			});

			// Use cheerio to parse HTML content
			const $ = load(html);

			const title = $('.mw-page-title-main').text().trim() || 'Unknown Title';

			/** @type {Array<{ title: string; content: string }>} */
			const results = [];

			const sections = $('section.citizen-section').toArray();
			const headings = $('h2.citizen-section-heading').toArray();

			if (sections.length > 0) {
				results.push({
					title: 'Intro',
					content: $(sections[0]).text().trim(),
				});
			}

			headings.forEach((heading, idx) => {
				const sectionContent = sections[idx + 1];
				if (sectionContent) {
					results.push({
						title: $(heading).text().trim(),
						content: $(sectionContent).text().trim(),
					});
				}
			});

			const pageData = { title, content: results };

			const pageFileName = path.join(outputDir, `${page}.json`);
			fs.writeFileSync(pageFileName, JSON.stringify(pageData, null, 2));

			s.stop(`💾 Saved: ${pageFileName}`);
		} catch (error) {
			mimicClack(
				chalk.redBright(
					`🛑 Error fetching ${page}:`,
					error instanceof Error ? error.message : 'Unknown error'
				),
				true
			);
		}

		await delay(3000);
	}

	outro(chalk.blueBright('🐸 Scraping Completed!'));
}

saveData(baseUrl, pages, 'json').catch(console.error);
