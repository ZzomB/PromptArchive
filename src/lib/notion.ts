import { Client } from '@notionhq/client';

const notionApiKey = process.env.NOTION_API_KEY;
const notionDatabaseId = process.env.NOTION_DATABASE_ID;

export interface Prompt {
  id: string;
  title: string;
  description: string;
  category: string;
  content: string;
  isFavorite: boolean;
}

// Mock data fallback with full Markdown formatting for local preview and testing
const MOCK_PROMPTS: Prompt[] = [
  {
    id: "mock-1",
    title: "비즈니스 영어 이메일 작성기",
    description: "업무용 격식 있는 영어 이메일을 상황에 맞춰 작성해 줍니다.",
    category: "작성",
    content: `# 역할 부여 및 목적
당신은 글로벌 테크 기업의 **전문 비즈니스 커뮤니케이션 코치**입니다.

## 지시사항
상황에 부합하는 격식 있고 자연스러운 비즈니스 영어 이메일을 작성해 주세요.

### 이메일 메타 정보
- **이메일 제목:** {{이메일 제목}}
- **이메일 톤:** {{이메일 톤, 예: 정중하고 격식 있는}}
- **핵심 전달 사항:** {{핵심 사항}}

---

## 상황 설명
{{상황 설명}}

## 출력 형식
1. **Subject Line**: 간결하고 명확한 제목
2. **Body**: 정중한 인사말과 서론, 명확한 본론 단락, 신속한 회신을 유도하는 결론
3. **Sign-off**: 적절한 맺음말(Sincerely, Best regards 등)`,
    isFavorite: true,
  },
  {
    id: "mock-2",
    title: "React 컴포넌트 리팩토링 어시스턴트",
    description: "가독성과 성능 향상을 위한 React 컴포넌트 리팩토링 가이드",
    category: "개발",
    content: `# React 코드 리팩토링 전문가

제공된 React 컴포넌트를 분석하고 클린 코드 원칙에 따라 리팩토링을 수행하세요.

## 리팩토링 목표
- **목표:** {{리팩토링 목표, 예: 가독성 개선 및 성능 최적화}}
- **상태 관리:** {{상태 관리 방식, 예: useState 및 Zustand}}

---

### 필수 준수 규칙
1. 단일 책임 원칙(SRP)을 준수하여 거대 컴포넌트를 작게 분리할 것
2. 불필요한 리렌더링을 방지하도록 메모이제이션 최적화
3. TypeScript 타입을 엄격하게 정의

> 💡 **주의**: 비즈니스 로직과 UI 렌더링 로직을 Custom Hook으로 명확히 분리하세요.

\`\`\`tsx
{{소스 코드}}
\`\`\``,
    isFavorite: false,
  },
  {
    id: "mock-3",
    title: "인스타그램 마케팅 카피라이터",
    description: "SNS 광고용 타겟 맞춤형 마케팅 카피라이팅 문구를 만듭니다.",
    category: "마케팅",
    content: `# 고효율 SNS 마케팅 카피라이터

우리는 **{{대상 고객}}**을 타겟으로 하는 브랜드입니다.
이번에 런칭하는 **{{제품명}}**의 핵심 USP는 다음과 같습니다:
- **핵심 장점:** {{핵심 장점}}

---

## 요청 사항
인스타그램 피드에 게시할 3가지 스타일의 카피를 생성해 주세요:
1. **호기심 유발형**: 사용자의 일상적 페인포인트를 짚는 오프닝 훅
2. **스토리텔링형**: 공감대를 형성하는 짧은 서사 구조
3. **직관적 혜택 강조형**: 숫자와 팩트 기반의 CTA 중심 문구

> ⚠️ 각 카피는 **{{글자수 제한, 예: 공백 포함 300자}}** 이내여야 하며, 전환율을 높일 타겟 해시태그 5개를 하단에 포함하세요.`,
    isFavorite: true,
  }
];

const notion = notionApiKey ? new Client({ auth: notionApiKey }) : null;

// Cache mechanism to prevent Notion API rate limits and ensure lightning-fast responses
let cachedPrompts: Prompt[] | null = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

// Safe whitespace-preserving Markdown formatter for Notion RichText
interface NotionRichTextItem {
  plain_text?: string;
  text?: { content: string; link: { url: string } | null };
  annotations?: {
    bold: boolean;
    italic: boolean;
    strikethrough: boolean;
    underline: boolean;
    code: boolean;
    color: string;
  };
  href?: string | null;
}

