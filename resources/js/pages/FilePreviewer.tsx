import FilePreviewer from '@/components/FilePreviewer';
import { FileItem } from '@/types';

const FilePreviewPage = ({ item }: { item: FileItem }) => {
    return <FilePreviewer item={item} />;
};

export default FilePreviewPage;
