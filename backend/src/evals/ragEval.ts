import crypto from 'crypto';

type RagEvalCitation = {
  noteTitle: string;
};

type RagEvalResult = {
  name: string;
  expectedCitationTitle?: string;
  expectRefusal?: boolean;
  answer: string;
  citations: RagEvalCitation[];
};

type RagEvalThresholds = {
  minRetrievalRecall: number;
  minCitationAccuracy: number;
  minEmptyContextRefusalRate: number;
};

type RagEvalCase = {
  name: string;
  question: string;
  noteTitle?: string;
  noteContent?: string;
  notes?: Array<{
    title: string;
    content: string;
  }>;
  expectedCitationTitle?: string;
  expectRefusal?: boolean;
};

type EvalSession = {
  cookies: Map<string, string>;
};

const defaultThresholds: RagEvalThresholds = {
  minRetrievalRecall: 1,
  minCitationAccuracy: 0.5,
  minEmptyContextRefusalRate: 1,
};

const evalCases: RagEvalCase[] = [
  {
    name: 'deployment rollback',
    question: 'How should a failed deployment roll back?',
    noteTitle: 'Deployment Runbook',
    noteContent: [
      'Production deployments must run a smoke test after switching symlinks.',
      'If the smoke test fails, switch frontend and backend symlinks back to the previous release.',
      'Then reload PM2 and Nginx before cleaning old releases.',
    ].join('\n'),
    expectedCitationTitle: 'Deployment Runbook',
  },
  {
    name: 'rag quality',
    question: 'Which metrics should RAG quality evaluation track?',
    noteTitle: 'RAG Quality Notes',
    noteContent: [
      'RAG evaluation should track retrieval recall, citation hit rate, and answer faithfulness.',
      'A small fixed dataset can catch regressions before release.',
      'Each case should name the expected source note and expected answer points.',
    ].join('\n'),
    expectedCitationTitle: 'RAG Quality Notes',
  },
  {
    name: 'empty context refusal',
    question: 'What does the knowledge base say about a non-existent Mars payroll policy?',
    expectRefusal: true,
  },
  {
    name: '中文检索',
    question: '生产部署失败后应该怎么回滚？',
    noteTitle: '中文部署手册',
    noteContent: [
      '生产部署切换软链接之后必须执行健康检查。',
      '如果健康检查失败，应该把前端和后端软链接切回上一个版本。',
      '回滚之后需要重新加载 PM2 和 Nginx。',
    ].join('\n'),
    expectedCitationTitle: '中文部署手册',
  },
  {
    name: 'long document retrieval',
    question: 'What is the retention policy for production logs?',
    noteTitle: 'Operations Handbook',
    noteContent: [
      'Section 1: release packaging. '.repeat(25),
      'Production logs are retained for 14 days, and old release directories are pruned after the five newest releases.',
      'Section 2: unrelated operational notes. '.repeat(25),
    ].join('\n'),
    expectedCitationTitle: 'Operations Handbook',
  },
  {
    name: 'multi document conflict',
    question: 'Which deployment smoke test policy is current?',
    notes: [
      {
        title: 'Old Deployment Policy',
        content: 'Old policy: deployment smoke tests were optional after symlink switches.',
      },
      {
        title: 'Current Deployment Policy',
        content: 'Current policy: deployment smoke tests are required after symlink switches and failures must roll back.',
      },
    ],
    expectedCitationTitle: 'Current Deployment Policy',
  },
];

const answerRefusesBecauseContextIsEmpty = (answer: string): boolean => {
  const normalized = answer.toLowerCase();
  return [
    'could not find reliable information',
    'no reliable basis',
    'does not contain enough information',
    'knowledge base has no reliable basis',
    '没有找到可靠依据',
    '没有可靠依据',
    '知识库里没有',
  ].some((phrase) => normalized.includes(phrase.toLowerCase()));
};

export const scoreRagEvalResults = (
  results: RagEvalResult[],
  thresholds: RagEvalThresholds = defaultThresholds
) => {
  const relevantResults = results.filter((result) => Boolean(result.expectedCitationTitle));
  const emptyContextResults = results.filter((result) => result.expectRefusal);
  const retrievalHits = relevantResults.filter((result) =>
    result.citations.some((citation) => citation.noteTitle === result.expectedCitationTitle)
  ).length;
  const citationMatches = relevantResults.reduce((count, result) => (
    count + result.citations.filter((citation) => citation.noteTitle === result.expectedCitationTitle).length
  ), 0);
  const citationTotal = relevantResults.reduce((count, result) => count + result.citations.length, 0);
  const emptyContextRefusals = emptyContextResults.filter((result) =>
    answerRefusesBecauseContextIsEmpty(result.answer) && result.citations.length === 0
  ).length;

  const totalCases = results.length;
  const retrievalRecall = relevantResults.length === 0 ? 1 : retrievalHits / relevantResults.length;
  const citationAccuracy = citationTotal === 0 ? 0 : citationMatches / citationTotal;
  const emptyContextRefusalRate = emptyContextResults.length === 0
    ? 1
    : emptyContextRefusals / emptyContextResults.length;

  return {
    totalCases,
    relevantCases: relevantResults.length,
    retrievalHits,
    retrievalRecall,
    citationMatches,
    citationTotal,
    citationAccuracy,
    emptyContextCases: emptyContextResults.length,
    emptyContextRefusals,
    emptyContextRefusalRate,
    passed:
      retrievalRecall >= thresholds.minRetrievalRecall &&
      citationAccuracy >= thresholds.minCitationAccuracy &&
      emptyContextRefusalRate >= thresholds.minEmptyContextRefusalRate,
    thresholds,
  };
};