function formatRichTextItem(item: NotionRichTextItem): string {
  const content = item.text?.content || item.plain_text || '';
  if (!content) return '';

  const { bold, italic, strikethrough, underline, code } = item.annotations || {
    bold: false,
    italic: false,
    strikethrough: false,
    underline: false,
    code: false,
    color: 'default'
  };
  const href = item.href || item.text?.link?.url;

  // Extract leading and trailing whitespace to ensure valid Markdown syntax
  const leadingMatch = content.match(/^(\s*)/);
  const trailingMatch = content.match(/(\s*)$/);
  const leadingSpace = leadingMatch ? leadingMatch[1] : '';
  const trailingSpace = trailingMatch ? trailingMatch[1] : '';
  let trimmed = content.trim();

  if (!trimmed) {
    return content;
  }

  if (code) {
    trimmed = `\`${trimmed}\``;
  }
  if (bold) {
    trimmed = `**${trimmed}**`;
  }
  if (italic) {
    trimmed = `*${trimmed}*`;
  }
  if (strikethrough) {
    trimmed = `~~${trimmed}~~`;
  }
  if (underline) {
    trimmed = `<u>${trimmed}</u>`;
  }
  if (href) {
    trimmed = `[${trimmed}](${href})`;
  }

  return `${leadingSpace}${trimmed}${trailingSpace}`;
}

function richTextToMarkdown(richTextList?: NotionRichTextItem[]): string {
  if (!richTextList || !Array.isArray(richTextList)) return '';
  return richTextList.map(formatRichTextItem).join('');
}

// Recursively retrieve all child blocks for a given block ID (handles pagination)
interface NotionBlockResponse {
  id: string;
  type: string;
  has_children: boolean;
  [key: string]: unknown;
}

async function getBlockChildren(blockId: string): Promise<NotionBlockResponse[]> {
  if (!notion) return [];

  const results: NotionBlockResponse[] = [];
  let hasMore = true;
  let startCursor: string | undefined = undefined;

  try {
    while (hasMore) {
      const response = await notion.blocks.children.list({
        block_id: blockId,
        start_cursor: startCursor,
      });

      results.push(...(response.results as unknown as NotionBlockResponse[]));
      hasMore = response.has_more;
      startCursor = response.next_cursor || undefined;
    }
  } catch (error) {
    console.error(`❌ Error fetching children for block ${blockId}:`, error);
  }

  return results;
}

// Convert Notion block AST into structured CommonMark Markdown
async function blocksToMarkdown(blocks: NotionBlockResponse[], indent: string = ''): Promise<string> {
  let md = '';
  let numberedIndex = 1;

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const type = block.type;
    const data = block[type] as Record<string, unknown> | undefined;

    if (type !== 'numbered_list_item') {
      numberedIndex = 1;
    }

    switch (type) {
      case 'paragraph': {
        const text = richTextToMarkdown(data?.rich_text as NotionRichTextItem[] | undefined);
        md += text ? `${indent}${text}\n\n` : `\n`;
        break;
      }
      case 'heading_1': {
        const text = richTextToMarkdown(data?.rich_text as NotionRichTextItem[] | undefined);
        md += `\n# ${text}\n\n`;
        break;
      }
      case 'heading_2': {
        const text = richTextToMarkdown(data?.rich_text as NotionRichTextItem[] | undefined);
        md += `\n## ${text}\n\n`;
        break;
      }
      case 'heading_3': {
        const text = richTextToMarkdown(data?.rich_text as NotionRichTextItem[] | undefined);
        md += `\n### ${text}\n\n`;
        break;
      }
      case 'bulleted_list_item': {
        const text = richTextToMarkdown(data?.rich_text as NotionRichTextItem[] | undefined);
        md += `${indent}- ${text}\n`;
        if (block.has_children) {
          const children = await getBlockChildren(block.id);
          md += await blocksToMarkdown(children, indent + '  ');
        }
        break;
      }
      case 'numbered_list_item': {
        const text = richTextToMarkdown(data?.rich_text as NotionRichTextItem[] | undefined);
        md += `${indent}${numberedIndex++}. ${text}\n`;
        if (block.has_children) {
          const children = await getBlockChildren(block.id);
          md += await blocksToMarkdown(children, indent + '  ');
        }
        break;
      }
      case 'to_do': {
        const checked = Boolean(data?.checked);
        const text = richTextToMarkdown(data?.rich_text as NotionRichTextItem[] | undefined);
        md += `${indent}- [${checked ? 'x' : ' '}] ${text}\n`;
        if (block.has_children) {
          const children = await getBlockChildren(block.id);
          md += await blocksToMarkdown(children, indent + '  ');
        }
        break;
      }
      case 'toggle': {
        const text = richTextToMarkdown(data?.rich_text as NotionRichTextItem[] | undefined);
        md += `${indent}- ${text}\n`;
        if (block.has_children) {
          const children = await getBlockChildren(block.id);
          md += await blocksToMarkdown(children, indent + '  ');
        }
        break;
      }
      case 'quote': {
        const text = richTextToMarkdown(data?.rich_text as NotionRichTextItem[] | undefined);
        md += `> ${text.replace(/\n/g, '\n> ')}\n\n`;
        break;
      }
      case 'callout': {
        const iconData = data?.icon as { emoji?: string; external?: { url: string } } | undefined;
        const icon = iconData?.emoji || (iconData?.external?.url ? '📌' : '💡');
        const text = richTextToMarkdown(data?.rich_text as NotionRichTextItem[] | undefined);
        md += `> ${icon} ${text.replace(/\n/g, '\n> ')}\n\n`;
        break;
      }
      case 'divider': {
        md += `\n---\n\n`;
        break;
      }
      case 'code': {
        const lang = (data?.language as string) || '';
        const richText = data?.rich_text as NotionRichTextItem[] | undefined;
        const codeText = richText?.map(t => t.plain_text || '').join('') || '';
        md += `\n\`\`\`${lang}\n${codeText}\n\`\`\`\n\n`;
        break;
      }
      default: {
        if (data?.rich_text) {
          const text = richTextToMarkdown(data.rich_text as NotionRichTextItem[]);
          if (text) md += `${indent}${text}\n\n`;
        }
        break;
      }
    }
  }

  return md;
}

