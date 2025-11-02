/**
 * File Renamer Application - Main Controller
 * Orchestrates all components and handles application lifecycle
 */
class FileRenamerApp {
    constructor() {
        this.fileSystemManager = null;
        this.fileSorter = null;
        this.fileRenamer = null;
        this.uiManager = null;

        this.init();
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            // Initialize components
            this.fileSystemManager = new FileSystemManager();
            this.fileSorter = new FileSorter();
            this.fileRenamer = new FileRenamer(this.fileSystemManager);
            this.uiManager = new UIManager();

            // Check browser compatibility
            await this.checkBrowserCompatibility();

            // Attach event listeners
            this.attachEventListeners();

            console.log('File Renamer App initialized successfully');
        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.uiManager.showBrowserWarning(true);
            this.uiManager.displayFolderError('Failed to initialize application: ' + error.message);
        }
    }

    /**
     * Check browser compatibility
     */
    async checkBrowserCompatibility() {
        const supportInfo = this.fileSystemManager.getSupportInfo();

        if (!supportInfo.supported) {
            this.uiManager.showBrowserWarning(true);
            this.uiManager.displayFolderError(
                `Your browser (${supportInfo.browser.name}) does not support the File System Access API. ` +
                'Please use Chrome, Edge, or Safari 16.4+ for full functionality.'
            );
            return false;
        }

        if (!supportInfo.browser.hasFullSupport) {
            console.warn('Browser has limited File System Access API support:', supportInfo.browser);
            // Could show a warning but still allow basic functionality
        }

        this.uiManager.showBrowserWarning(false);
        return true;
    }

    /**
     * Attach event listeners for custom events
     */
    attachEventListeners() {
        // Folder selection
        document.addEventListener('selectFolder', () => {
            this.handleFolderSelection();
        });

        // File sorting
        document.addEventListener('sortFiles', (e) => {
            this.handleFileSorting(e.detail.sortBy);
        });

        // Preview generation
        document.addEventListener('generatePreview', (e) => {
            this.handlePreviewGeneration(e.detail);
        });

        // Rename execution
        document.addEventListener('executeRename', (e) => {
            this.handleRenameExecution(e.detail.previewData);
        });

        // Handle page unload to clean up resources
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
    }

    /**
     * Handle folder selection
     */
    async handleFolderSelection() {
        try {
            this.uiManager.showLoading(this.uiManager.elements.selectFolderBtn, true);

            // Show folder picker dialog
            const directoryHandle = await this.fileSystemManager.selectFolder();

            if (!directoryHandle) {
                // User cancelled
                return;
            }

            // Get files from directory
            const files = await this.fileSystemManager.getFilesFromDirectory(directoryHandle);

            if (files.length === 0) {
                this.uiManager.displayFolderError('The selected folder contains no files.');
                return;
            }

            // Display folder information
            const folderInfo = {
                path: directoryHandle.name || 'Selected Folder',
                fileCount: files.length,
                handle: directoryHandle
            };

            this.uiManager.displayFolderInfo(folderInfo);
            this.uiManager.updateState({
                files: files,
                sortedFiles: this.fileSorter.sortFiles(files, this.uiManager.getState().config.sortBy)
            });

            // Move to next step
            this.uiManager.nextStep();

        } catch (error) {
            console.error('Folder selection error:', error);
            this.uiManager.displayFolderError(error.message);
        } finally {
            this.uiManager.showLoading(this.uiManager.elements.selectFolderBtn, false);
        }
    }

    /**
     * Handle file sorting
     * @param {string} sortBy - Sort option
     */
    handleFileSorting(sortBy) {
        try {
            const state = this.uiManager.getState();
            const sortedFiles = this.fileSorter.sortFiles(state.files, sortBy);

            this.uiManager.updateState({
                sortedFiles: sortedFiles,
                config: { ...state.config, sortBy: sortBy }
            });

            // If we have preview data, regenerate it with new sort order
            if (state.previewData.length > 0) {
                this.uiManager.generatePreview();
            }

        } catch (error) {
            console.error('File sorting error:', error);
            this.uiManager.displayFolderError('Failed to sort files: ' + error.message);
        }
    }

    /**
     * Handle preview generation
     * @param {Object} params - Preview parameters
     */
    async handlePreviewGeneration(params) {
        try {
            const { pattern, padding, files } = params;

            // Generate preview using FileRenamer
            const previewResult = await this.fileRenamer.generatePreview(
                files,
                pattern,
                padding,
                { resolveCollisions: true, startIndex: 1 }
            );

            if (!previewResult.success) {
                this.uiManager.updatePreviewTable([], { errors: previewResult.errors });
                return;
            }

            // Update UI with preview data
            this.uiManager.updatePreviewTable(
                previewResult.previewData,
                {
                    collisionResolutions: previewResult.collisionResolutions,
                    errors: previewResult.errors
                }
            );

            this.uiManager.updateState({
                previewData: previewResult.previewData,
                config: { ...this.uiManager.getState().config, pattern, padding }
            });

        } catch (error) {
            console.error('Preview generation error:', error);
            this.uiManager.updatePreviewTable([], {
                errors: ['Failed to generate preview: ' + error.message]
            });
        } finally {
            this.uiManager.showLoading(this.uiManager.elements.refreshPreviewBtn, false);
        }
    }

    /**
     * Handle rename execution
     * @param {Array} previewData - Preview data to execute
     */
    async handleRenameExecution(previewData) {
        try {
            if (!previewData || previewData.length === 0) {
                this.uiManager.showOperationResult({
                    successful: [],
                    failed: [],
                    totalFiles: 0,
                    startTime: Date.now(),
                    endTime: Date.now(),
                    duration: 0
                });
                return;
            }

            // Execute renaming with progress callback
            const result = await this.fileRenamer.executeRenaming(
                previewData,
                (current, total, originalName, newName) => {
                    this.uiManager.showProgress(current, total, originalName, newName);
                }
            );

            // Show operation result
            this.uiManager.showOperationResult(result);

            // Update UI state
            this.uiManager.updateState({
                operationResult: result,
                files: [], // Clear files after operation
                sortedFiles: [],
                previewData: []
            });

            // If operation was partially successful, show what was accomplished
            if (result.successful.length > 0) {
                console.log(`Successfully renamed ${result.successful.length} files`);
            }

            if (result.failed.length > 0) {
                console.warn(`Failed to rename ${result.failed.length} files`);
            }

        } catch (error) {
            console.error('Rename execution error:', error);
            this.uiManager.showOperationResult({
                successful: [],
                failed: [{ originalName: 'Operation', newName: 'Failed', error: error.message }],
                totalFiles: previewData.length,
                startTime: Date.now(),
                endTime: Date.now(),
                duration: 0
            });
        }
    }

    /**
     * Clean up resources
     */
    cleanup() {
        if (this.fileSystemManager) {
            this.fileSystemManager.clear();
        }

        if (this.fileRenamer) {
            this.fileRenamer.clearLogs();
        }

        console.log('App cleanup completed');
    }

    /**
     * Get application statistics
     * @returns {Object} Application statistics
     */
    getStats() {
        const state = this.uiManager.getState();
        const supportInfo = this.fileSystemManager.getSupportInfo();

        return {
            browserSupport: supportInfo,
            currentStep: this.uiManager.currentStep,
            filesLoaded: state.files.length,
            filesSorted: state.sortedFiles.length,
            previewGenerated: state.previewData.length,
            lastOperation: state.operationResult,
            operationLog: this.fileRenamer.getOperationLog(),
            collisionResolutions: this.fileRenamer.getCollisionResolutions()
        };
    }

    /**
     * Export application data for debugging
     * @returns {Object} Application data
     */
    exportData() {
        return {
            state: this.uiManager.getState(),
            stats: this.getStats(),
            fileStats: this.fileSorter.getFileStats(this.uiManager.getState().files),
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Reset application to initial state
     */
    reset() {
        this.cleanup();
        this.uiManager.reset();
        console.log('Application reset to initial state');
    }
}

// Initialize the application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.fileRenamerApp = new FileRenamerApp();
    });
} else {
    // DOM is already ready
    window.fileRenamerApp = new FileRenamerApp();
}

// Make app available globally for debugging
if (typeof window !== 'undefined') {
    window.FileRenamerApp = FileRenamerApp;
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FileRenamerApp;
}