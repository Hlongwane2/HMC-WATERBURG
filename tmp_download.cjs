const https = require('https');
const fs = require('fs');

const file = fs.createWriteStream('./public/bible.json');
https.get('https://raw.githubusercontent.com/thiagobodruk/bible/master/json/en_bbe.json', (response) => {
  response.pipe(file);
  file.on('finish', () => {
    file.close();
    console.log('Download Completed');
    const data = JSON.parse(fs.readFileSync('./public/bible.json', 'utf8'));
    console.log('Parsed successfully. Books:', data.length);
    console.log('First book:', data[0].name, '- First verse:', data[0].chapters[0][0]);
  });
}).on("error", (err) => {
  console.log("Error: " + err.message);
});
