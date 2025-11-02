/**
 * FileSorter - Handles file sorting by size or creation date
 * Provides various sorting options and formatting utilities
 */
class FileSorter {
    constructor() {
        this.sortOptions = {
            'size-asc': { field: 'size', order: 'asc', label: 'Size (smallest to largest)' },
            'size-desc': { field: 'size', order: 'desc', label: 'Size (largest to smallest)' },
            'date-asc': { field: 'creationTime', order: 'asc', label: 'Creation Date (oldest first)' },
            'date-desc': { field: 'creationTime', order: 'desc', label: 'Creation Date (newest first)' }
        };
    }

    /**
     * Sort files according to the specified option
     * @param {Array} files - Array of file objects
     * @param {string} sortOption - Sort option key (e.g., 'size-asc', 'date-desc')
     * @returns {Array} Sorted array of files
     */
    sortFiles(files, sortOption) {
        if (!Array.isArray(files) || files.length === 0) {
            return [];
        }

        const option = this.sortOptions[sortOption];
        if (!option) {
            throw new Error(`Invalid sort option: ${sortOption}`);
        }

        // Create a copy to avoid modifying the original array
        const sortedFiles = [...files];

        return sortedFiles.sort((a, b) => {
            let valueA, valueB;

            switch (option.field) {
                case 'size':
                    valueA = a.size || 0;
                    valueB = b.size || 0;
                    break;
                case 'creationTime':
                    // Use creationTime if available, fallback to lastModified
                    valueA = a.creationTime || a.lastModified || 0;
                    valueB = b.creationTime || b.lastModified || 0;
                    break;
                default:
                    throw new Error(`Unknown sort field: ${option.field}`);
            }

            // Handle the sort order
            if (option.order === 'asc') {
                return valueA - valueB;
            } else {
                return valueB - valueA;
            }
        });
    }

    /**
     * Get all available sort options
     * @returns {Object} Sort options object
     */
    getSortOptions() {
        return this.sortOptions;
    }

    /**
     * Get label for a sort option
     * @param {string} sortOption - Sort option key
     * @returns {string} Label for the sort option
     */
    getSortOptionLabel(sortOption) {
        return this.sortOptions[sortOption]?.label || sortOption;
    }

    /**
     * Format file size for display
     * @param {number} bytes - Size in bytes
     * @param {number} decimals - Number of decimal places
     * @returns {string} Formatted size string
     */
    formatFileSize(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
    }

    /**
     * Format date for display
     * @param {number} timestamp - Unix timestamp in milliseconds
     * @param {Object} options - Date formatting options
     * @returns {string} Formatted date string
     */
    formatDate(timestamp, options = {}) {
        if (!timestamp || timestamp === 0) {
            return 'Unknown';
        }

        const date = new Date(timestamp);

        // Default formatting options
        const defaultOptions = {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };

        const formatOptions = { ...defaultOptions, ...options };

        try {
            return date.toLocaleString(undefined, formatOptions);
        } catch (error) {
            // Fallback to simple format if locale formatting fails
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        }
    }

