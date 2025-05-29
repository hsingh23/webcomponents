const fs = require('fs').promises;
const path = require('path');

async function generateIndex() {
  const demosDir = path.join(__dirname, 'demos');
  let files;
  try {
    files = await fs.readdir(demosDir);
  } catch (error)
    {
    // If the demos directory doesn't exist, create it and inform the user.
    if (error.code === 'ENOENT') {
        console.warn(`Demos directory '${demosDir}' not found. Creating it. Please add your HTML demo files there.`);
        await fs.mkdir(demosDir, { recursive: true });
        files = []; // No files to process yet
    } else {
        console.error('Error reading the demos directory:', error);
        process.exit(1); // Exit if there's a critical error
    }
  }

  const htmlFiles = files.filter(file => file.endsWith('.html'));
  let cardsHtml = '';

  for (const file of htmlFiles) {
    const filePath = path.join(demosDir, file); // Corrected path for reading file
    const demoRelativePath = path.join('demos', file); // Path for iframe src and fetching
    const name = path.basename(file, '.html').replace('!', '');
    const isFeatured = file.endsWith('!.html');
    const cardClass = isFeatured ? 'card featured' : 'card';

    let fileContent = '';
    let docsContent = '';
    try {
      fileContent = await fs.readFile(filePath, 'utf-8');
      // Extract documentation from <!--docs ... -->
      const docsRegex = /<!--docs([\s\S]*?)-->/m;
      const match = fileContent.match(docsRegex);
      if (match && match[1]) {
        docsContent = match[1].trim();
      }
    } catch (readError) {
      console.warn(`Could not read file: ${filePath}. Error: ${readError.message}`);
      // Decide if you want to skip this file or create a card with an error message
      // For now, we'll skip creating a card for unreadable files to avoid broken entries
      continue;
    }

    // Escape HTML characters in docsContent to prevent XSS if rendered as HTML directly
    // For <pre><code>, escaping is generally a good practice
    const escapedDocsContent = docsContent
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    cardsHtml += `
      <div class="${cardClass}" data-file="${demoRelativePath}" data-title="${name}" data-docs="${escapedDocsContent}">
        <h3>${name}</h3>
      </div>
    `;
  }

  if (htmlFiles.length === 0 && files.length > 0) {
    console.warn("No .html files found in the 'demos' directory. The index page will be empty.");
  } else if (htmlFiles.length === 0) {
    console.info("The 'demos' directory is empty. The index page will be empty.");
  }


  const template = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bento Grid Demos</title>
    <link rel="stylesheet" href="style.css">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body>
    <header class="site-header">
        <h1>Webcomponent Hub</h1>
        <p>Explore various pure HTML CSS JS demos created as webcomponents and use as neeeded.</p>
    </header>
    <div class="grid-container">
        ${cardsHtml || '<p class="empty-message">No demos available. Add HTML files to the "demos" folder.</p>'}
    </div>

    <div id="modal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2 id="modal-title"></h2>
                <button id="close-button" class="close-button" aria-label="Close modal">&times;</button>
            </div>
            <div class="modal-body">
                <div class="tabs">
                    <button class="tab-link active" onclick="openTab(event, 'demo-tab')">Demo</button>
                    <button class="tab-link" onclick="openTab(event, 'code-tab')">Source Code</button>
                    <button class="tab-link" id="docs-tab-button" onclick="openTab(event, 'docs-content-tab')" style="display:none;">Docs</button>
                </div>
                <div id="demo-tab" class="tab-content" style="display: block;">
                    <iframe id="modal-iframe" src="" title="Demo content"></iframe>
                </div>
                <div id="code-tab" class="tab-content">
                    <pre><code id="modal-code"></code></pre>
                </div>
                <div id="docs-content-tab" class="tab-content">
                    <pre><code id="modal-docs"></code></pre>
                </div>
            </div>
        </div>
    </div>
    <script src="script.js"></script>
</body>
</html>`;

  await fs.writeFile('index.html', template);
  console.log('index.html has been generated successfully.');
}

generateIndex().catch(err => {
    console.error("Failed to generate index.html:", err);
    process.exit(1);
});
