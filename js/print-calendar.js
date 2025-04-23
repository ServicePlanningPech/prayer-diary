// Print Calendar Module - Handles PDF generation of prayer calendar

// Initialize the printing module
document.addEventListener('DOMContentLoaded', function() {
    // Add event listener for the print calendar menu item
    const printCalendarMenuItem = document.getElementById('nav-print-calendar');
    if (printCalendarMenuItem) {
        printCalendarMenuItem.addEventListener('click', function() {
            showView('print-calendar-view');
            initPrintCalendarView();
        });
    }
    
    // Add event listeners for the print options form
    const dateRangeSelect = document.getElementById('print-date-range');
    if (dateRangeSelect) {
        dateRangeSelect.addEventListener('change', function() {
            if (this.value === 'custom') {
                document.getElementById('custom-date-range').classList.remove('d-none');
            } else {
                document.getElementById('custom-date-range').classList.add('d-none');
            }
        });
    }
    
    // Preview button event listener
    const previewBtn = document.getElementById('preview-pdf-btn');
    if (previewBtn) {
        previewBtn.addEventListener('click', function() {
            generatePreview();
        });
    }
    
    // Generate PDF button event listener
    const generateBtn = document.getElementById('generate-pdf-btn');
    if (generateBtn) {
        generateBtn.addEventListener('click', function() {
            generatePDF();
        });
    }
});

// Initialize the print calendar view
async function initPrintCalendarView() {
    // Set default dates
    const today = new Date();
    
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    const startDateInput = document.getElementById('print-start-date');
    const endDateInput = document.getElementById('print-end-date');
    
    if (startDateInput) {
        startDateInput.valueAsDate = startOfMonth;
    }
    
    if (endDateInput) {
        endDateInput.valueAsDate = endOfMonth;
    }
    
    // Generate a preview based on current month
    generatePreview();
}

