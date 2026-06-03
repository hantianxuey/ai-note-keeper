import pool from '../config/database';
import { embeddingService } from './embeddingService';

type ComponentStatus = 'ok' | 'down';
type OverallStatus = 'ok' | 'degraded' | 'down';

interface ComponentCheck {
  status: ComponentStatus;
  message: string;
}

interface VectorStoreCheck extends ComponentCheck {
  url: string;
}

interface ReadinessBody {
  status: OverallStatus;
  checks: {
    database: ComponentCheck;
    vectorStore: VectorStoreCheck;
  };
}

interface ReadinessSnapshot {
  httpStatus: number;
  body: ReadinessBody;
}

interface ReadinessDependencies {
  database: Pick<typeof pool, 'query'>;
  vectorStore: Pick<typeof embeddingService, 'getVectorStoreStatus'>;
}

async function checkDatabase(database: Pick<typeof pool, 'query'>): Promise<ComponentCheck> {
  try {
    await database.query('SELECT 1');
    return {
      status: 'ok',
      message: 'PostgreSQL responded',
    };
  } catch (error) {
    return {
      status: 'down',
      message: 'PostgreSQL did not respond',
    };
  }
}

export async function createReadinessSnapshot(
  dependencies: ReadinessDependencies = {
    database: pool,
    vectorStore: embeddingService,
  }
): Promise<ReadinessSnapshot> {
  const [database, vectorStore] = await Promise.all([
    checkDatabase(dependencies.database),
    dependencies.vectorStore.getVectorStoreStatus(),
  ]);

  const status: OverallStatus = database.status === 'down'
    ? 'down'
    : vectorStore.status === 'down'
      ? 'degraded'
      : 'ok';

  return {
    httpStatus: database.status === 'down' ? 503 : 200,
    body: {
      status,
      checks: {
        database,
        vectorStore,
      },
    },
  };
}