    /**
     * Format date for short display (e.g., in table cells)
     * @param {number} timestamp - Unix timestamp in milliseconds
     * @returns {string} Short formatted date string
     */
    formatDateShort(timestamp) {
        if (!timestamp || timestamp === 0) {
            return 'Unknown';
        }

        const date = new Date(timestamp);
        const now = new Date();
        const diffTime = now - date;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            // Today - show time only
            return date.toLocaleTimeString(undefined, {
                hour: '2-digit',
                minute: '2-digit'
            });
        } else if (diffDays === 1) {
            // Yesterday
            return 'Yesterday ' + date.toLocaleTimeString(undefined, {
                hour: '2-digit',
                minute: '2-digit'
            });
        } else if (diffDays < 7) {
            // This week
            return date.toLocaleDateString(undefined, {
                weekday: 'short',
                hour: '2-digit',
                minute: '2-digit'
            });
        } else {
            // Older - show date only
            return date.toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        }
    }

    /**
     * Get file statistics for a set of files
     * @param {Array} files - Array of file objects
     * @returns {Object} Statistics object
     */
    getFileStats(files) {
        if (!Array.isArray(files) || files.length === 0) {
            return {
                totalFiles: 0,
                totalSize: 0,
                averageSize: 0,
                largestFile: null,
                smallestFile: null,
                oldestFile: null,
                newestFile: null,
                sizeBreakdown: {}
            };
        }

        let totalSize = 0;
        let largestFile = files[0];
        let smallestFile = files[0];
        let oldestFile = files[0];
        let newestFile = files[0];

        const sizeBreakdown = {
            'Bytes': 0,
            'KB': 0,
            'MB': 0,
            'GB': 0,
            'TB': 0
        };

        files.forEach(file => {
            const size = file.size || 0;
            totalSize += size;

            // Track largest and smallest
            if (size > (largestFile.size || 0)) {
                largestFile = file;
            }
            if (size < (smallestFile.size || 0)) {
                smallestFile = file;
            }

            // Track oldest and newest (using creationTime or lastModified)
            const fileTime = file.creationTime || file.lastModified || 0;
            const oldestTime = oldestFile.creationTime || oldestFile.lastModified || 0;
            const newestTime = newestFile.creationTime || newestFile.lastModified || 0;

            if (fileTime < oldestTime || oldestTime === 0) {
                oldestFile = file;
            }
            if (fileTime > newestTime) {
                newestFile = file;
            }

            // Size breakdown
            const sizeCategory = this.getSizeCategory(size);
            sizeBreakdown[sizeCategory]++;
        });

        const averageSize = totalSize / files.length;

        return {
            totalFiles: files.length,
            totalSize: totalSize,
            averageSize: averageSize,
            largestFile: largestFile,
            smallestFile: smallestFile,
            oldestFile: oldestFile,
            newestFile: newestFile,
            sizeBreakdown: sizeBreakdown,
            totalSizeFormatted: this.formatFileSize(totalSize),
            averageSizeFormatted: this.formatFileSize(averageSize)
        };
    }

    /**
     * Get size category for a file size
     * @param {number} bytes - Size in bytes
     * @returns {string} Size category
     */
    getSizeCategory(bytes) {
        if (bytes < 1024) return 'Bytes';
        if (bytes < 1024 * 1024) return 'KB';
        if (bytes < 1024 * 1024 * 1024) return 'MB';
        if (bytes < 1024 * 1024 * 1024 * 1024) return 'GB';
        return 'TB';
    }

    /**
     * Filter files by size range
     * @param {Array} files - Array of file objects
     * @param {number} minSize - Minimum size in bytes (inclusive)
     * @param {number} maxSize - Maximum size in bytes (inclusive)
     * @returns {Array} Filtered array of files
     */
    filterBySize(files, minSize = 0, maxSize = Infinity) {
        return files.filter(file => {
            const size = file.size || 0;
            return size >= minSize && size <= maxSize;
        });
    }

    /**
     * Filter files by date range
     * @param {Array} files - Array of file objects
     * @param {Date} startDate - Start date (inclusive)
     * @param {Date} endDate - End date (inclusive)
     * @returns {Array} Filtered array of files
     */
    filterByDate(files, startDate = null, endDate = null) {
        return files.filter(file => {
            const fileTime = file.creationTime || file.lastModified || 0;
            const fileDate = new Date(fileTime);

            if (startDate && fileDate < startDate) return false;
            if (endDate && fileDate > endDate) return false;

            return true;
        });
    }

    /**
     * Filter files by extension
     * @param {Array} files - Array of file objects
     * @param {Array|String} extensions - Extensions to include (with or without dot)
     * @returns {Array} Filtered array of files
     */
    filterByExtension(files, extensions) {
        if (!extensions) return files;

        const extensionList = Array.isArray(extensions) ? extensions : [extensions];
        const normalizedExtensions = extensionList.map(ext =>
            ext.startsWith('.') ? ext.toLowerCase() : '.' + ext.toLowerCase()
        );

        return files.filter(file => {
            const fileExt = (file.extension || '').toLowerCase();
            return normalizedExtensions.includes(fileExt);
        });
    }

    /**
     * Group files by extension
     * @param {Array} files - Array of file objects
     * @returns {Object} Files grouped by extension
     */
    groupByExtension(files) {
        const groups = {};

        files.forEach(file => {
            const ext = file.extension || '(no extension)';
            if (!groups[ext]) {
                groups[ext] = [];
            }
            groups[ext].push(file);
        });

        return groups;
    }

    /**
     * Search files by name (case-insensitive)
     * @param {Array} files - Array of file objects
     * @param {string} searchTerm - Search term
     * @returns {Array} Filtered array of files
     */
    searchByName(files, searchTerm) {
        if (!searchTerm || searchTerm.trim() === '') {
            return files;
        }

        const term = searchTerm.toLowerCase().trim();

        return files.filter(file => {
            return file.name.toLowerCase().includes(term);
        });
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FileSorter;
}