// Generate a preview of the prayer calendar
async function generatePreview() {
    const previewContainer = document.getElementById('print-preview-container');
    if (!previewContainer) return;
    
    // Show loading indicator
    previewContainer.innerHTML = `
        <div class="text-center my-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-2">Generating preview...</p>
        </div>
    `;
    
    try {
        // Get the prayer cards based on the selected options
        const prayerCards = await getPrayerCards();
        
        // If no prayer cards found
        if (!prayerCards || prayerCards.length === 0) {
            previewContainer.innerHTML = `
                <div class="alert alert-info">
                    <h5>No prayer cards found</h5>
                    <p>No prayer cards found for the selected date range.</p>
                    <p>Try selecting a different date range or check that users have been assigned to days in the Prayer Calendar management.</p>
                </div>
            `;
            return;
        }
        
        // Generate the preview HTML
        const cardsPerPage = parseInt(document.getElementById('print-layout').value) || 2;
        const previewHTML = generatePrintHTML([prayerCards[0]].concat(prayerCards.length > 1 ? [prayerCards[1]] : []), cardsPerPage);
        
        // Base URL for resolving relative paths
        const baseURL = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1);
        
        // Create the preview with only the first page
        previewContainer.innerHTML = `
            <div class="alert alert-info mb-3">
                <strong>Preview:</strong> Showing sample with ${Math.min(prayerCards.length, cardsPerPage)} of ${prayerCards.length} prayer cards. 
                The complete calendar will have ${Math.ceil(prayerCards.length / cardsPerPage)} pages.
            </div>
            <div class="border p-3" style="background-color: #f8f9fa;">
                <iframe id="preview-iframe" style="width: 100%; height: 500px; border: 1px solid #ddd; transform: scale(0.8); transform-origin: top center;" frameborder="0"></iframe>
            </div>
        `;
        
        // Get the iframe and write content to it
        const previewIframe = document.getElementById('preview-iframe');
        const iframeDoc = previewIframe.contentDocument || previewIframe.contentWindow.document;
        
        iframeDoc.open();
        iframeDoc.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Prayer Calendar Preview</title>
                <base href="${baseURL}">
                <style>
                    body {
                        margin: 0;
                        padding: 0;
                        font-family: Arial, sans-serif;
                        background-color: white;
                    }
                    .print-page {
                        width: 148mm;
                        height: 210mm;
                        padding: 10mm;
                        margin: 0 auto;
                        border: 1px solid #ddd;
                        background-color: white;
                        box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                        position: relative;
                    }
                    .print-prayer-card {
                        display: flex;
                        flex-direction: column;
                        margin-bottom: 5mm;
                        padding-bottom: 5mm;
                        border-bottom: 1px dashed #ccc;
                    }
                    .print-prayer-card:last-child {
                        border-bottom: none;
                        margin-bottom: 0;
                        padding-bottom: 0;
                    }
                    .print-card-header {
                        margin-bottom: 3mm;
                    }
                    .print-name {
                        font-size: 14pt;
                        font-weight: bold;
                        margin: 0;
                        color: #483D8B;
                    }
                    .print-card-body {
                        display: flex;
                    }
                    .print-image-container {
                        width: 25mm;
                        height: 25mm;
                        margin-right: 5mm;
                        flex-shrink: 0;
                    }
                    .print-profile-image {
                        width: 100%;
                        height: 100%;
                        object-fit: cover;
                        border-radius: 3mm;
                        border: 1px solid #eee;
                    }
                    .print-prayer-points {
                        flex: 1;
                        font-size: 10pt;
                    }
                    .print-prayer-points p {
                        margin-bottom: 0.5rem;
                    }
                    .print-footer {
                        position: absolute;
                        bottom: 5mm;
                        left: 10mm;
                        right: 10mm;
                        text-align: center;
                        font-size: 8pt;
                        color: #999;
                    }
                    .print-date {
                        font-style: italic;
                        color: #666;
                        font-size: 9pt;
                        margin-bottom: 1mm;
                    }
                </style>
                <script>
                    // Fix image loading errors
                    window.addEventListener('load', function() {
                        document.querySelectorAll('img').forEach(img => {
                            img.onerror = function() {
                                this.onerror = null;
                                this.src = 'img/placeholder-profile.png';
                            };
                        });
                    });
                </script>
            </head>
            <body>
                ${previewHTML}
            </body>
            </html>
        `);
        iframeDoc.close();
        
    } catch (error) {
        console.error('Error generating preview:', error);
        previewContainer.innerHTML = `
            <div class="alert alert-danger">
                <h5>Error generating preview</h5>
                <p>${error.message || 'Unknown error'}</p>
                <p>Check the console for more details.</p>
            </div>
        `;
    }
}

// Generate the PDF
async function generatePDF() {
    try {
        // Show loading notification
        const loadingToastId = showToast('Processing', 'Generating prayer calendar PDF...', 'processing');
        
        // Get the prayer cards based on the selected options
        const prayerCards = await getPrayerCards();
        
        // If no prayer cards found
        if (!prayerCards || prayerCards.length === 0) {
            dismissToast(loadingToastId);
            showToast('Error', 'No prayer cards found for the selected date range.', 'error');
            return;
        }
        
        // Generate the full HTML for all pages
        const cardsPerPage = parseInt(document.getElementById('print-layout').value) || 2;
        const printHTML = generatePrintHTML(prayerCards, cardsPerPage);
        
        // Create a hidden iframe to prevent conflicts with current page
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        document.body.appendChild(iframe);
        
        // Base URL for resolving relative paths
        const baseURL = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1);
        console.log("Base URL for resources:", baseURL);
        
        // Write the HTML to the iframe
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        iframeDoc.open();
        iframeDoc.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Prayer Calendar</title>
                <base href="${baseURL}">
                <style>
                    @page {
                        size: A5;
                        margin: 0;
                    }
                    body {
                        margin: 0;
                        padding: 0;
                        font-family: Arial, sans-serif;
                    }
                    .print-page {
                        width: 148mm;
                        height: 210mm;
                        padding: 10mm;
                        margin: 0;
                        page-break-after: always;
                        position: relative;
                        box-sizing: border-box;
                    }
                    .print-prayer-card {
                        display: flex;
                        flex-direction: column;
                        margin-bottom: 5mm;
                        padding-bottom: 5mm;
                        border-bottom: 1px dashed #ccc;
                    }
                    .print-prayer-card:last-child {
                        border-bottom: none;
                        margin-bottom: 0;
                        padding-bottom: 0;
                    }
                    .print-card-header {
                        margin-bottom: 3mm;
                    }
                    .print-name {
                        font-size: 14pt;
                        font-weight: bold;
                        margin: 0;
                        color: #483D8B;
                    }
                    .print-card-body {
                        display: flex;
                    }
                    .print-image-container {
                        width: 25mm;
                        height: 25mm;
                        margin-right: 5mm;
                        flex-shrink: 0;
                    }
                    .print-profile-image {
                        width: 100%;
                        height: 100%;
                        border-radius: 3mm;
                        border: 1px solid #eee;
                        object-fit: cover;
                    }
                    .print-prayer-points {
                        flex: 1;
                        font-size: 10pt;
                    }
                    .print-prayer-points p {
                        margin-bottom: 0.5rem;
                    }
                    .print-footer {
                        position: absolute;
                        bottom: 5mm;
                        left: 10mm;
                        right: 10mm;
                        text-align: center;
                        font-size: 8pt;
                        color: #999;
                    }
                    .print-date {
                        font-style: italic;
                        color: #666;
                        font-size: 9pt;
                        margin-bottom: 1mm;
                    }
                </style>
                <script>
                    // Helper function to fix image loading errors
                    function handleImageError(img) {
                        console.log('Image failed to load:', img.src);
                        img.src = 'img/placeholder-profile.png';
                    }
                    
                    // Log when content is loaded
                    window.addEventListener('DOMContentLoaded', function() {
                        console.log('Print content loaded successfully');
                        
                        // Fix any broken images
                        document.querySelectorAll('.print-profile-image').forEach(img => {
                            img.onerror = function() { handleImageError(this); };
                        });
                        
                        // Signal that content is ready
                        if (window.parent) {
                            window.parent.postMessage('printContentReady', '*');
                        }
                    });
                </script>
            </head>
            <body>
                ${printHTML}
            </body>
            </html>
        `);
        iframeDoc.close();
        
        // Message handler for when content is ready
        window.addEventListener('message', function printHandler(event) {
            if (event.data === 'printContentReady') {
                // Remove the message handler to avoid duplicates
                window.removeEventListener('message', printHandler);
                
                // Wait a bit more to ensure images are loaded
                setTimeout(() => {
                    try {
                        dismissToast(loadingToastId);
                        // Print the iframe
                        iframe.contentWindow.print();
                        
                        // Show success notification
                        showToast('Success', 'Prayer calendar generated successfully.', 'success');
                        
                        // Remove the iframe after printing (or after a timeout if print is cancelled)
                        setTimeout(() => {
                            document.body.removeChild(iframe);
                        }, 1000);
                    } catch (printError) {
                        console.error('Error during print operation:', printError);
                        dismissToast(loadingToastId);
                        showToast('Error', 'Failed to open print dialog. Please try again.', 'error');
                        document.body.removeChild(iframe);
                    }
                }, 500);
            }
        });
        
        // Also set a timeout in case the message event doesn't fire
        setTimeout(() => {
            try {
                dismissToast(loadingToastId);
                // Print the iframe
                iframe.contentWindow.print();
                // Show success notification
                showToast('Success', 'Prayer calendar generated successfully.', 'success');
            } catch (e) {
                console.error('Error during fallback print operation:', e);
                dismissToast(loadingToastId);
                showToast('Error', 'Failed to open print dialog. Please try again.', 'error');
            }
            
            // Remove the iframe after a delay
            setTimeout(() => {
                if (document.body.contains(iframe)) {
                    document.body.removeChild(iframe);
                }
            }, 1000);
        }, 3000); // Fallback timeout after 3 seconds
        
    } catch (error) {
        console.error('Error generating PDF:', error);
        showToast('Error', `Error generating PDF: ${error.message}`, 'error');
    }
}

