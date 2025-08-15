import { intro, outro, spinner } from '@clack/prompts';
import chalk from 'chalk';
import { config } from 'dotenv';
import fs from 'fs';
import { slugifyString } from 'nhb-toolbox';
import path from 'path';
import { mimicClack } from './lib/clack.mjs';
import { baseUrl, pages } from './lib/constants.mjs';
import { delay } from './lib/helpers.mjs';
import { launchBrowser } from './lib/puppeteer.mjs';

config({ path: path.join(process.cwd(), '.env'), quiet: true });

/**
 *
 * @param {string} baseUrl
 * @param {Array<string>} pages
 * @param {string} folder
 */
async function saveData(baseUrl, pages, folder) {
	intro(chalk.cyanBright(`🌍 Started Scrapping ${baseUrl}`));

	const Browser = await launchBrowser();

	const outputDir = path.resolve(process.cwd(), folder);

	if (!fs.existsSync(outputDir)) {
		fs.mkdirSync(outputDir);
		mimicClack(chalk.yellowBright(`📂 Create folder "${folder}"`), true);
	}

	const COOKIE = /** @type {string} */ (process.env.COOKIES);

	const s = spinner();

	for (const page of pages.filter((p) => !p.includes('"'))) {
		const pageUrl = `${baseUrl}${page}`;

		s.start(chalk.green(`🧭 Navigating to ${pageUrl}`));

		const pageFileName = path.join(outputDir, `${slugifyString(page)}.json`);

		const pageInstance = await Browser.newPage();

		try {
			await pageInstance.goto('https://tolkiengateway.net', {
				waitUntil: 'networkidle2',
				timeout: 60000,
			});

			await pageInstance.setUserAgent(
				'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0'
			);

			await pageInstance.setExtraHTTPHeaders({
				// 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0',
				Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
				'Accept-Language': 'en-US,en;q=0.9,en-GB;q=0.8,bn;q=0.7',
				Referer: 'https://tolkiengateway.net/wiki/Main_Page',
				Origin: 'https://tolkiengateway.net',
				Connection: 'keep-alive',
				Cookie: COOKIE,
			});

			await pageInstance.setViewport({ width: 1920, height: 1080 });

			await pageInstance.goto(pageUrl, {
				waitUntil: 'domcontentloaded',
				timeout: 60000,
			});

			const pageTitle =
				(await pageInstance.$('title')) ? await pageInstance.title() : null;

			if (pageTitle?.includes('Just a moment')) {
				const s2 = spinner();

				s2.start(chalk.yellow('⏳ Challenge detected, waiting for it to pass'));
				const result = await pageInstance.waitForNavigation({
					waitUntil: 'networkidle2',
					timeout: 300000,
				});

				if (!result?.ok) return;

				s2.stop(chalk.green('⏳ Challenge passed!'));
			}

			await pageInstance.waitForSelector('#mw-content-text', { timeout: 20000 });

			// Extract the title from the h1 element
			const title = await pageInstance.evaluate(() => {
				/** @type {HTMLElement | null} */
				const titleElement = document.querySelector('.mw-page-title-main');
				return titleElement ? titleElement.innerText.trim() : 'Unknown Title';
			});

			// Scrape the main content
			const content = await pageInstance.evaluate(() => {
				/** @type {NodeListOf<HTMLElement>} */
				const sections = document.querySelectorAll('section.citizen-section');
				/** @type {NodeListOf<HTMLElement>} */
				const headings = document.querySelectorAll('h2.citizen-section-heading');

				const results = [];
				if (sections.length > 0) {
					results.push({
						title: 'Intro',
						content: sections[0].innerText.trim(),
					});
				}

				headings.forEach((heading, index) => {
					const sectionContent = sections[index + 1];
					if (sectionContent) {
						results.push({
							title: heading.innerText.trim(),
							content: sectionContent.innerText.trim(),
						});
					}
				});

				return results;
			});

			// Add the title at the beginning of the JSON data
			const pageData = { title, content };

			// Save the JSON data with the title
			fs.writeFileSync(pageFileName, JSON.stringify(pageData, null, 2));
			s.stop(`💾 Saved: ${pageFileName}`);
		} catch (error) {
			mimicClack(
				chalk.redBright(
					`🛑 Error scraping ${page}:`,
					error instanceof Error ? error?.message : ' -_-'
				),
				true
			);

			const html = await pageInstance.content();

			const htmlFolder = path.resolve(process.cwd(), 'html');

			if (!fs.existsSync(htmlFolder)) {
				fs.mkdirSync(htmlFolder);
			}

			fs.writeFileSync(path.join(htmlFolder, `${slugifyString(page)}.html`), html);
		} finally {
			await pageInstance.close();
			await delay(3000);
		}
	}

	await Browser.close();
	outro(chalk.blueBright('🐸 Scrapping Completed!'));
}

saveData(baseUrl, pages, 'json').catch(console.dir);
