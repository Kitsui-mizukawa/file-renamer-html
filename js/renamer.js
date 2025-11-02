/**
 * FileRenamer - Handles file renaming patterns, validation, and execution
 * Provides comprehensive naming pattern system with collision detection
 */
class FileRenamer {
    constructor(fileSystemManager) {
        this.fileSystemManager = fileSystemManager;
        this.operationLog = [];
        this.collisionResolutions = [];
    }

    /**
     * Validate naming pattern
     * @param {string} pattern - Naming pattern to validate
     * @returns {Object} Validation result with isValid and errors
     */
    validatePattern(pattern) {
        const errors = [];

        if (!pattern || pattern.trim() === '') {
            errors.push('Pattern cannot be empty');
            return { isValid: false, errors };
        }

        const trimmedPattern = pattern.trim();

        // Check for exactly one {number} placeholder
        const numberPlaceholders = (trimmedPattern.match(/{number}/g) || []).length;
        if (numberPlaceholders === 0) {
            errors.push('Pattern must contain exactly one {number} placeholder');
        } else if (numberPlaceholders > 1) {
            errors.push('Pattern must contain exactly one {number} placeholder');
        }

        // Check for invalid characters
        const invalidChars = /[<>:"/\\|?*\x00-\x1f]/;
        if (invalidChars.test(trimmedPattern)) {
            errors.push('Pattern contains invalid characters: < > : " / \\ | ? * or control characters');
        }

        // Check length
        if (trimmedPattern.length > 200) {
            errors.push('Pattern is too long (maximum 200 characters)');
        }

        // Check for reserved names (Windows)
        const reservedNames = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;
        const patternWithoutNumber = trimmedPattern.replace('{number}', '').trim();
        if (reservedNames.test(patternWithoutNumber)) {
            errors.push('Pattern cannot use reserved Windows names');
        }

        // Check if pattern would result in valid filename structure
        if (trimmedPattern.startsWith('.') || trimmedPattern.endsWith('.')) {
            errors.push('Pattern cannot start or end with a dot');
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Generate new filename with padding
     * @param {string} pattern - Naming pattern
     * @param {number} index - Sequential number
     * @param {number} padding - Number of digits for padding
     * @param {string} extension - File extension (with dot)
     * @returns {string} Generated filename
     */
    generateNewName(pattern, index, padding, extension) {
        // Pad the number with leading zeros
        const paddedNumber = String(index).padStart(padding, '0');

        // Replace {number} placeholder with padded number
        let newName = pattern.replace('{number}', paddedNumber);

        // Add extension if it exists
        if (extension && extension.trim() !== '') {
            newName += extension;
        }

        return newName;
    }

    /**
     * Check for name collisions and resolve them
     * @param {string} newName - Proposed new name
     * @param {Array} existingFiles - Array of existing file objects
     * @param {number} startIndex - Starting index for collision resolution
     * @returns {Promise<Object>} Collision resolution result
     */
    async checkForCollisions(newName, existingFiles, startIndex = 1) {
        const collisions = [];

        // Check against existing files
        for (const file of existingFiles) {
            if (file.name === newName) {
                collisions.push({
                    type: 'existing',
                    fileName: newName,
                    existingFile: file
                });
            }
        }

        // Check against files in the directory (using FileSystemManager)
        try {
            const fileExists = await this.fileSystemManager.fileExists(newName);
            if (fileExists) {
                collisions.push({
                    type: 'directory',
                    fileName: newName
                });
            }
        } catch (error) {
            // If we can't check, assume there might be a collision
            collisions.push({
                type: 'unknown',
                fileName: newName,
                error: error.message
            });
        }

        return {
            hasCollisions: collisions.length > 0,
            collisions: collisions,
            resolution: null
        };
    }

    /**
     * Resolve name collision by finding next available number
     * @param {string} pattern - Naming pattern
     * @param {number} currentIndex - Current index that caused collision
     * @param {number} padding - Number padding
     * @param {string} extension - File extension
     * @param {Array} existingFiles - Existing files to check against
     * @param {number} maxAttempts - Maximum attempts to find available name
     * @returns {Promise<Object>} Resolution result
     */
    async resolveCollision(pattern, currentIndex, padding, extension, existingFiles, maxAttempts = 1000) {
        let attempts = 0;

        while (attempts < maxAttempts) {
            const newIndex = currentIndex + attempts + 1;
            const newName = this.generateNewName(pattern, newIndex, padding, extension);

            const collisionCheck = await this.checkForCollisions(newName, existingFiles);

            if (!collisionCheck.hasCollisions) {
                return {
                    resolved: true,
                    newName: newName,
                    newIndex: newIndex,
                    attempts: attempts + 1,
                    originalIndex: currentIndex
                };
            }

            attempts++;
        }

        return {
            resolved: false,
            newName: null,
            newIndex: null,
            attempts: maxAttempts,
            originalIndex: currentIndex,
            error: `Could not resolve collision after ${maxAttempts} attempts`
        };
    }

    /**
     * Generate preview data for all files
     * @param {Array} files - Array of file objects
     * @param {string} pattern - Naming pattern
     * @param {number} padding - Number padding
     * @param {Object} options - Additional options
     * @returns {Promise<Object>} Preview data with collision detection
     */
    async generatePreview(files, pattern, padding, options = {}) {
        const {
            resolveCollisions = true,
            startIndex = 1
        } = options;

        // Validate pattern first
        const patternValidation = this.validatePattern(pattern);
        if (!patternValidation.isValid) {
            return {
                success: false,
                errors: patternValidation.errors,
                previewData: []
            };
        }

        const previewData = [];
        const usedNames = new Set();
        const collisionResolutions = [];
        let currentIndex = startIndex;

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            let newName = this.generateNewName(pattern, currentIndex, padding, file.extension);
            let actualIndex = currentIndex;
            let collisionResolved = false;

            // Check for collisions
            if (resolveCollisions) {
                const collisionCheck = await this.checkForCollisions(newName, files);

                if (collisionCheck.hasCollisions) {
                    const resolution = await this.resolveCollision(
                        pattern,
                        currentIndex,
                        padding,
                        file.extension,
                        files
                    );

                    if (resolution.resolved) {
                        newName = resolution.newName;
                        actualIndex = resolution.newIndex;
                        collisionResolved = true;

                        collisionResolutions.push({
                            originalFile: file,
                            originalName: file.name,
                            originalIndex: currentIndex,
                            resolvedName: newName,
                            resolvedIndex: actualIndex,
                            attempts: resolution.attempts
                        });
                    } else {
                        // Could not resolve collision
                        return {
                            success: false,
                            errors: [`Could not resolve naming collision for "${file.name}": ${resolution.error}`],
                            previewData: previewData
                        };
                    }
                }
            }

            // Check if name was already used (duplicate detection)
            if (usedNames.has(newName)) {
                return {
                    success: false,
                    errors: [`Duplicate name generated: "${newName}" for files "${file.name}"`],
                    previewData: previewData
                };
            }

            usedNames.add(newName);

            previewData.push({
                originalName: file.name,
                newName: newName,
                originalIndex: i + 1,
                actualIndex: actualIndex,
                file: file,
                collisionResolved: collisionResolved,
                size: file.size,
                creationTime: file.creationTime || file.lastModified,
                extension: file.extension
            });

            currentIndex = actualIndex + 1;
        }

        this.collisionResolutions = collisionResolutions;

        return {
            success: true,
            errors: [],
            previewData: previewData,
            collisionResolutions: collisionResolutions,
            totalFiles: files.length,
            pattern: pattern,
            padding: padding
        };
    }

    /**
     * Execute the renaming operation
     * @param {Array} previewData - Preview data from generatePreview
     * @param {Function} progressCallback - Callback for progress updates
     * @returns {Promise<Object>} Operation result
     */
    async executeRenaming(previewData, progressCallback = null) {
        const startTime = Date.now();
        const results = {
            successful: [],
            failed: [],
            totalFiles: previewData.length,
            startTime: startTime,
            endTime: null,
            duration: null
        };

        this.operationLog = [];

        for (let i = 0; i < previewData.length; i++) {
            const item = previewData[i];

            try {
                // Call progress callback if provided
                if (progressCallback) {
                    progressCallback(i + 1, previewData.length, item.originalName, item.newName);
                }

                // Perform the rename operation
                const success = await this.fileSystemManager.renameFile(
                    item.file.handle,
                    item.newName
                );

                if (success) {
                    results.successful.push({
                        originalName: item.originalName,
                        newName: item.newName,
                        file: item.file
                    });

                    this.operationLog.push({
                        timestamp: Date.now(),
                        operation: 'rename',
                        originalName: item.originalName,
                        newName: item.newName,
                        status: 'success'
                    });
                } else {
                    throw new Error('Rename operation returned false');
                }

            } catch (error) {
                results.failed.push({
                    originalName: item.originalName,
                    newName: item.newName,
                    file: item.file,
                    error: error.message
                });

                this.operationLog.push({
                    timestamp: Date.now(),
                    operation: 'rename',
                    originalName: item.originalName,
                    newName: item.newName,
                    status: 'failed',
                    error: error.message
                });
            }
        }

        const endTime = Date.now();
        results.endTime = endTime;
        results.duration = endTime - startTime;

        return results;
    }

    /**
     * Get the operation log
     * @returns {Array} Operation log entries
     */
    getOperationLog() {
        return this.operationLog;
    }

    /**
     * Get collision resolutions from last preview generation
     * @returns {Array} Collision resolution information
     */
    getCollisionResolutions() {
        return this.collisionResolutions;
    }

    /**
     * Clear operation log and collision resolutions
     */
    clearLogs() {
        this.operationLog = [];
        this.collisionResolutions = [];
    }

    /**
     * Extract file extension from filename
     * @param {string} filename - Filename to extract extension from
     * @returns {string} File extension (including dot) or empty string
     */
    extractExtension(filename) {
        if (!filename) return '';

        const lastDotIndex = filename.lastIndexOf('.');
        if (lastDotIndex === -1 || lastDotIndex === filename.length - 1) {
            return '';
        }

        return filename.substring(lastDotIndex);
    }

    /**
     * Sanitize filename by removing or replacing invalid characters
     * @param {string} filename - Filename to sanitize
     * @returns {string} Sanitized filename
     */
    sanitizeFilename(filename) {
        if (!filename) return '';

        // Replace invalid characters with underscores
        return filename
            .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
            .replace(/\s+/g, ' ') // Replace multiple spaces with single space
            .trim();
    }

    /**
     * Validate filename against common naming constraints
     * @param {string} filename - Filename to validate
     * @returns {Object} Validation result
     */
    validateFilename(filename) {
        const errors = [];

        if (!filename || filename.trim() === '') {
            errors.push('Filename cannot be empty');
            return { isValid: false, errors };
        }

        const trimmedName = filename.trim();

        // Length check
        if (trimmedName.length > 255) {
            errors.push('Filename is too long (maximum 255 characters)');
        }

        // Invalid characters check
        const invalidChars = /[<>:"/\\|?*\x00-\x1f]/;
        if (invalidChars.test(trimmedName)) {
            errors.push('Filename contains invalid characters: < > : " / \\ | ? * or control characters');
        }

        // Reserved names check (Windows)
        const nameWithoutExt = trimmedName.replace(/\.[^.]+$/, ''); // Remove extension
        const reservedNames = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;
        if (reservedNames.test(nameWithoutExt)) {
            errors.push('Filename cannot use reserved Windows names');
        }

        // Dot rules
        if (trimmedName.startsWith('.') || trimmedName.endsWith('.')) {
            errors.push('Filename cannot start or end with a dot');
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FileRenamer;
}