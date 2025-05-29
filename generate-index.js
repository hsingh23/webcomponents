const fs = require('fs').promises;
const path = require('path');

async function generateDemosJson() {
  const demosDir = path.join(__dirname, 'demos');
  const outputDir = path.join(__dirname, 'public', 'data');
  const outputFile = path.join(outputDir, 'demos.json');

  try {
    await fs.mkdir(outputDir, { recursive: true }); // Ensure public/data directory exists
  } catch (error) {
    console.error('Error creating output directory:', error);
    process.exit(1);
  }

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
  let demos = []; // Changed from cardsHtml to an array

  for (const file of htmlFiles) {
    const filePath = path.join(demosDir, file); // Corrected path for reading file
    const demoRelativePath = path.join('demos', file); // Path for iframe src and fetching
    const name = path.basename(file, '.html').replace('!', '');
    const isFeatured = file.endsWith('!.html');
    // const cardClass = isFeatured ? 'card featured' : 'card'; // No longer needed here

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

    demos.push({ // Add demo object to array
        file: demoRelativePath,
        title: name,
        docs: escapedDocsContent,
        featured: isFeatured
    });
  }

  if (htmlFiles.length === 0 && files.length > 0) {
    console.warn("No .html files found in the 'demos' directory. The index page will be empty.");
  } else if (htmlFiles.length === 0) {
    console.info("The 'demos' directory is empty. The index page will be empty.");
  }

  try {
    await fs.writeFile(outputFile, JSON.stringify(demos, null, 2));
    console.log(`demos.json has been generated successfully at ${outputFile}`);
  } catch (error) {
    console.error('Error writing demos.json:', error);
    process.exit(1);
  }
}

generateDemosJson().catch(err => { // Renamed function call
    console.error("Failed to generate demos.json:", err);
    process.exit(1);
});