// Get prayer cards based on the selected options
async function getPrayerCards() {
    // Wait for auth stability
    await window.waitForAuthStability();
    
    // Get the selected date range
    const dateRange = document.getElementById('print-date-range').value;
    let startDate, endDate;
    
    if (dateRange === 'current-month') {
        // Current month
        const today = new Date();
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    } else if (dateRange === 'custom') {
        // Custom date range
        startDate = document.getElementById('print-start-date').valueAsDate;
        endDate = document.getElementById('print-end-date').valueAsDate;
    } else {
        // All prayer cards (no date filtering)
        startDate = null;
        endDate = null;
    }
    
    try {
        console.log("Fetching prayer cards for date range:", 
            startDate ? startDate.toISOString() : "All", 
            endDate ? endDate.toISOString() : "All");
        
        // Get all approved profiles regardless of day assignment
        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, full_name, profile_image_url, prayer_points, pray_day')
            .eq('approval_state', 'Approved');
            
        if (profilesError) {
            console.error("Error fetching profiles:", profilesError);
            throw profilesError;
        }
        
        console.log(`Fetched ${profiles.length} profiles`);
        
        // Filter profiles based on date range if specified
        let prayerCards = [];
        
        if (dateRange === 'all') {
            // Include all profiles with prayer points
            prayerCards = profiles.map(profile => ({
                id: profile.id,
                name: profile.full_name,
                prayerPoints: profile.prayer_points || 'No prayer points provided.',
                profileImage: profile.profile_image_url,
                day: profile.pray_day || null
            }));
        } else {
            // Filter profiles by day
            // For date range, we want profiles where pray_day falls within the range
            const startDay = startDate ? startDate.getDate() : 1;
            const endDay = endDate ? endDate.getDate() : 31;
            
            console.log(`Filtering for days ${startDay} to ${endDay}`);
            
            // Get profiles with pray_day in the range
            prayerCards = profiles
                .filter(profile => {
                    const day = profile.pray_day || 0;
                    return day >= startDay && day <= endDay;
                })
                .map(profile => ({
                    id: profile.id,
                    name: profile.full_name,
                    prayerPoints: profile.prayer_points || 'No prayer points provided.',
                    profileImage: profile.profile_image_url,
                    day: profile.pray_day
                }));
        }
        
        console.log(`Found ${prayerCards.length} prayer cards after filtering`);
        return prayerCards;
    } catch (error) {
        console.error('Error fetching prayer cards:', error);
        throw error;
    }
}

