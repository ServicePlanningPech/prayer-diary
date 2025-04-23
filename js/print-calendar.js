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
                    No prayer cards found for the selected date range.
                </div>
            `;
            return;
        }
        
        // Generate the preview HTML
        const cardsPerPage = parseInt(document.getElementById('print-layout').value) || 2;
        const previewHTML = generatePrintHTML(prayerCards, cardsPerPage);
        
        // Update the preview container with a scaled-down version of the first page
        previewContainer.innerHTML = `
            <div class="alert alert-info mb-3">
                <strong>Preview:</strong> Showing first page of ${Math.ceil(prayerCards.length / cardsPerPage)} pages (${prayerCards.length} prayer cards)
            </div>
            <div class="d-flex justify-content-center">
                <div style="transform: scale(0.7); transform-origin: top left; border: 1px solid #ddd;">
                    ${previewHTML.split('</div><!-- End of print page -->')[0]}</div><!-- End of print page -->
                </div>
            </div>
        `;
    } catch (error) {
        previewContainer.innerHTML = `
            <div class="alert alert-danger">
                Error generating preview: ${error.message}
            </div>
        `;
        console.error('Error generating preview:', error);
    }
}

// Generate the PDF
async function generatePDF() {
    try {
        // Get the prayer cards based on the selected options
        const prayerCards = await getPrayerCards();
        
        // If no prayer cards found
        if (!prayerCards || prayerCards.length === 0) {
            showNotification('Error', 'No prayer cards found for the selected date range.', 'error');
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
        
        // Write the HTML to the iframe
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        iframeDoc.open();
        iframeDoc.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Prayer Calendar</title>
                <style>
                    @page {
                        size: A5 portrait;
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
                        position: relative;
                        page-break-after: always;
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
                        margin-right: 5mm;
                    }
                    .print-profile-image {
                        width: 100%;
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
            </head>
            <body>
                ${printHTML}
            </body>
            </html>
        `);
        iframeDoc.close();
        
        // Wait for images to load
        setTimeout(() => {
            // Print the iframe
            iframe.contentWindow.print();
            
            // Remove the iframe after printing (or after a timeout if print is cancelled)
            setTimeout(() => {
                document.body.removeChild(iframe);
            }, 1000);
        }, 500);
        
    } catch (error) {
        showNotification('Error', `Error generating PDF: ${error.message}`, 'error');
        console.error('Error generating PDF:', error);
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
        // Get all profile data
        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('*')
            .eq('approval_state', 'Approved');
            
        if (profilesError) throw profilesError;
        
        // Get prayer calendar assignments if date range is specified
        let prayerCards = [];
        
        if (startDate && endDate) {
            // Format dates for database query
            const formattedStartDate = startDate.toISOString().split('T')[0];
            const formattedEndDate = endDate.toISOString().split('T')[0];
            
            // Get calendar assignments for the date range
            const { data: assignments, error: assignmentsError } = await supabase
                .from('calendar_assignments')
                .select('*')
                .gte('day', 1)
                .lte('day', 31);
                
            if (assignmentsError) throw assignmentsError;
            
            // Map assignments to profiles
            if (assignments && assignments.length > 0) {
                // Process each assignment
                for (const assignment of assignments) {
                    // Only include user assignments
                    if (assignment.type === 'user' && assignment.user_id) {
                        // Find the user profile
                        const profile = profiles.find(p => p.id === assignment.user_id);
                        if (profile) {
                            prayerCards.push({
                                id: profile.id,
                                name: profile.full_name,
                                prayerPoints: profile.prayer_points || 'No prayer points provided.',
                                profileImage: profile.profile_image,
                                day: assignment.day
                            });
                        }
                    }
                }
            }
        } else {
            // No date filtering, include all profiles
            prayerCards = profiles.map(profile => ({
                id: profile.id,
                name: profile.full_name,
                prayerPoints: profile.prayer_points || 'No prayer points provided.',
                profileImage: profile.profile_image,
                day: null
            }));
        }
        
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
            
            // Format prayer points as paragraphs
            let formattedPrayerPoints = '';
            if (card.prayerPoints) {
                // Split by newlines and create paragraphs
                formattedPrayerPoints = card.prayerPoints
                    .split('\n')
                    .filter(line => line.trim())
                    .map(line => `<p>${line}</p>`)
                    .join('');
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
                            <img src="${imageUrl}" class="print-profile-image" alt="${card.name}">
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
