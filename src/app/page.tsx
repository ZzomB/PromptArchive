import { getPrompts } from '@/lib/notion';
import { PromptCatalog } from '@/components/PromptCatalog';

// Opt out of static rendering so we always check Notion for fresh prompts,
// while gracefully fallback during build time if environment variables are missing.
export const revalidate = 0;

export default async function Home() {
  const prompts = await getPrompts();

  return (
    <div className="w-full flex-grow flex flex-col">
      <PromptCatalog initialPrompts={prompts} />
    </div>
  );
}