// Generate the HTML for the printable pages
function generatePrintHTML(prayerCards, cardsPerPage) {
    // Sort cards by day if available
    prayerCards.sort((a, b) => {
        if (a.day === null && b.day === null) return 0;
        if (a.day === null) return 1;
        if (b.day === null) return -1;
        return a.day - b.day;
    });
    
    let html = '';
    const pageCount = Math.ceil(prayerCards.length / cardsPerPage);
    
    // Current date for footer
    const today = new Date();
    const dateStr = today.toLocaleDateString(undefined, { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    // Create pages
    for (let i = 0; i < pageCount; i++) {
        // Start a new page
        html += `<div class="print-page">`;
        
        // Add cards to this page
        for (let j = 0; j < cardsPerPage; j++) {
            const cardIndex = i * cardsPerPage + j;
            
            // Break if we've reached the end of the cards
            if (cardIndex >= prayerCards.length) break;
            
            const card = prayerCards[cardIndex];
            
            // Default image if none provided
            const imageUrl = card.profileImage || 'img/placeholder-profile.png';
            
            // Format prayer points - handle different data structures
            let formattedPrayerPoints = '';
            if (card.prayerPoints) {
                // If content is already HTML, keep it as is
                if (card.prayerPoints.includes('<')) {
                    formattedPrayerPoints = card.prayerPoints;
                } else {
                    // Otherwise format as paragraphs
                    formattedPrayerPoints = card.prayerPoints
                        .split('\n')
                        .filter(line => line.trim())
                        .map(line => `<p>${line}</p>`)
                        .join('');
                }
            } else {
                formattedPrayerPoints = '<p>No prayer points provided.</p>';
            }
            
            // Add day information if available
            let dayInfo = '';
            if (card.day) {
                dayInfo = `<div class="print-date">Day ${card.day} of the month</div>`;
            }
            
            // Add the card
            html += `
                <div class="print-prayer-card">
                    <div class="print-card-header">
                        <h3 class="print-name">${card.name}</h3>
                        ${dayInfo}
                    </div>
                    <div class="print-card-body">
                        <div class="print-image-container">
                            <img src="${imageUrl}" class="print-profile-image" alt="${card.name}" 
                                 onerror="this.onerror=null; this.src='img/placeholder-profile.png';">
                        </div>
                        <div class="print-prayer-points">
                            ${formattedPrayerPoints}
                        </div>
                    </div>
                </div>
            `;
        }
        
        // Add page footer
        html += `
            <div class="print-footer">
                Prayer Diary - Generated on ${dateStr} - Page ${i + 1} of ${pageCount}
            </div>
        </div><!-- End of print page -->
        `;
    }
    
    return html;
}