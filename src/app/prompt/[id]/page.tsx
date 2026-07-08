import { getPromptById } from '@/lib/notion';
import { PromptDetailModal } from '@/components/PromptDetailModal';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function DirectPromptPage({ params }: Props) {
  const { id } = await params;
  const prompt = await getPromptById(id);

  if (!prompt) {
    notFound();
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 flex flex-col gap-6">
      {/* Back to list button */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary transition-colors w-fit"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>전체 목록으로 돌아가기</span>
      </Link>

      {/* Main Full-Page Content Card */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <PromptDetailModal prompt={prompt} isModal={false} />
      </div>
    </div>
  );
}
