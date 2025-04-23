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
            // Prevent multiple clicks
            if (this.dataset.generating === 'true') {
                return;
            }
            
            this.dataset.generating = 'true';
            this.disabled = true;
            
            // Re-enable after a delay
            setTimeout(() => {
                this.dataset.generating = 'false';
                this.disabled = false;
            }, 5000);
            
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
        
        // Generate the preview HTML - show all cards in preview
        const cardsPerPage = parseInt(document.getElementById('print-layout').value) || 2;
        const previewHTML = generatePrintHTML(prayerCards, cardsPerPage);
        
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
        
        // Get selected font family
        const fontFamily = document.getElementById('print-font-family').value || 'Arial, sans-serif';
        console.log('Selected font family for preview:', fontFamily);
        
        iframeDoc.open();
        iframeDoc.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Prayer Diary Preview</title>
                <base href="${baseURL}">
                <style>
                    :root {
                        --print-font-family: ${fontFamily};
                    }
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
                        padding: 3mm;
                        border-radius: 2mm;
                        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                        background-color: #fff;
                        border: 1px solid #eee;
                    }
                    .print-prayer-card:last-child {
                        margin-bottom: 0;
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
                        width: 35mm;
                        min-height: 30mm;
                        margin-right: 5mm;
                        flex-shrink: 0;
                    }
                    .print-profile-image {
                        width: 100%;
                        min-height: 30mm;
                        object-fit: contain;
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
        const loadingToastId = showToast('Processing', 'Generating prayer diary PDF...', 'processing');
        
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
        
        // Get selected font family
        const fontFamily = document.getElementById('print-font-family').value || 'Arial, sans-serif';
        
        iframeDoc.open();
        iframeDoc.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Prayer Diary</title>
                <base href="${baseURL}">
                <style>
                    :root {
                        --print-font-family: ${fontFamily};
                    }
                    @page {
                        size: 148mm 210mm; /* A5 size in mm */
                        margin: 0mm;
                    }
                    body {
                        margin: 0;
                        padding: 0;
                        font-family: var(--print-font-family, Arial, sans-serif);
                    }
                    .print-page {
                        width: 148mm;
                        height: 210mm;
                        padding: 5mm;
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
                        max-height: 40mm;
                        border-radius: 3mm;
                        border: 1px solid #eee;
                        object-fit: contain;
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
        // Use a flag to track if print has been initiated
        let printInitiated = false;
        
        window.addEventListener('message', function printHandler(event) {
            if (event.data === 'printContentReady' && !printInitiated) {
                // Remove the message handler to avoid duplicates
                window.removeEventListener('message', printHandler);
                
                // Set flag to prevent duplicate printing
                printInitiated = true;
                
                // Wait a bit more to ensure images are loaded
                setTimeout(() => {
                    try {
                        dismissToast(loadingToastId);
                        // Print the iframe
                        iframe.contentWindow.print();
                        
                        // Show success notification
                        showToast('Success', 'Prayer diary generated successfully.', 'success');
                        
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
        
        // Also set a timeout in case the message event doesn't fire, but don't show duplicate toast
        // Use a flag to track if print has been initiated
        let printTimeoutControl = false;
        
        setTimeout(() => {
            if (printTimeoutControl) return; // Skip if already handled by message event
            
            try {
                printTimeoutControl = true;
                dismissToast(loadingToastId);
                // Print the iframe
                iframe.contentWindow.print();
                // Show success notification
                showToast('Success', 'Prayer diary generated successfully.', 'success');
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
            .eq('approval_state', 'Approved')
            .neq('full_name', 'Super Admin'); // Exclude Super Admin
            
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
    
    // Current date for footer
    const today = new Date();
    const dateStr = today.toLocaleDateString(undefined, { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    // Group cards by day
    const cardsByDay = {};
    prayerCards.forEach(card => {
        const day = card.day || 'unassigned';
        if (!cardsByDay[day]) {
            cardsByDay[day] = [];
        }
        cardsByDay[day].push(card);
    });
    
    // Calculate total pages based on groups and cards per page
    let pageCount = 0;
    Object.keys(cardsByDay).forEach(day => {
        pageCount += Math.ceil(cardsByDay[day].length / cardsPerPage);
    });
    
    let currentPage = 1;
    
    // Process each day group
    Object.keys(cardsByDay)
        .sort((a, b) => {
            if (a === 'unassigned') return 1;
            if (b === 'unassigned') return -1;
            return parseInt(a) - parseInt(b);
        })
        .forEach(day => {
            const cardsForDay = cardsByDay[day];
            const dayPageCount = Math.ceil(cardsForDay.length / cardsPerPage);
            
            // Create pages for this day
            for (let i = 0; i < dayPageCount; i++) {
                // Start a new page with day header
                html += `<div class="print-page">`;
                
                // Add day header if it's a numbered day
                if (day !== 'unassigned') {
                    html += `<h2 style="text-align: center; margin-bottom: 5mm; color: #483D8B;">Day ${day}</h2>`;
                }
                
                // Add cards to this page
                for (let j = 0; j < cardsPerPage; j++) {
                    const cardIndex = i * cardsPerPage + j;
                    
                    // Break if we've reached the end of the cards for this day
                    if (cardIndex >= cardsForDay.length) break;
                    
                    const card = cardsForDay[cardIndex];
                    
                    // Default image if none provided
                    const imageUrl = card.profileImage || 'img/placeholder-profile.png';
                    
                    // Format prayer points - handle different data structures
                    let formattedPrayerPoints = '';
                    if (card.prayerPoints && card.prayerPoints !== 'No prayer points provided.') {
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
                    }
                    
                    // Add the card
                    html += `
                        <div class="print-prayer-card">
                            <div class="print-card-header">
                                <h3 class="print-name">${card.name}</h3>
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
                        Prayer Diary - Generated on ${dateStr} - Page ${currentPage} of ${pageCount}
                    </div>
                </div><!-- End of print page -->
                `;
                
                currentPage++;
            }
        });
    
    return html;
}