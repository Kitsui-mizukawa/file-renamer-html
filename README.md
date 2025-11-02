# File Renamer - Sequential File Naming Tool (AI TEST)

AI TESA web-based file renaming application that allows you to select a folder and rename all files sequentially based on either file size or creation date. Built with modern web technologies and runs entirely in your browser.\

https://kitsui-mizukawa.github.io/file-renamer-html/
## Features

- **Folder Selection**: Use native File System Access API to select any folder on your computer
- **Flexible Sorting**: Sort files by size (smallest/largest first) or creation date (oldest/newest first)
- **Custom Patterns**: Define your own naming patterns using `{number}` placeholder (e.g., `photo_{number}`, `document_{number}`)
- **Number Padding**: Choose from no padding to 5-digit padding (001, 002, etc.)
- **Live Preview**: See exactly what will be renamed before executing the operation
- **Collision Detection**: Automatically handles name conflicts and shows warnings
- **Progress Tracking**: Real-time progress indication during bulk operations
- **Error Handling**: Comprehensive error handling with detailed feedback

## Browser Support

- **Chrome/Edge 86+**: Full support (recommended)
- **Safari 16.4+**: Full support
- **Firefox 111+**: Limited support
- **Mobile browsers**: Limited functionality

## How to Use

1. **Select Folder**: Click "Choose Folder" to select the folder containing files you want to rename
2. **Configure Options**: Choose sorting criteria, set your naming pattern, and select number padding
3. **Preview Changes**: Review the preview table to see exactly what will be renamed
4. **Execute Renaming**: Click "Rename All Files" to perform the operation

## Installation & Running

Since this is a client-side web application, no installation is required:

1. Clone or download this repository
2. Open `index.html` in a supported browser, or:
3. Run a local server for better experience:
   ```bash
   # Using Python 3
   python3 -m http.server 8080

   # Or using Node.js (if you have http-server installed)
   npx http-server
   ```
4. Open `http://localhost:8080` in your browser

## Naming Patterns

The pattern system uses `{number}` as a placeholder for sequential numbering:

- `file_{number}` → file_001.jpg, file_002.pdf, file_003.png
- `photo_{number}` → photo_001.jpg, photo_002.png
- `document_{number}` → document_001.pdf, document_002.docx
- `image_{number}` → image_001.jpg, image_002.png

**Pattern Rules:**
- Must contain exactly one `{number}` placeholder
- Cannot contain invalid characters: `< > : " / \ | ? *`
- Maximum 200 characters total
- Cannot use reserved Windows names (CON, PRN, AUX, etc.)

## Number Padding Options

- **No padding**: 1, 2, 3...
- **2 digits**: 01, 02, 03...
- **3 digits**: 001, 002, 003... (default)
- **4 digits**: 0001, 0002, 0003...
- **5 digits**: 00001, 00002, 00003...

## Sorting Options

1. **Size (smallest to largest)**: Processes files from smallest to largest
2. **Size (largest to smallest)**: Processes files from largest to smallest
3. **Creation Date (oldest first)**: Processes files in chronological order
4. **Creation Date (newest first)**: Processes files in reverse chronological order

## Safety Features

- **Preview Before Execution**: Always shows what will be renamed before performing any operations
- **Collision Detection**: Automatically detects and resolves filename conflicts
- **Error Recovery**: Continues with remaining files if some operations fail
- **Local Processing**: All operations happen locally in your browser - no data leaves your computer
- **Operation Logging**: Detailed logs of all rename operations for debugging

## File Handling

- **File Extensions**: Original file extensions are preserved
- **Special Characters**: Handles files with special characters in names
- **Empty Files**: Processes 0-byte files correctly
- **No Extension Files**: Handles files without extensions properly
- **Multiple Extensions**: Uses the last dot for extension (e.g., `.tar.gz` becomes `.gz`)

## Error Handling

The application handles various error scenarios:

- **Permission Denied**: Clear instructions to allow folder access
- **File Not Found**: Handles files deleted during operation
- **Locked Files**: Skips files being used by other applications
- **Invalid Patterns**: Real-time validation with helpful error messages
- **Browser Compatibility**: Graceful fallbacks for unsupported browsers

## Privacy & Security

- **100% Local Processing**: No files are uploaded to any server
- **No Tracking**: No analytics or tracking scripts
- **Temporary Access**: File system access is requested only when needed
- **Memory Safe**: File handles are cleared after operations complete

## Project Structure

```
file-renamer-html/
├── index.html              # Main application HTML
├── css/
│   └── styles.css         # Complete application styles
├── js/
│   ├── app.js             # Main application controller
│   ├── fileSystem.js      # File System Access API wrapper
│   ├── sorter.js          # File sorting algorithms
│   ├── renamer.js         # Renaming logic and validation
│   └── ui.js              # UI interaction handlers
├── package.json           # Project metadata
└── README.md              # This file
```

## Technical Details

- **Language**: Vanilla JavaScript (ES6+)
- **API Used**: File System Access API
- **CSS**: Modern CSS with Flexbox/Grid
- **No Dependencies**: Pure web technologies
- **Responsive Design**: Works on desktop and mobile

## Troubleshooting

**"Browser Not Supported" Error**
- Use Chrome, Edge, or Safari 16.4+ for full functionality
- Update your browser to the latest version

**Permission Denied**
- Click "Allow" when prompted for folder access
- Try selecting the folder again if permission was denied

**Empty Folder**
- Ensure the selected folder contains files (not subdirectories)
- Check for hidden files if needed

**Operation Fails**
- Make sure files are not open in other applications
- Check for sufficient disk space
- Try with a smaller number of files first

## Contributing

This project uses modern web standards and is designed to be simple and reliable. Feel free to open issues or submit pull requests for improvements.

## License

MIT License - Feel free to use this tool for personal or commercial purposes.
