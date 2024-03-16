const prompt = (question) => new Promise((res) => {
    const readLine = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    });
    readLine.question(question, name => {
        readLine.close();
        res(name);
    });
});

let picture = 1;

const debug = async (page, text) => {
    if (!debug.IS_DEBUGGING) return;
    console.log("[DEBUG]", picture, text);
    await page.screenshot({ path: `./picture${picture++}.png`, type: 'png' });
}
debug.IS_DEBUGGING = false;

module.exports = { prompt, debug };
