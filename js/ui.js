/**
 * UIManager - Handles all UI interactions and state management
 * Provides comprehensive UI control for the file renaming wizard
 */
class UIManager {
    constructor() {
        this.currentStep = 1;
        this.maxSteps = 4;
        this.elements = {};
        this.state = {
            selectedFolder: null,
            files: [],
            sortedFiles: [],
            config: {
                sortBy: 'size-asc',
                pattern: 'file_{number}',
                padding: 3
            },
            previewData: [],
            operationResult: null
        };

        this.initializeElements();
        this.attachEventListeners();
        this.showStep(1);
    }

    /**
     * Initialize DOM element references
     */
    initializeElements() {
        // Main elements
        this.elements.appContainer = document.querySelector('.app-container');
        this.elements.browserWarning = document.getElementById('browser-compatibility-warning');

        // Step containers
        this.elements.steps = {
            1: document.getElementById('step-1'),
            2: document.getElementById('step-2'),
            3: document.getElementById('step-3'),
            4: document.getElementById('step-4')
        };

        // Step 1: Folder Selection
        this.elements.selectFolderBtn = document.getElementById('select-folder-btn');
        this.elements.folderInfo = document.getElementById('folder-info');
        this.elements.folderError = document.getElementById('folder-error');

        // Step 2: Configuration
        this.elements.sortSelect = document.getElementById('sort-select');
        this.elements.patternInput = document.getElementById('pattern-input');
        this.elements.paddingSelect = document.getElementById('padding-select');
        this.elements.patternError = document.getElementById('pattern-error');

        // Step 3: Preview
        this.elements.refreshPreviewBtn = document.getElementById('refresh-preview-btn');
        this.elements.fileCountDisplay = document.getElementById('file-count-display');
        this.elements.previewTable = document.getElementById('preview-table');
        this.elements.previewTbody = document.getElementById('preview-tbody');
        this.elements.validationErrors = document.getElementById('validation-errors');
        this.elements.collisionWarnings = document.getElementById('collision-warnings');

        // Step 4: Execution
        this.elements.filesToRenameCount = document.getElementById('files-to-rename-count');
        this.elements.executeRenameBtn = document.getElementById('execute-rename-btn');
        this.elements.progressContainer = document.getElementById('progress-container');
        this.elements.progressFill = document.getElementById('progress-fill');
        this.elements.progressText = document.getElementById('progress-text');
        this.elements.operationResult = document.getElementById('operation-result');

        // Navigation
        this.elements.prevBtn = document.getElementById('prev-btn');
        this.elements.nextBtn = document.getElementById('next-btn');
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Navigation
        this.elements.prevBtn.addEventListener('click', () => this.previousStep());
        this.elements.nextBtn.addEventListener('click', () => this.nextStep());

        // Step 1
        this.elements.selectFolderBtn.addEventListener('click', () => {
            this.onSelectFolder();
        });

        // Step 2
        this.elements.sortSelect.addEventListener('change', () => {
            this.state.config.sortBy = this.elements.sortSelect.value;
            this.sortFiles();
        });

        this.elements.patternInput.addEventListener('input', () => {
            this.state.config.pattern = this.elements.patternInput.value;
            this.validatePattern();
        });

        this.elements.paddingSelect.addEventListener('change', () => {
            this.state.config.padding = parseInt(this.elements.paddingSelect.value);
        });

        // Step 3
        this.elements.refreshPreviewBtn.addEventListener('click', () => {
            this.generatePreview();
        });

        // Step 4
        this.elements.executeRenameBtn.addEventListener('click', () => {
            this.executeRename();
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft' && !this.elements.prevBtn.disabled) {
                this.previousStep();
            } else if (e.key === 'ArrowRight' && !this.elements.nextBtn.disabled) {
                this.nextStep();
            }
        });
    }

    /**
     * Show browser compatibility warning
     * @param {boolean} show - Whether to show the warning
     */
    showBrowserWarning(show = true) {
        if (show) {
            this.elements.browserWarning.classList.remove('hidden');
        } else {
            this.elements.browserWarning.classList.add('hidden');
        }
    }

    /**
     * Show a specific step and hide others
     * @param {number} stepNumber - Step number to show
     */
    showStep(stepNumber) {
        // Hide all steps
        Object.values(this.elements.steps).forEach(step => {
            step.classList.add('hidden');
        });

        // Show requested step
        if (this.elements.steps[stepNumber]) {
            this.elements.steps[stepNumber].classList.remove('hidden');
            this.currentStep = stepNumber;
        }

        this.updateNavigationButtons();
    }

    /**
     * Update navigation button states
     */
    updateNavigationButtons() {
        // Previous button
        this.elements.prevBtn.disabled = this.currentStep === 1;

        // Next button - depends on step validation
        let canProceed = false;
        switch (this.currentStep) {
            case 1:
                canProceed = this.state.selectedFolder && this.state.files.length > 0;
                break;
            case 2:
                canProceed = this.validatePatternSilent();
                break;
            case 3:
                canProceed = this.state.previewData.length > 0;
                break;
            case 4:
                canProceed = false; // No next button on last step
                break;
        }

        this.elements.nextBtn.disabled = !canProceed;

        // Update next button text for last step
        if (this.currentStep === 3) {
            this.elements.nextBtn.textContent = 'Review';
        } else if (this.currentStep === 4) {
            this.elements.nextBtn.style.display = 'none';
        } else {
            this.elements.nextBtn.textContent = 'Next';
            this.elements.nextBtn.style.display = 'block';
        }
    }

    /**
     * Navigate to previous step
     */
    previousStep() {
        if (this.currentStep > 1) {
            this.showStep(this.currentStep - 1);
        }
    }

    /**
     * Navigate to next step
     */
    nextStep() {
        if (this.currentStep < this.maxSteps) {
            if (this.currentStep === 3) {
                // Generate preview before moving to step 4
                this.generatePreview().then(() => {
                    if (this.state.previewData.length > 0) {
                        this.showStep(4);
                    }
                });
            } else {
                this.showStep(this.currentStep + 1);
            }
        }
    }

    /**
     * Handle folder selection (to be called by app controller)
     */
    onSelectFolder() {
        // This will be implemented by the app controller
        // The UI manager just emits events
        const event = new CustomEvent('selectFolder');
        document.dispatchEvent(event);
    }

    /**
     * Display folder information
     * @param {Object} folderInfo - Folder information object
     */
    displayFolderInfo(folderInfo) {
        if (!folderInfo) {
            this.elements.folderInfo.classList.add('hidden');
            return;
        }

        const folderPath = this.elements.folderInfo.querySelector('.folder-path');
        const fileCount = this.elements.folderInfo.querySelector('.file-count');

        folderPath.textContent = `Selected: ${folderInfo.path}`;
        fileCount.textContent = `${folderInfo.fileCount} files found`;

        this.elements.folderInfo.classList.remove('hidden');
        this.elements.folderError.classList.add('hidden');

        this.state.selectedFolder = folderInfo;
        this.updateNavigationButtons();
    }

    /**
     * Display folder selection error
     * @param {string} error - Error message
     */
    displayFolderError(error) {
        this.elements.folderError.textContent = error;
        this.elements.folderError.classList.remove('hidden');
        this.elements.folderInfo.classList.add('hidden');

        this.state.selectedFolder = null;
        this.updateNavigationButtons();
    }

    /**
     * Sort files based on current configuration
     */
    sortFiles() {
        // This will be handled by the app controller
        const event = new CustomEvent('sortFiles', {
            detail: { sortBy: this.state.config.sortBy }
        });
        document.dispatchEvent(event);
    }

    /**
     * Validate pattern and show errors
     */
    validatePattern() {
        const pattern = this.elements.patternInput.value;
        const validation = this.validatePatternSilentObject(pattern);

        if (validation.isValid) {
            this.elements.patternError.classList.add('hidden');
            this.elements.patternInput.classList.remove('error');
        } else {
            this.elements.patternError.textContent = validation.errors.join(', ');
            this.elements.patternError.classList.remove('hidden');
            this.elements.patternInput.classList.add('error');
        }

        this.updateNavigationButtons();
        return validation.isValid;
    }

    /**
     * Validate pattern silently (without UI updates)
     * @returns {boolean} True if valid, false otherwise
     */
    validatePatternSilent() {
        const pattern = this.elements.patternInput.value;
        return this.validatePatternSilentObject(pattern).isValid;
    }

    /**
     * Validate pattern and return result object
     * @param {string} pattern - Pattern to validate
     * @returns {Object} Validation result
     */
    validatePatternSilentObject(pattern) {
        const errors = [];

        if (!pattern || pattern.trim() === '') {
            errors.push('Pattern cannot be empty');
            return { isValid: false, errors };
        }

        const numberPlaceholders = (pattern.match(/{number}/g) || []).length;
        if (numberPlaceholders !== 1) {
            errors.push('Pattern must contain exactly one {number} placeholder');
        }

        const invalidChars = /[<>:"/\\|?*\x00-\x1f]/;
        if (invalidChars.test(pattern)) {
            errors.push('Pattern contains invalid characters');
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Generate preview (to be handled by app controller)
     */
    async generatePreview() {
        this.showLoading(this.elements.refreshPreviewBtn, true);

        const event = new CustomEvent('generatePreview', {
            detail: {
                pattern: this.state.config.pattern,
                padding: this.state.config.padding,
                files: this.state.sortedFiles
            }
        });
        document.dispatchEvent(event);

        // The actual preview generation will be handled by the app controller
        // which will call updatePreviewTable when complete
    }

    /**
     * Update preview table with data
     * @param {Array} previewData - Preview data array
     * @param {Object} options - Additional options
     */
    updatePreviewTable(previewData, options = {}) {
        const { collisionResolutions = [], errors = [] } = options;

        // Clear existing content
        this.elements.previewTbody.innerHTML = '';

        if (errors.length > 0) {
            this.showValidationErrors(errors);
            return;
        }

        // Hide error messages
        this.elements.validationErrors.classList.add('hidden');

        if (previewData.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="4" style="text-align: center; color: #666;">No files to preview</td>';
            this.elements.previewTbody.appendChild(row);
            return;
        }

        // Add rows for each file
        previewData.forEach(item => {
            const row = document.createElement('tr');

            if (item.collisionResolved) {
                row.classList.add('collision-resolved');
            }

            row.innerHTML = `
                <td class="original-name">${this.escapeHtml(item.originalName)}</td>
                <td class="new-name">${this.escapeHtml(item.newName)}</td>
                <td>${this.formatFileSize(item.size)}</td>
                <td>${this.formatDate(item.creationTime)}</td>
            `;

            this.elements.previewTbody.appendChild(row);
        });

        // Update file count display
        this.elements.fileCountDisplay.textContent = `${previewData.length} files`;

        // Show collision warnings if any
        if (collisionResolutions.length > 0) {
            this.showCollisionWarnings(collisionResolutions);
        }

        this.state.previewData = previewData;
        this.updateNavigationButtons();
    }

    /**
     * Show validation errors
     * @param {Array} errors - Array of error messages
     */
    showValidationErrors(errors) {
        if (errors.length === 0) {
            this.elements.validationErrors.classList.add('hidden');
            return;
        }

        const errorList = errors.map(error => `<li>${this.escapeHtml(error)}</li>`).join('');
        this.elements.validationErrors.innerHTML = `<ul>${errorList}</ul>`;
        this.elements.validationErrors.classList.remove('hidden');
    }

    /**
     * Show collision warnings
     * @param {Array} collisionResolutions - Array of collision resolution objects
     */
    showCollisionWarnings(collisionResolutions) {
        if (collisionResolutions.length === 0) {
            this.elements.collisionWarnings.classList.add('hidden');
            return;
        }

        const warningList = collisionResolutions.map(resolution =>
            `<li>${this.escapeHtml(resolution.originalName)} → ${this.escapeHtml(resolution.resolvedName)} (number ${resolution.originalIndex} → ${resolution.resolvedIndex})</li>`
        ).join('');

        this.elements.collisionWarnings.innerHTML = `
            <strong>Name Collisions Resolved:</strong>
            <ul>${warningList}</ul>
            <p><em>Some file numbers were adjusted to avoid name conflicts.</em></p>
        `;
        this.elements.collisionWarnings.classList.remove('hidden');
    }

    /**
     * Update execution summary
     */
    updateExecutionSummary() {
        const count = this.state.previewData.length;
        this.elements.filesToRenameCount.textContent = count;
    }

    /**
     * Execute rename operation (to be handled by app controller)
     */
    async executeRename() {
        this.showLoading(this.elements.executeRenameBtn, true);
        this.elements.progressContainer.classList.remove('hidden');
        this.elements.operationResult.classList.add('hidden');

        const event = new CustomEvent('executeRename', {
            detail: {
                previewData: this.state.previewData
            }
        });
        document.dispatchEvent(event);
    }

    /**
     * Show progress during operation
     * @param {number} current - Current progress
     * @param {number} total - Total progress
     * @param {string} currentFile - Current file being processed
     * @param {string} newName - New name for current file
     */
    showProgress(current, total, currentFile, newName) {
        const percentage = Math.round((current / total) * 100);

        this.elements.progressFill.style.width = `${percentage}%`;
        this.elements.progressText.textContent =
            `Renaming ${current} of ${total} files: ${currentFile} → ${newName}`;
    }

    /**
     * Show operation result
     * @param {Object} result - Operation result object
     */
    showOperationResult(result) {
        this.showLoading(this.elements.executeRenameBtn, false);
        this.elements.progressContainer.classList.add('hidden');

        const successCount = result.successful.length;
        const failureCount = result.failed.length;
        const totalCount = result.totalFiles;

        let html = `
            <h3>Operation Complete</h3>
            <p><strong>${successCount}</strong> of <strong>${totalCount}</strong> files renamed successfully.</p>
        `;

        if (failureCount > 0) {
            html += `
                <div class="failures">
                    <h4>Failed Renames (${failureCount}):</h4>
                    <ul>
                        ${result.failed.map(failure =>
                            `<li>${this.escapeHtml(failure.originalName)} → ${this.escapeHtml(failure.newName)}: ${this.escapeHtml(failure.error)}</li>`
                        ).join('')}
                    </ul>
                </div>
            `;
        }

        if (successCount > 0) {
            html += `
                <div class="successes">
                    <h4>Successfully Renamed:</h4>
                    <ul>
                        ${result.successful.slice(0, 10).map(success =>
                            `<li>${this.escapeHtml(success.originalName)} → ${this.escapeHtml(success.newName)}</li>`
                        ).join('')}
                        ${successCount > 10 ? '<li><em>... and ' + (successCount - 10) + ' more files</em></li>' : ''}
                    </ul>
                </div>
            `;
        }

        this.elements.operationResult.innerHTML = html;
        this.elements.operationResult.classList.remove('hidden');

        if (failureCount === 0) {
            this.elements.operationResult.classList.add('success');
            this.elements.operationResult.classList.remove('error');
        } else {
            this.elements.operationResult.classList.add('error');
            this.elements.operationResult.classList.remove('success');
        }

        this.state.operationResult = result;
    }

    /**
     * Show/hide loading state on a button
     * @param {HTMLElement} button - Button element
     * @param {boolean} show - Whether to show loading state
     */
    showLoading(button, show = true) {
        if (show) {
            button.classList.add('loading');
            button.disabled = true;
        } else {
            button.classList.remove('loading');
            button.disabled = false;
        }
    }

    /**
     * Format file size for display
     * @param {number} bytes - Size in bytes
     * @returns {string} Formatted size string
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Format date for display
     * @param {number} timestamp - Unix timestamp
     * @returns {string} Formatted date string
     */
    formatDate(timestamp) {
        if (!timestamp || timestamp === 0) {
            return 'Unknown';
        }

        const date = new Date(timestamp);
        return date.toLocaleString();
    }

    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Get current application state
     * @returns {Object} Current state
     */
    getState() {
        return { ...this.state };
    }

    /**
     * Update application state
     * @param {Object} newState - New state to merge
     */
    updateState(newState) {
        this.state = { ...this.state, ...newState };
    }

    /**
     * Reset the application to initial state
     */
    reset() {
        this.currentStep = 1;
        this.state = {
            selectedFolder: null,
            files: [],
            sortedFiles: [],
            config: {
                sortBy: 'size-asc',
                pattern: 'file_{number}',
                padding: 3
            },
            previewData: [],
            operationResult: null
        };

        // Reset UI elements
        this.elements.patternInput.value = 'file_{number}';
        this.elements.sortSelect.value = 'size-asc';
        this.elements.paddingSelect.value = '3';
        this.elements.folderInfo.classList.add('hidden');
        this.elements.folderError.classList.add('hidden');
        this.elements.validationErrors.classList.add('hidden');
        this.elements.collisionWarnings.classList.add('hidden');
        this.elements.operationResult.classList.add('hidden');
        this.elements.progressContainer.classList.add('hidden');

        this.showStep(1);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIManager;
}