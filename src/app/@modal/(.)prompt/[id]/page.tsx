import { getPromptById } from '@/lib/notion';
import { PromptDetailModal } from '@/components/PromptDetailModal';
import { notFound } from 'next/navigation';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function InterceptedPromptPage({ params }: Props) {
  const { id } = await params;
  const prompt = await getPromptById(id);

  if (!prompt) {
    notFound();
  }

  return <PromptDetailModal prompt={prompt} isModal={true} />;
}
