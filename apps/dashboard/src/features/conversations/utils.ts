export function convertStringToKeywords(str: string) {
    return str
        .toLowerCase() // Convert to lowercase
        .replace(/[^\w\s]/g, '') // Remove punctuation
        .replace(/[%_]/g, '\\$&') // Escape special characters for SQL
        .split(/\s+/) // Split by whitespace
        .filter(Boolean); // Remove empty strings
}