const cookieHeader = (session?: EvalSession) => {
  if (!session || session.cookies.size === 0) {
    return undefined;
  }

  return Array.from(session.cookies.entries())
    .map(([name, value]) => `${name}=${encodeURIComponent(value)}`)
    .join('; ');
};

const rememberResponseCookies = (session: EvalSession | undefined, headers: Headers) => {
  if (!session) {
    return;
  }

  const getSetCookie = (headers as any).getSetCookie?.bind(headers);
  const setCookies = getSetCookie ? getSetCookie() : [headers.get('set-cookie')].filter(Boolean);

  for (const setCookie of setCookies) {
    const [cookiePair] = setCookie.split(';');
    const separatorIndex = cookiePair.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }

    const name = cookiePair.slice(0, separatorIndex);
    const value = cookiePair.slice(separatorIndex + 1);
    session.cookies.set(name, decodeURIComponent(value));
  }
};

const requestJson = async <T>(
  url: string,
  options: RequestInit & { session?: EvalSession } = {}
): Promise<T> => {
  const method = options.method || 'GET';
  const cookies = cookieHeader(options.session);
  const csrfToken = options.session?.cookies.get('csrf_token');
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(cookies ? { Cookie: cookies } : {}),
      ...(csrfToken && !['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase())
        ? { 'X-CSRF-Token': csrfToken }
        : {}),
      ...options.headers,
    },
  });
  rememberResponseCookies(options.session, response.headers);

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${options.method || 'GET'} ${url} failed: ${response.status} ${body}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const responseBody = await response.text();
  return (responseBody ? JSON.parse(responseBody) : undefined) as T;
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const registerEvalUser = async (apiUrl: string) => {
  const session: EvalSession = { cookies: new Map() };
  const email = `rag-eval-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
  const publicKeyResponse = await requestJson<{ publicKey: string }>(`${apiUrl}/security/public-key`);
  const encryptedPassword = crypto.publicEncrypt(
    {
      key: publicKeyResponse.publicKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256',
    },
    Buffer.from('rag-eval-password', 'utf8')
  ).toString('base64');
  const verificationResponse = await requestJson<{ devCode?: string }>(`${apiUrl}/auth/verification-code`, {
    method: 'POST',
    body: JSON.stringify({ email }),
  });

  if (!verificationResponse.devCode) {
    throw new Error('RAG eval requires dev verification codes in non-production CI');
  }

  await requestJson<{ user: { id: number } }>(`${apiUrl}/auth/register`, {
    method: 'POST',
    session,
    body: JSON.stringify({
      email,
      encryptedPassword,
      verificationCode: verificationResponse.devCode,
    }),
  });

  return session;
};

const createEvalNote = async (apiUrl: string, session: EvalSession, evalCase: RagEvalCase): Promise<number[]> => {
  const notes = evalCase.notes || (
    evalCase.noteTitle && evalCase.noteContent
      ? [{ title: evalCase.noteTitle, content: evalCase.noteContent }]
      : []
  );
  const noteIds: number[] = [];

  for (const note of notes) {
    const response = await requestJson<{ note: { id: number } }>(`${apiUrl}/notes`, {
      method: 'POST',
      session,
      body: JSON.stringify({
        title: note.title,
        content: note.content,
        tags: ['rag-eval'],
        category: 'evaluation',
      }),
    });
    noteIds.push(response.note.id);
  }

  return noteIds;
};

const deleteEvalNotes = async (apiUrl: string, session: EvalSession, noteIds: number[]) => {
  for (const noteId of noteIds) {
    await requestJson(`${apiUrl}/notes/${noteId}`, {
      method: 'DELETE',
      session,
    });
  }
};

const askWithRetry = async (
  apiUrl: string,
  session: EvalSession,
  evalCase: RagEvalCase
): Promise<RagEvalResult> => {
  let latest: RagEvalResult | null = null;

  for (let attempt = 1; attempt <= 8; attempt += 1) {
    const response = await requestJson<{
      answer: string;
      citations: RagEvalCitation[];
    }>(`${apiUrl}/rag/ask`, {
      method: 'POST',
      session,
      body: JSON.stringify({
        question: evalCase.question,
        provider: 'demo',
        model: 'demo-chat',
        embeddingProvider: 'demo',
      }),
    });

    latest = {
      name: evalCase.name,
      expectedCitationTitle: evalCase.expectedCitationTitle,
      expectRefusal: evalCase.expectRefusal,
      answer: response.answer,
      citations: response.citations || [],
    };

    if (
      evalCase.expectedCitationTitle &&
      latest.citations.some((citation) => citation.noteTitle === evalCase.expectedCitationTitle)
    ) {
      return latest;
    }

    if (
      evalCase.expectRefusal &&
      answerRefusesBecauseContextIsEmpty(latest.answer) &&
      latest.citations.length === 0
    ) {
      return latest;
    }

    await wait(750);
  }

  return latest!;
};

export const runRagEval = async (apiUrl: string) => {
  const session = await registerEvalUser(apiUrl);
  const results: RagEvalResult[] = [];

  for (const evalCase of evalCases) {
    const noteIds = await createEvalNote(apiUrl, session, evalCase);
    try {
      results.push(await askWithRetry(apiUrl, session, evalCase));
    } finally {
      await deleteEvalNotes(apiUrl, session, noteIds);
      await wait(750);
    }
  }

  const summary = scoreRagEvalResults(results);
  return {
    apiUrl,
    summary,
    results,
  };
};

const main = async () => {
  const apiUrl = process.env.RAG_EVAL_API_URL || 'http://127.0.0.1:3100/api';
  const report = await runRagEval(apiUrl);

  console.log(JSON.stringify(report, null, 2));

  if (!report.summary.passed) {
    process.exitCode = 1;
  }
};

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
