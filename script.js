document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('modal');
    const closeButton = document.getElementById('close-button');
    const modalTitle = document.getElementById('modal-title');
    const modalIframe = document.getElementById('modal-iframe');
    const modalCode = document.getElementById('modal-code');
    const modalDocs = document.getElementById('modal-docs');
    const docsTabButton = document.getElementById('docs-tab-button');
    const gridContainer = document.querySelector('.grid-container');

    // Event delegation for card clicks
    if (gridContainer) {
        gridContainer.addEventListener('click', async (event) => {
            const card = event.target.closest('.card');
            if (!card) return;

            const file = card.dataset.file;
            const title = card.dataset.title;
            const docs = card.dataset.docs;

            if (!file || !title) {
                console.error("Card is missing data-file or data-title attribute.");
                return;
            }

            modalTitle.textContent = title;
            modalIframe.src = file; // Assumes 'demos/' is the correct relative path from index.html

            try {
                const response = await fetch(file); // Fetch relative to index.html
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const code = await response.text();
                modalCode.textContent = code; // Display raw code
            } catch (error) {
                console.error('Error loading source code:', error);
                modalCode.textContent = `Error loading source code for ${file}.\n${error.message}`;
            }

            if (docs && docs.trim() !== "") {
                modalDocs.textContent = docs; // Display raw docs
                docsTabButton.style.display = 'inline-block'; // Show docs tab
            } else {
                modalDocs.textContent = '';
                docsTabButton.style.display = 'none'; // Hide docs tab
            }

            // Reset to the first tab (Demo)
            openTab(null, 'demo-tab', true);
            modal.classList.add('show');
            document.body.style.overflow = 'hidden'; // Prevent background scrolling
        });
    }


    if (closeButton) {
        closeButton.onclick = () => {
            closeModal();
        };
    }

    if (modal) {
        modal.onclick = (event) => {
            if (event.target === modal) { // Only close if clicking on the backdrop
                closeModal();
            }
        };
    }

    // Close modal with Escape key
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && modal && modal.classList.contains('show')) {
            closeModal();
        }
    });

    function closeModal() {
        if (modal) {
            modal.classList.remove('show');
            modalIframe.src = 'about:blank'; // Clear iframe content to stop any playing media/scripts
        }
        document.body.style.overflow = ''; // Restore background scrolling
    }
});

function openTab(event, tabName, isDefault = false) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.style.display = 'none');
    document.querySelectorAll('.tab-link').forEach(link => link.classList.remove('active'));

    const targetTab = document.getElementById(tabName);
    if (targetTab) {
        targetTab.style.display = 'block';
    }

    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    } else if (isDefault) {
        // If opening a default tab without a click event, find the corresponding button
        const defaultButton = document.querySelector(`.tab-link[onclick*="'${tabName}'"]`);
        if (defaultButton) {
            defaultButton.classList.add('active');
        }
    }
}
