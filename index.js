const puppeteer = require("puppeteer-extra");
const AmazonCaptchaPlugin = require("@mihnea.dev/puppeteer-extra-amazon-captcha").default();
const { prompt, debug } = require("./utils");

puppeteer.use(AmazonCaptchaPlugin);

debug.IS_DEBUGGING = false; // Set to true to enable screenshots and debug logs in console

const main = async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();

  const navigationComplete = () => page.waitForNavigation({ waitUntil: "load" });

  console.log("Solving captcha...");
  await page.goto("https://www.amazon.com/errors/validateCaptcha");
  debug(page, "Goto Captcha URL");

  await page
    .waitForFunction(() => !window.location.href.includes("error"))
    .catch(() => {
      throw new Error("Couldn't solve captcha, try again!");
    });
  console.log("Captcha solved!");
  await Promise.all([page.goto("https://amazon.com"), navigationComplete()]);

  console.log("Loading Amazon Website...");
  debug(page, "Goto URL");
  try {
    debug(page, "Wait for location popover link");
    await page.waitForSelector("#nav-global-location-popover-link", {
      visible: true,
      timeout: 500,
    });
    await page.click("#nav-global-location-popover-link");
  } catch (error) {
    console.error("Falha ao clicar no botão primeiro botão.", error);
    await page.goto("https://amazon.com");
    await navigationComplete();

    debug(page, "Goto URL again if failed to click");
    await page.waitForSelector("#nav-global-location-popover-link", {
      visible: true,
    });
    await page.click("#nav-global-location-popover-link");
  }
  debug(page, "Click on location popover link");

  await page.waitForSelector("#GLUXZipUpdateInput", { visible: true });
  await page.type("#GLUXZipUpdateInput", "11001", { delay: 50 });
  debug(page, "Zip code typed");

  await page.waitForSelector("#GLUXZipUpdate", { visible: true, timeout: 500 });
  await page.click("#GLUXZipUpdate");
  await page.waitForSelector(".a-popover-footer #GLUXConfirmClose", {
    visible: true,
    timeout: 500,
  });
  debug(page, "Update zip code button clicked");

  await page.click(".a-popover-footer #GLUXConfirmClose");
  debug(page, "Closing confirm dialog");

  await navigationComplete();
  debug(page, "Wait for navigation complete");

  const keyword = await prompt("What is the product you want to search for?\n");
  await page.waitForSelector("#twotabsearchtextbox");
  await page.type("#twotabsearchtextbox", keyword);
  debug(page, `Write ${keyword} in search box`);
  console.log("Searching for '" + keyword + "'...");

  await page.waitForSelector("#nav-search-submit-button");
  await page.click("#nav-search-submit-button");
  debug(page, "Click on search button");

  await navigationComplete();
  debug(page, "Wait for navigation complete");

  await page.evaluate(() => {
    const firstNonSponsored = [...document.querySelectorAll('div[data-cy="title-recipe"]')].filter(
      (e) => !e.querySelector(".puis-sponsored-label-text")
    )[0];
    firstNonSponsored.querySelector("a").click();
  });

  await navigationComplete();
  debug(page, "On first product load");

  const title = await page.$eval("#productTitle", (el) => el.innerText);
  const price = await page.$eval(
    "#corePrice_desktop .a-price .a-offscreen, #corePriceDisplay_desktop_feature_div .priceToPay",
    (el) => el.textContent
  );
  const sales = await page
    .$eval("#socialProofingAsinFaceout_feature_div", (el) => el.innerText)
    .then((s) => s || "No information available")
    .catch(() => "No information available");
  const reviews = await page.$eval("#acrCustomerReviewText", (el) => el.innerText).catch(() => "No reviews available");
  const rating = await page.$eval("#acrPopover a > span", (el) => el.innerText).catch(() => "No rating available");
  const aboutThis = await page
    .$$eval("#feature-bullets ul li, #productFactsDesktopExpander ul li", (elements) =>
      elements.map((el) => el.innerText)
    )
    .catch(() => []);

  console.log("Title:", title);
  console.log("Price:", price);
  console.log("Sales:", sales);
  console.log("Reviews:", reviews);
  console.log("Rating:", rating);
  console.log("About this item:");
  aboutThis.forEach((bullet) => console.log(" - ", bullet));

  await browser.close();
};

main();
