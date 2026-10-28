import type { Metadata } from 'next';
import ReviewListPage from '../review-list-page';

export const metadata: Metadata = {
  title: 'Sổ từ vựng cá nhân | Shadowtation',
  description: 'Ghi chép và lưu trữ các từ vựng bạn muốn học, dễ dàng tra cứu và ôn tập riêng biệt.',
};

export default function VocabularyPage() {
  return <ReviewListPage />;
}
