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

const requestJson = async <T>(
  url: string,
  options: RequestInit & { token?: string } = {}
): Promise<T> => {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${options.method || 'GET'} ${url} failed: ${response.status} ${body}`);
  }

  return response.json() as Promise<T>;
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const registerEvalUser = async (apiUrl: string) => {
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

  const response = await requestJson<{ token: string }>(`${apiUrl}/auth/register`, {
    method: 'POST',
    body: JSON.stringify({
      email,
      encryptedPassword,
      verificationCode: verificationResponse.devCode,
    }),
  });

  return response.token;
};

const createEvalNote = async (apiUrl: string, token: string, evalCase: RagEvalCase) => {
  const notes = evalCase.notes || (
    evalCase.noteTitle && evalCase.noteContent
      ? [{ title: evalCase.noteTitle, content: evalCase.noteContent }]
      : []
  );

  for (const note of notes) {
    await requestJson(`${apiUrl}/notes`, {
      method: 'POST',
      token,
      body: JSON.stringify({
        title: note.title,
        content: note.content,
        tags: ['rag-eval'],
        category: 'evaluation',
      }),
    });
  }
};

const askWithRetry = async (
  apiUrl: string,
  token: string,
  evalCase: RagEvalCase
): Promise<RagEvalResult> => {
  let latest: RagEvalResult | null = null;

  for (let attempt = 1; attempt <= 8; attempt += 1) {
    const response = await requestJson<{
      answer: string;
      citations: RagEvalCitation[];
    }>(`${apiUrl}/rag/ask`, {
      method: 'POST',
      token,
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
  const token = await registerEvalUser(apiUrl);
  const results: RagEvalResult[] = [];
  const emptyContextCases = evalCases.filter((evalCase) => evalCase.expectRefusal);
  const retrievalCases = evalCases.filter((evalCase) => !evalCase.expectRefusal);

  for (const evalCase of emptyContextCases) {
    results.push(await askWithRetry(apiUrl, token, evalCase));
  }

  for (const evalCase of retrievalCases) {
    await createEvalNote(apiUrl, token, evalCase);
  }

  for (const evalCase of retrievalCases) {
    results.push(await askWithRetry(apiUrl, token, evalCase));
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
