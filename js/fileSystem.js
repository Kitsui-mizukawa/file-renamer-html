/**
 * FileSystemManager - Handles File System Access API operations
 * Provides wrapper functions for folder selection, file reading, and renaming
 */
class FileSystemManager {
    constructor() {
        this.isSupported = this.checkBrowserSupport();
        this.directoryHandle = null;
        this.files = [];
    }

    /**
     * Check if File System Access API is supported
     * @returns {boolean} True if supported, false otherwise
     */
    checkBrowserSupport() {
        return 'showDirectoryPicker' in window;
    }

    /**
     * Open folder picker dialog and get directory handle
     * @returns {Promise<FileSystemDirectoryHandle|null>} Directory handle or null if cancelled
     */
    async selectFolder() {
        if (!this.isSupported) {
            throw new Error('File System Access API is not supported in this browser');
        }

        try {
            this.directoryHandle = await window.showDirectoryPicker();
            return this.directoryHandle;
        } catch (error) {
            if (error.name === 'AbortError') {
                return null; // User cancelled
            }
            if (error.name === 'NotAllowedError') {
                throw new Error('Permission denied. Please allow access to the folder.');
            }
            if (error.name === 'NotFoundError') {
                throw new Error('Folder not found or was deleted.');
            }
            throw new Error(`Failed to select folder: ${error.message}`);
        }
    }

    /**
     * Get all files from the selected directory (non-recursive)
     * @param {FileSystemDirectoryHandle} directoryHandle - Directory handle to read from
     * @returns {Promise<Array>} Array of file objects with metadata
     */
    async getFilesFromDirectory(directoryHandle = null) {
        const dirHandle = directoryHandle || this.directoryHandle;
        if (!dirHandle) {
            throw new Error('No directory selected');
        }

        this.files = [];

        try {
            for await (const [name, handle] of dirHandle.entries()) {
                // Skip directories, only process files
                if (handle.kind === 'file') {
                    const fileData = await this.getFileMetadata(handle, name);
                    this.files.push(fileData);
                }
            }
        } catch (error) {
            throw new Error(`Failed to read directory: ${error.message}`);
        }

        return this.files;
    }

    /**
     * Get file metadata including size, dates, and extension
     * @param {FileSystemFileHandle} fileHandle - File handle
     * @param {string} fileName - File name
     * @returns {Promise<Object>} File metadata object
     */
    async getFileMetadata(fileHandle, fileName) {
        try {
            const file = await fileHandle.getFile();

            // Extract file extension
            const lastDotIndex = fileName.lastIndexOf('.');
            const extension = lastDotIndex > 0 ? fileName.substring(lastDotIndex) : '';

            // Get file size and dates
            const size = file.size;
            const lastModified = file.lastModified;

            // Try to get creation time if available (Chrome 86+)
            let creationTime = lastModified;
            try {
                if (file.getFileCreationTime) {
                    creationTime = await file.getFileCreationTime();
                }
            } catch (e) {
                // Fallback to last modified if creation time not available
                creationTime = lastModified;
            }

            return {
                handle: fileHandle,
                name: fileName,
                size: size,
                lastModified: lastModified,
                creationTime: creationTime,
                extension: extension,
                type: file.type
            };
        } catch (error) {
            throw new Error(`Failed to get metadata for ${fileName}: ${error.message}`);
        }
    }

    /**
     * Rename a file using the File System Access API
     * @param {FileSystemFileHandle} fileHandle - File handle to rename
     * @param {string} newName - New file name
     * @returns {Promise<boolean>} True if successful, false otherwise
     */
    async renameFile(fileHandle, newName) {
        try {
            // Validate new name
            if (!newName || newName.trim() === '') {
                throw new Error('File name cannot be empty');
            }

            // Check for invalid characters
            const invalidChars = /[<>:"/\\|?*]/;
            if (invalidChars.test(newName)) {
                throw new Error('File name contains invalid characters');
            }

            // Check if name is too long
            if (newName.length > 255) {
                throw new Error('File name is too long (max 255 characters)');
            }

            // Perform the rename operation
            await fileHandle.move(newName);
            return true;
        } catch (error) {
            if (error.name === 'NotAllowedError') {
                throw new Error(`Permission denied to rename file: ${error.message}`);
            }
            if (error.name === 'NotFoundError') {
                throw new Error('File not found or was deleted during operation');
            }
            if (error.name === 'NoModificationAllowedError') {
                throw new Error('File is locked or cannot be modified');
            }
            throw new Error(`Failed to rename file: ${error.message}`);
        }
    }

    /**
     * Get the directory handle for the selected folder
     * @returns {FileSystemDirectoryHandle|null} Current directory handle
     */
    getDirectoryHandle() {
        return this.directoryHandle;
    }

    /**
     * Get the list of files that were read
     * @returns {Array} Array of file objects
     */
    getFiles() {
        return this.files;
    }

    /**
     * Clear the current directory handle and file list
     */
    clear() {
        this.directoryHandle = null;
        this.files = [];
    }

    /**
     * Check if a file name already exists in the directory
     * @param {string} fileName - File name to check
     * @returns {Promise<boolean>} True if file exists, false otherwise
     */
    async fileExists(fileName) {
        if (!this.directoryHandle) {
            return false;
        }

        try {
            await this.directoryHandle.getFileHandle(fileName);
            return true;
        } catch (error) {
            if (error.name === 'NotFoundError') {
                return false;
            }
            // For other errors, assume file might exist to be safe
            return true;
        }
    }

    /**
     * Get formatted file size for display
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
        const date = new Date(timestamp);
        return date.toLocaleString();
    }

    /**
     * Check if the browser has full or limited support
     * @returns {Object} Support information
     */
    getSupportInfo() {
        return {
            supported: this.isSupported,
            canRead: this.isSupported,
            canWrite: this.isSupported,
            browser: this.getBrowserInfo()
        };
    }

    /**
     * Get browser information for compatibility checking
     * @returns {Object} Browser info
     */
    getBrowserInfo() {
        const ua = navigator.userAgent;
        let browserName = 'Unknown';
        let hasFullSupport = false;

        if (ua.indexOf('Chrome') > -1 || ua.indexOf('Edg') > -1) {
            browserName = 'Chrome/Edge';
            hasFullSupport = true;
        } else if (ua.indexOf('Safari') > -1 && ua.indexOf('Chrome') === -1) {
            browserName = 'Safari';
            // Safari 16.4+ supports File System Access API
            const safariVersion = parseInt(ua.match(/Version\/(\d+)/)?.[1] || '0');
            hasFullSupport = safariVersion >= 16;
        } else if (ua.indexOf('Firefox') > -1) {
            browserName = 'Firefox';
            hasFullSupport = false; // Firefox has limited support
        }

        return {
            name: browserName,
            hasFullSupport: hasFullSupport,
            userAgent: ua
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FileSystemManager;
}