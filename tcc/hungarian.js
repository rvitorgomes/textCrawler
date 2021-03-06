'use strict';

const Nightmare = require('nightmare');
const fs = require('fs');

const nightmare = Nightmare();

// Filters an array return the uniq values
const uniq = require('lodash/uniq');

// Makes an array 1-d [[1,2,3],[[4,5],6]] to [1,2,3,4,5,6]
const flattenDeep = require('lodash/flattenDeep');

// Grab all links from homepage cards
async function fetchHomePageLinks(url) {

	const links = await nightmare.goto(url)
		.scrollTo(999999999, 0)
		.wait(1000)
		.evaluate(() => new Array(...document.querySelectorAll('li.item a.ui_link')).map(el => [ el.href ]))
		.catch(err => (console.log(err), []));

	return uniq(flattenDeep(links));
}

// Grab the post links from recommendation page  
async function fetchFilterPageLinks(url) {

	const links = await nightmare.goto(url)
		.scrollTo(999999999, 0)
		.wait(1000)
		.evaluate(() => new Array(...document.querySelectorAll('a.property_title')).map(el => [ el.href ]))
		.catch(err => (console.log(err), []));

	return uniq(flattenDeep(links));
}

// Grab the texts from the a review post page
async function fetchPagePosts(url) {

	return await nightmare.goto(url)
		.wait('body')
		// clicking on more
		.click('div.review-container p.partial_entry span.ulBlueLinks:first-child')
		.scrollTo(999999999, 0)
		// waiting the content load after clicking
		.wait(500)
		.evaluate(() => new Array(...document.querySelectorAll('p.partial_entry')).map(el => ({
			title: document.title, text: el.innerText, link: document.URL, source: 'tripadvisorhu'
		})))
		// .catch(err => (console.log(err), []));
		.catch(err => []);
}

/* Steps
*  1. Grab the links on homepage cards
*  2. The card links go for a list of recommended reviews
*  3. Grab the list of review post pages
*  4. Go for the review post page and grab the posts
*/ 
async function crawler(baseURL) {
	console.log('getting the homepage links...');

	const t0 = Date.now();
	const links = await fetchHomePageLinks(baseURL);
	let DATASET = [];
	let PAGES = [];
	console.log(`Got ${links.length} links, now grab the pages`);

	for (let i = 0; i < links.length; i++) {
		const url = links[i];

		const pages = await fetchFilterPageLinks(url);

		PAGES.push(...pages);
		console.log(`Parsed ${i+1} of ${links.length}`);
		console.log(`${PAGES.length} Pages so far...`);
	}

	for (let j = 0; j < PAGES.length; j++) {
		const url = PAGES[j];
		const data = await fetchPagePosts(url);

		DATASET.push(...data);
		console.log(`Parsing ${j+1} of ${PAGES.length}`);
	}

	console.log('TOTAL PAGES TO BE CRAWLED', PAGES.length);


	fs.appendFile('hungarian.txt', JSON.stringify(DATASET, null, 1), (err) => {
		if (err) throw err;
		const t1 = Date.now();
		console.log(`${DATASET.length} posts`);
		console.log(`${PAGES.length} pages`);
		console.log(`Total time: ${((t1 - t0) / 60 / 1000)} minutes`);
	});

	await nightmare.end();
	console.log('DONE');
	process.exit();

}

crawler('https://www.tripadvisor.co.hu');