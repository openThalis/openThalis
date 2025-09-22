export class ResponseManager {
    constructor(taskDetailsPopup) {
        this.taskDetailsPopup = taskDetailsPopup;
        this.currentResponseIndex = 0;
    }

    showPreviousResponse() {
        if (this.currentResponseIndex > 0) {
            this.currentResponseIndex--;
            this.updateResponseDisplay();
        }
    }

    showNextResponse() {
        if (this.currentResponseIndex < this.taskDetailsPopup.responses.length - 1) {
            this.currentResponseIndex++;
            this.updateResponseDisplay();
        }
    }

    showLatestResponse() {
        if (this.taskDetailsPopup.responses.length > 0) {
            this.currentResponseIndex = this.taskDetailsPopup.responses.length - 1;
            this.updateResponseDisplay();
            // Clear new response indicators when user navigates to latest
            this.taskDetailsPopup.hasNewResponses = false;
            this.taskDetailsPopup.hideNewResponseIndicator();
        }
    }

    updateResponseDisplay() {
        // Cancel any pending delete confirmation when switching responses
        this.taskDetailsPopup.deleteManager?.exitDeleteConfirmation();

        const hasResponses = this.taskDetailsPopup.responses.length > 0;

        if (hasResponses) {
            const currentResponse = this.taskDetailsPopup.responses[this.currentResponseIndex];

            // Show response content
            if (this.taskDetailsPopup.elements.responseEl) {
                this.taskDetailsPopup.elements.responseEl.textContent = currentResponse.response || 'No response content';
            }

            // Show response datetime
            if (this.taskDetailsPopup.elements.responseDateTimeEl) {
                const datetime = new Date(currentResponse.datetime);
                this.taskDetailsPopup.elements.responseDateTimeEl.textContent = datetime.toLocaleString();
            }

            // Update counter
            if (this.taskDetailsPopup.elements.responseCounter) {
                this.taskDetailsPopup.elements.responseCounter.textContent = `${this.currentResponseIndex + 1} / ${this.taskDetailsPopup.responses.length}`;
            }

            // Show/hide navigation
            if (this.taskDetailsPopup.elements.responseNavigation) {
                if (this.taskDetailsPopup.responses.length > 1) {
                    this.taskDetailsPopup.elements.responseNavigation.classList.remove('hidden');
                } else {
                    this.taskDetailsPopup.elements.responseNavigation.classList.add('hidden');
                }
            }

            // Show/hide latest button
            if (this.taskDetailsPopup.elements.latestResponseBtn) {
                if (this.taskDetailsPopup.responses.length > 1) {
                    this.taskDetailsPopup.elements.latestResponseBtn.style.display = '';
                } else {
                    this.taskDetailsPopup.elements.latestResponseBtn.style.display = 'none';
                }
            }

            // Show/hide delete button
            if (this.taskDetailsPopup.elements.deleteResponseBtn) {
                this.taskDetailsPopup.elements.deleteResponseBtn.style.display = '';
                this.taskDetailsPopup.elements.deleteResponseBtn.disabled = false;
            }

            // Show chat button when there are responses
            if (this.taskDetailsPopup.elements.chatBtn) {
                this.taskDetailsPopup.elements.chatBtn.style.display = '';
            }

            // Update button states
            if (this.taskDetailsPopup.elements.prevResponseBtn) {
                this.taskDetailsPopup.elements.prevResponseBtn.disabled = this.currentResponseIndex === 0;
            }
            if (this.taskDetailsPopup.elements.nextResponseBtn) {
                this.taskDetailsPopup.elements.nextResponseBtn.disabled = this.currentResponseIndex === this.taskDetailsPopup.responses.length - 1;
            }
            if (this.taskDetailsPopup.elements.latestResponseBtn) {
                this.taskDetailsPopup.elements.latestResponseBtn.disabled = this.currentResponseIndex === this.taskDetailsPopup.responses.length - 1;
            }
        } else {
            // No responses
            if (this.taskDetailsPopup.elements.responseEl) {
                this.taskDetailsPopup.elements.responseEl.textContent = "This task hasn't been run yet.";
            }
            if (this.taskDetailsPopup.elements.responseDateTimeEl) {
                this.taskDetailsPopup.elements.responseDateTimeEl.textContent = "No responses yet";
            }
            if (this.taskDetailsPopup.elements.responseCounter) {
                this.taskDetailsPopup.elements.responseCounter.textContent = "-";
            }
            if (this.taskDetailsPopup.elements.responseNavigation) {
                this.taskDetailsPopup.elements.responseNavigation.classList.add('hidden');
            }
            if (this.taskDetailsPopup.elements.latestResponseBtn) {
                this.taskDetailsPopup.elements.latestResponseBtn.style.display = 'none';
            }
            if (this.taskDetailsPopup.elements.deleteResponseBtn) {
                this.taskDetailsPopup.elements.deleteResponseBtn.style.display = 'none';
            }

            // Hide chat button when there are no responses
            if (this.taskDetailsPopup.elements.chatBtn) {
                this.taskDetailsPopup.elements.chatBtn.style.display = 'none';
            }
        }
    }

    bindResponseNavigationEvents() {
        // Response navigation events
        this.taskDetailsPopup.elements.prevResponseBtn && this.taskDetailsPopup.elements.prevResponseBtn.addEventListener('click', () => {
            this.showPreviousResponse();
        });

        this.taskDetailsPopup.elements.nextResponseBtn && this.taskDetailsPopup.elements.nextResponseBtn.addEventListener('click', () => {
            this.showNextResponse();
        });

        this.taskDetailsPopup.elements.latestResponseBtn && this.taskDetailsPopup.elements.latestResponseBtn.addEventListener('click', () => {
            this.showLatestResponse();
        });
    }
}