// Fetch page body blocks and convert to full Markdown
async function getPageMarkdown(pageId: string): Promise<string> {
  const blocks = await getBlockChildren(pageId);
  const markdown = await blocksToMarkdown(blocks);
  return markdown.trim();
}

interface NotionPageProperty {
  type?: string;
  title?: Array<{ plain_text: string }>;
  rich_text?: Array<{ plain_text: string }>;
  select?: { name: string };
  checkbox?: boolean;
}

interface NotionPageResponse {
  id: string;
  properties: Record<string, NotionPageProperty>;
}

export async function getPrompts(): Promise<Prompt[]> {
  // Check memory cache first
  const now = Date.now();
  if (cachedPrompts && now - lastCacheTime < CACHE_TTL_MS) {
    return cachedPrompts;
  }

  if (!notion || !notionDatabaseId) {
    console.warn("⚠️ Notion API Key or Database ID is missing. Falling back to Mock Data.");
    return MOCK_PROMPTS;
  }

  try {
    const response = await notion.databases.query({
      database_id: notionDatabaseId,
    });

    const pages = response.results as unknown as NotionPageResponse[];

    // Fetch page body markdown in parallel for all pages in the database
    const prompts: Prompt[] = await Promise.all(
      pages.map(async (page) => {
        const props = page.properties;

        const titleProp = props.Title || props.Name || props.title || props.name;
        const title = titleProp?.title?.[0]?.plain_text || "제목 없음";

        const descProp = props.Description || props.description;
        const description = descProp?.rich_text?.map((t) => t.plain_text).join("") || "";

        const categoryProp = props.Category || props.category;
        const category = categoryProp?.select?.name || "미분류";

        const favoriteProp = props.IsFavorite || props.isFavorite;
        const isFavorite = favoriteProp?.checkbox || false;

        // Fetch full Markdown content from body blocks
        const content = await getPageMarkdown(page.id);

        return {
          id: page.id,
          title,
          description,
          category,
          content,
          isFavorite,
        };
      })
    );

    // Update memory cache
    cachedPrompts = prompts;
    lastCacheTime = Date.now();

    return prompts;
  } catch (error) {
    console.error("❌ Error fetching prompts from Notion API:", error);
    return MOCK_PROMPTS;
  }
}

export async function getPromptById(id: string): Promise<Prompt | null> {
  // Check mock prompts
  if (id.startsWith("mock-")) {
    const mock = MOCK_PROMPTS.find(p => p.id === id);
    return mock || null;
  }

  // Check cached prompts first
  if (cachedPrompts && cachedPrompts.length > 0) {
    const found = cachedPrompts.find(p => p.id === id);
    if (found && found.content) {
      return found;
    }
  }

  if (!notion) {
    console.warn("⚠️ Notion Client is not initialized.");
    const mock = MOCK_PROMPTS.find(p => p.id === id);
    return mock || null;
  }

  try {
    const response = (await notion.pages.retrieve({ page_id: id })) as unknown as NotionPageResponse;
    const props = response.properties;

    const titleProp = props.Title || props.Name || props.title || props.name;
    const title = titleProp?.title?.[0]?.plain_text || "제목 없음";

    const descProp = props.Description || props.description;
    const description = descProp?.rich_text?.map((t) => t.plain_text).join("") || "";

    const categoryProp = props.Category || props.category;
    const category = categoryProp?.select?.name || "미분류";

    const favoriteProp = props.IsFavorite || props.isFavorite;
    const isFavorite = favoriteProp?.checkbox || false;

    // Fetch full Markdown from page blocks
    const content = await getPageMarkdown(id);

    const prompt: Prompt = {
      id: response.id,
      title,
      description,
      category,
      content,
      isFavorite,
    };

    // Update cache entry if cache exists
    if (cachedPrompts) {
      const idx = cachedPrompts.findIndex(p => p.id === id);
      if (idx >= 0) {
        cachedPrompts[idx] = prompt;
      } else {
        cachedPrompts.push(prompt);
      }
    }

    return prompt;
  } catch (error) {
    console.error(`❌ Error fetching prompt by ID (${id}) from Notion API:`, error);
    const mock = MOCK_PROMPTS.find(p => p.id === id);
    return mock || null;
  }
}
