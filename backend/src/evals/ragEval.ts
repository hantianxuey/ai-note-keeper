type RagEvalCitation = {
  noteTitle: string;
};

type RagEvalResult = {
  name: string;
  expectedCitationTitle: string;
  answer: string;
  citations: RagEvalCitation[];
};

type RagEvalThresholds = {
  minCitationHitRate: number;
};

type RagEvalCase = {
  name: string;
  question: string;
  noteTitle: string;
  noteContent: string;
  expectedCitationTitle: string;
};

const defaultThresholds: RagEvalThresholds = {
  minCitationHitRate: 1,
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
];

export const scoreRagEvalResults = (
  results: RagEvalResult[],
  thresholds: RagEvalThresholds = defaultThresholds
) => {
  const citationHits = results.filter((result) =>
    result.citations.some((citation) => citation.noteTitle === result.expectedCitationTitle)
  ).length;
  const totalCases = results.length;
  const citationHitRate = totalCases === 0 ? 0 : citationHits / totalCases;

  return {
    totalCases,
    citationHits,
    citationHitRate,
    passed: citationHitRate >= thresholds.minCitationHitRate,
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
  await requestJson(`${apiUrl}/notes`, {
    method: 'POST',
    token,
    body: JSON.stringify({
      title: evalCase.noteTitle,
      content: evalCase.noteContent,
      tags: ['rag-eval'],
      category: 'evaluation',
    }),
  });
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
      answer: response.answer,
      citations: response.citations || [],
    };

    if (latest.citations.some((citation) => citation.noteTitle === evalCase.expectedCitationTitle)) {
      return latest;
    }

    await wait(750);
  }

  return latest!;
};

export const runRagEval = async (apiUrl: string) => {
  const token = await registerEvalUser(apiUrl);
  const results: RagEvalResult[] = [];

  for (const evalCase of evalCases) {
    await createEvalNote(apiUrl, token, evalCase);
  }

  for (const evalCase of evalCases) {
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
import crypto from 'crypto';
