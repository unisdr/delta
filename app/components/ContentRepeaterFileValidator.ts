class ContentRepeaterFileValidator {
    static readonly allowedExtensions = [
      // Images
      "jpg", "jpeg", "png", "gif", "webp", "bmp", "svg", "tiff", "ico",
    
      // Documents
      "pdf", "doc", "docx", "txt", "md", "odt", "rtf",
    
      // Spreadsheets
      "xls", "xlsx", "ods", "csv",
    
      // Presentations
      "ppt", "pptx", "odp",
    
      // Audio
      "mp3", "wav", "ogg", "m4a", "aac", "flac",
    
      // Video
      "mp4", "avi", "mkv", "mov", "wmv", "webm", "flv",
    
      // Archives
      "zip", "rar", "7z", "tar", "gz", "tgz",
    
      // Programming and Markup
      //"html", "htm", "css", "js", "json", "xml", "yml", "yaml",
    
      // Executables and Disk Images
      //"exe", "dmg", "iso", "apk", "deb", "rpm"
    ];
  
    static readonly maxFileSize = 10_000_000; // 10 MB
  
    static isValidExtension(fileName: string): boolean {
      const extension = fileName.split(".").pop()?.toLowerCase();
      return extension ? this.allowedExtensions.includes(extension) : false;
    }
  
    static isValidSize(fileSize: number): boolean {
      return fileSize <= this.maxFileSize;
    }
  }
  
  export default ContentRepeaterFileValidator;  