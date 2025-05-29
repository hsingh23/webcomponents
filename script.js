document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('modal');
    const closeButton = document.getElementById('close-button');
    const modalTitle = document.getElementById('modal-title');
    const modalIframe = document.getElementById('modal-iframe');
    const modalCodeElement = document.getElementById('modal-code'); // Renamed for clarity
    const modalDocs = document.getElementById('modal-docs');
    const docsTabButton = document.getElementById('docs-tab-button');
    const gridContainer = document.querySelector('.grid-container');
    const loadingMessage = document.getElementById('loading-message');
    const copyCodeButton = document.getElementById('copy-code-button');

    async function loadDemos() {
        try {
            const response = await fetch('public/data/demos.json'); // Fetch the generated JSON
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const demos = await response.json();

            if (loadingMessage) loadingMessage.style.display = 'none';

            if (demos.length === 0) {
                gridContainer.innerHTML = '<p class="empty-message">No demos available. Add HTML files to the "demos" folder and run the generation script.</p>';
                return;
            }

            demos.forEach(demo => {
                const card = document.createElement('div');
                card.className = demo.featured ? 'card featured' : 'card';
                card.dataset.file = demo.file;
                card.dataset.title = demo.title;
                card.dataset.docs = demo.docs;

                // Create an iframe container and the iframe itself for the preview
                const iframeContainer = document.createElement('div');
                iframeContainer.className = 'card-iframe-container';
                const iframe = document.createElement('iframe');
                iframe.className = 'card-iframe';
                iframe.src = demo.file;
                iframe.setAttribute('sandbox', 'allow-scripts'); // Basic sandboxing for previews
                iframe.setAttribute('loading', 'lazy'); // Lazy load iframes
                iframeContainer.appendChild(iframe);

                // Create the title overlay
                const titleOverlay = document.createElement('div');
                titleOverlay.className = 'card-title-overlay';
                const titleHeader = document.createElement('h3');
                titleHeader.textContent = demo.title;
                titleOverlay.appendChild(titleHeader);

                card.appendChild(iframeContainer);
                card.appendChild(titleOverlay);
                gridContainer.appendChild(card);
            });

        } catch (error) {
            console.error('Error loading demos:', error);
            if (loadingMessage) loadingMessage.style.display = 'none';
            gridContainer.innerHTML = `<p class="empty-message">Error loading demos: ${error.message}. Please ensure 'public/data/demos.json' is available.</p>`;
        }
    }

    if (gridContainer) {
        loadDemos(); // Load demos from JSON

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
            modalIframe.src = file;

            try {
                const response = await fetch(file);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const code = await response.text();
                modalCodeElement.textContent = code;
                Prism.highlightElement(modalCodeElement); // Highlight after setting content
            } catch (error) {
                console.error('Error loading source code:', error);
                modalCodeElement.textContent = `Error loading source code for ${file}.\n${error.message}`;
            }

            if (docs && docs.trim() !== "") {
                modalDocs.textContent = docs;
                docsTabButton.style.display = 'inline-block';
            } else {
                modalDocs.textContent = '';
                docsTabButton.style.display = 'none';
            }

            openTab(null, 'demo-tab', true);
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
        });
    }

    if (closeButton) {
        closeButton.onclick = () => {
            closeModal();
        };
    }

    if (modal) {
        modal.onclick = (event) => {
            if (event.target === modal) {
                closeModal();
            }
        };
    }

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && modal && modal.classList.contains('show')) {
            closeModal();
        }
    });

    function closeModal() {
        if (modal) {
            modal.classList.remove('show');
            modalIframe.src = 'about:blank';
        }
        document.body.style.overflow = '';
    }

    if (copyCodeButton && modalCodeElement) {
        copyCodeButton.addEventListener('click', () => {
            const codeToCopy = modalCodeElement.textContent;
            navigator.clipboard.writeText(codeToCopy).then(() => {
                // Optional: Show a temporary success message
                const originalText = copyCodeButton.textContent;
                copyCodeButton.textContent = 'Copied!';
                setTimeout(() => {
                    copyCodeButton.textContent = originalText;
                }, 2000);
            }).catch(err => {
                console.error('Failed to copy code: ', err);
                // Optional: Show an error message
            });
        });
    }
});

function openTab(event, tabName, isDefault = false) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.style.display = 'none');
    document.querySelectorAll('.tab-link').forEach(link => link.classList.remove('active'));

    const targetTab = document.getElementById(tabName);
    if (targetTab) {
        targetTab.style.display = 'block';
    }

    let currentButton;
    if (event && event.currentTarget) {
        currentButton = event.currentTarget;
    } else if (isDefault) {
        currentButton = document.querySelector(`.tab-link[onclick*="'${tabName}'"]`);
    }

    if (currentButton) {
        currentButton.classList.add('active');
    }

    // Special handling for code tab to ensure Prism highlights correctly if tab was hidden
    if (tabName === 'code-tab' && document.getElementById('modal-code')) {
        Prism.highlightElement(document.getElementById('modal-code'));
    }
}
