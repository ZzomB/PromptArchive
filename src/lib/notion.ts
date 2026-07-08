import { Client } from '@notionhq/client';

const notionApiKey = process.env.NOTION_API_KEY;
const notionDatabaseId = process.env.NOTION_DATABASE_ID;

// Mock data fallback to run locally and preview UI before Notion integration is configured
const MOCK_PROMPTS = [
  {
    id: "mock-1",
    title: "비즈니스 영어 이메일 작성기",
    description: "업무용 격식 있는 영어 이메일을 상황에 맞춰 작성해 줍니다.",
    category: "작성",
    content: "이메일 제목: {{이메일 제목}}\n\n상황 설명: {{상황 설명}}\n\n위 상황에 부합하는 격식 있고 자연스러운 비즈니스 영어 이메일을 작성해줘. 이메일 톤은 {{이메일 톤, 예: 정중한, 친근한, 강경한}}으로 설정하고, 핵심 전달 사항인 {{핵심 사항}}이 확실히 부합하게 해줘.",
    isFavorite: true,
  },
  {
    id: "mock-2",
    title: "React 컴포넌트 리팩토링 어시스턴트",
    description: "가독성과 성능 향상을 위한 React 컴포넌트 리팩토링 가이드",
    category: "개발",
    content: "아래 제공된 React 컴포넌트를 {{리팩토링 목표, 예: 가독성 개선, 성능 최적화}} 기준으로 리팩토링해줘. 컴포넌트 내의 {{상태 관리 방식, 예: useState, Zustand}}도 고려해서 리팩토링된 코드를 작성하고, 개선 사유를 명시해줘.\n\n[코드]\n{{소스 코드}}",
    isFavorite: false,
  },
  {
    id: "mock-3",
    title: "인스타그램 마케팅 카피라이터",
    description: "SNS 광고용 타겟 맞춤형 마케팅 카피라이팅 문구를 만듭니다.",
    category: "마케팅",
    content: "우리는 {{대상 고객}}을 타겟으로 하는 브랜드야. 이번 제품/서비스인 {{제품명}}의 핵심 장점은 {{핵심 장점}}이야. 인스타그램 피드에 올릴 유머러스하면서도 전문적인 3가지 버전의 카피를 생성해줘. 각각 {{글자수 제한}} 이내여야 하고 관련 해시태그 5개를 추가해줘.",
    isFavorite: true,
  },
  {
    id: "mock-4",
    title: "소설 캐릭터 프로필 설정 도구",
    description: "소설이나 시나리오 작성을 위한 상세 캐릭터 설정 템플릿",
    category: "창작",
    content: "이름: {{캐릭터 이름}}\n나이/성별: {{나이 및 성별}}\n직업/신분: {{직업 및 신분}}\n성격 특성: {{핵심 성격 3가지}}\n트라우마/비밀: {{과거사 혹은 트라우마}}\n\n위 프로필 정보를 기반으로, 이 캐릭터가 소설 내에서 {{직면할 갈등 상황}}에 처했을 때 어떻게 대처하고 어떤 감정 변화를 겪을지 3인칭 소설 문체로 500자 이내의 독백/사건 예시를 작성해줘.",
    isFavorite: false,
  },
  {
    id: "mock-5",
    title: "YouTube 영상 아웃라인 제안기",
    description: "구독자의 클릭을 부르는 영상 기획안 및 스크립트 개요 작성",
    category: "기획",
    content: "주요 주제: {{동영상 핵심 주제}}\n목표 시청자층: {{주요 타겟 독자}}\n\n위 주제를 다루는 10분 내외의 YouTube 비디오 아웃라인을 생성해줘. 오프닝 훅({{오프닝 전략}})을 포함하고, 본론 3단 구성 및 엔딩 콜투액션({{구독 유도 방안}})까지 단계별 타임라인과 핵심 메시지를 정리해줘.",
    isFavorite: true,
  }
];

