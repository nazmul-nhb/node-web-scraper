import { intro, outro, spinner } from '@clack/prompts';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { mimicClack } from './lib/clack.mjs';
import { baseUrl, pages } from './lib/constants.mjs';
import { delay } from './lib/helpers.mjs';
import { launchBrowser } from './lib/puppeteer.mjs';

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

	const pageInstance = await Browser.newPage();

	await pageInstance.goto('https://tolkiengateway.net', {
		waitUntil: 'networkidle2',
		timeout: 60000,
	});

	// After first manual pass
	const cookies = await Browser.cookies();
	fs.writeFileSync('cookies.json', JSON.stringify(cookies));
	/** @type {import('puppeteer').Cookie[]} */
	const savedCookies = JSON.parse(fs.readFileSync('cookies.json', 'utf-8'));
	await Browser.setCookie(...savedCookies);

	const s = spinner();

	for (const page of pages) {
		const pageUrl = `${baseUrl}${page}`;

		s.start(chalk.green(`🧭 Navigating to ${pageUrl}`));

		const pageFileName = path.join(outputDir, `${page}.json`);

		try {
			await pageInstance.setUserAgent(
				'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.' +
					Math.floor(Math.random() * 1000) +
					' Safari/537.36'
			);

			await pageInstance.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });

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
				const titleElement = document.querySelector('.mw-page-title-main');
				return titleElement ? titleElement.textContent.trim() : 'Unknown Title';
			});

			// Scrape the main content
			const content = await pageInstance.evaluate(() => {
				const sections = document.querySelectorAll('section.citizen-section');
				const headings = document.querySelectorAll('h2.citizen-section-heading');

				const results = [];
				if (sections.length > 0) {
					results.push({
						title: 'Intro',
						content: sections[0].textContent.trim(),
					});
				}

				headings.forEach((heading, index) => {
					const sectionContent = sections[index + 1];
					if (sectionContent) {
						results.push({
							title: heading.textContent.trim(),
							content: sectionContent.textContent.trim(),
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

			fs.writeFileSync(path.join(htmlFolder, `${page}.html`), html);
		} finally {
			await pageInstance.close();
			await delay(3000);
		}
	}

	await Browser.close();
	outro(chalk.blueBright('🐸 Scrapping Completed!'));
}

saveData(baseUrl, pages, 'json').catch(console.dir);
