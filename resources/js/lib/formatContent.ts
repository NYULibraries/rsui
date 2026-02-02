import { toast } from 'sonner';

/**
 * Formats the content based on its detected type (JSON or XML) for better readability.
 * @param content The raw string content of the file.
 * @param type The detected type of the file ('json', 'xml', or 'text').
 * @returns The formatted string content, or the original content if formatting fails.
 */

const formatContent = (content: string, type: string): string => {
    if (!content) return '';

    try {
        if (type === 'json') {
            return JSON.stringify(JSON.parse(content), null, 2);
        } else if (type === 'xml') {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(content, 'application/xml');

            const errorNode = xmlDoc.querySelector('parsererror');
            if (errorNode) {
                throw new Error(`XML Parsing Error: ${errorNode.textContent}`);
            }

            const serializer = new XMLSerializer();
            const formattedXml = serializer.serializeToString(xmlDoc);

            let indent = '';
            let result = '';

            formattedXml.split(/>\s*</).forEach((node: string) => {
                if (node.match(/^\/\w/)) {
                    indent = indent.substring(2);
                }
                result += indent + '<' + node + '>\r\n';
                if (node.match(/^<?\w[^>]*[^/]$/) && !node.endsWith('/>')) {
                    indent += '  ';
                }
            });
            return result.trim();
        }
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        toast.error(`Error formatting ${type}.`, {
            description: message,
        });
        return content;
    }
    return content;
};

export default formatContent;
