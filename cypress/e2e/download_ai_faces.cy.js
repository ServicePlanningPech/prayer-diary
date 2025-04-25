// cypress/e2e/download_ai_faces.cy.js

describe('Download AI-generated faces', () => {
  // Configuration
  const config = {
    imageCount: 100,          // Total number of images to download
    downloadDelay: 3000,      // Delay between downloads in milliseconds (3 seconds)
    savePath: 'ai-faces',     // Subfolder inside fixtures to save the images
    filenamePrefix: 'face',   // Prefix for the filenames
    website: 'https://thispersondoesnotexist.com/'
  };

  // Create the save directory if it doesn't exist
  //before(() => {
  //  cy.task('ensureDir', `cypress/fixtures/${config.savePath}`);
  //});

  // Initial test to verify image downloading works
  it('verifies the image download process works', () => {
    // Use cy.request instead of cy.visit since the site returns an image directly
    cy.request({
      url: config.website,
      encoding: 'binary',
      headers: {
        'Accept': 'image/jpeg'
      }
    }).then((response) => {
      // Verify we got an image
      expect(response.headers['content-type']).to.include('image/jpeg');
      cy.log('Successfully received an image from the website');
      
      // Save the first image as a test
      const paddedIndex = '000';
      const filename = `${config.filenamePrefix}_${paddedIndex}.jpg`;
      
      cy.task('downloadBinaryImage', {
        binaryData: response.body,
        filename: `${config.savePath}/${filename}`
      });
      
      cy.log(`Saved test image as ${filename}`);
    });
  });

  // Download images in batches to avoid overwhelming the browser
  // Breaking into smaller batches of 10 images each
  const batchSize = 10;
  const batches = Math.ceil(config.imageCount / batchSize);

  for (let batchIndex = 0; batchIndex < batches; batchIndex++) {
    it(`downloads batch ${batchIndex + 1} of ${batches} AI-generated faces`, () => {
      const startIndex = batchIndex * batchSize;
      const endIndex = Math.min(startIndex + batchSize, config.imageCount);
      
      // Process each image in the batch
      for (let i = startIndex; i < endIndex; i++) {
        // Generate a timestamped URL to bypass caching
        const timestamp = new Date().getTime();
        const url = `${config.website}?t=${timestamp}&i=${i}`;
        
        // Request the image directly
        cy.request({
          url: url,
          encoding: 'binary',
          headers: {
            'Accept': 'image/jpeg'
          }
        }).then((response) => {
          // Verify we got an image
          expect(response.headers['content-type']).to.include('image/jpeg');
          
          // Generate filename with padding for sorting (001, 002, etc.)
          const paddedIndex = String(i + 1).padStart(3, '0');
          const filename = `${config.filenamePrefix}_${paddedIndex}.jpg`;
          
          // Log the download
          cy.log(`Downloading image ${i + 1}/${config.imageCount} as ${filename}`);
          
          // Download the binary image using the Cypress task
          cy.task('downloadBinaryImage', {
            binaryData: response.body,
            filename: `${config.savePath}/${filename}`
          });
        });
        
        // Random delay variation to make it more natural
        const randomDelay = config.downloadDelay + Math.floor(Math.random() * 1000);
        cy.wait(randomDelay);
      }
    });
  }

  // Summary test
  it('summarizes the download process', () => {
    cy.log(`Download process complete. Attempted to download ${config.imageCount} images.`);
    cy.log(`Images should be saved in: cypress/fixtures/${config.savePath}/`);
  });
});