export interface Prompt {
  id: string;
  title: string;
  description: string;
  category: string;
  content: string;
  isFavorite: boolean;
}

const notion = notionApiKey ? new Client({ auth: notionApiKey }) : null;

export async function getPrompts(): Promise<Prompt[]> {
  if (!notion || !notionDatabaseId) {
    console.warn("⚠️ Notion API Key or Database ID is missing. Falling back to Mock Data.");
    return MOCK_PROMPTS;
  }

  try {
    const response = await notion.databases.query({
      database_id: notionDatabaseId,
    });

    const prompts: Prompt[] = response.results.map((page: any) => {
      const props = page.properties;

      // Safe extraction of properties (handling potential casing or missing columns)
      const titleProp = props.Title || props.Name || props.title || props.name;
      const title = titleProp?.title?.[0]?.plain_text || "제목 없음";

      const descProp = props.Description || props.description;
      const description = descProp?.rich_text?.map((t: any) => t.plain_text).join("") || "";

      const categoryProp = props.Category || props.category;
      const category = categoryProp?.select?.name || "미분류";

      const contentProp = props.Content || props.content;
      const content = contentProp?.rich_text?.map((t: any) => t.plain_text).join("") || "";

      const favoriteProp = props.IsFavorite || props.isFavorite;
      const isFavorite = favoriteProp?.checkbox || false;

      return {
        id: page.id,
        title,
        description,
        category,
        content,
        isFavorite,
      };
    });

    return prompts;
  } catch (error) {
    console.error("❌ Error fetching prompts from Notion API:", error);
    return MOCK_PROMPTS;
  }
}

// Helper to retrieve block children recursively and compile text from page body
async function getPageBlocksText(pageId: string): Promise<string> {
  if (!notion) return "";
  
  try {
    let content = "";
    let hasMore = true;
    let startCursor: string | undefined = undefined;

    while (hasMore) {
      const response = await notion.blocks.children.list({
        block_id: pageId,
        start_cursor: startCursor,
      });

      for (const block of response.results as any[]) {
        const type = block.type;
        if (!type) continue;

        const blockContent = block[type];
        // Extract plain text from blocks that support rich_text
        if (blockContent && blockContent.rich_text) {
          const text = blockContent.rich_text.map((t: any) => t.plain_text).join("");
          content += text + "\n";
        }
      }

      hasMore = response.has_more;
      startCursor = response.next_cursor || undefined;
    }

    return content.trim();
  } catch (error) {
    console.error(`❌ Error fetching blocks for page ${pageId}:`, error);
    return "";
  }
}

export async function getPromptById(id: string): Promise<Prompt | null> {
  // If using mock data
  if (id.startsWith("mock-")) {
    const mock = MOCK_PROMPTS.find(p => p.id === id);
    return mock || null;
  }

  if (!notion) {
    console.warn("⚠️ Notion Client is not initialized.");
    const mock = MOCK_PROMPTS.find(p => p.id === id);
    return mock || null;
  }

  try {
    const response: any = await notion.pages.retrieve({ page_id: id });
    const props = response.properties;

    const titleProp = props.Title || props.Name || props.title || props.name;
    const title = titleProp?.title?.[0]?.plain_text || "제목 없음";

    const descProp = props.Description || props.description;
    const description = descProp?.rich_text?.map((t: any) => t.plain_text).join("") || "";

    const categoryProp = props.Category || props.category;
    const category = categoryProp?.select?.name || "미분류";

    // Fetch body blocks text instead of reading properties column
    const content = await getPageBlocksText(id);

    const favoriteProp = props.IsFavorite || props.isFavorite;
    const isFavorite = favoriteProp?.checkbox || false;

    return {
      id: response.id,
      title,
      description,
      category,
      content,
      isFavorite,
    };
  } catch (error) {
    console.error(`❌ Error fetching prompt by ID (${id}) from Notion API:`, error);
    // Attempt fallback to mock just in case
    const mock = MOCK_PROMPTS.find(p => p.id === id);
    return mock || null;
  }
}
