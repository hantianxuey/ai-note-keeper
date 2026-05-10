import pool from '../config/database';
import { embeddingService } from './embeddingService';
import { Citation } from '../types';

const CHUNK_SIZE = 500;
const CHUNK_OVERLAP = 50;

const MAX_VECTOR_DISTANCE_ABSOLUTE = 20;
const MAX_VECTOR_DISTANCE_RATIO = 1.15;
const MIN_VECTOR_DISTANCE_FOR_TRUST = 1.0;
const MAX_SNIPPET_LENGTH = 2000;
const MAX_CONTEXT_TOTAL_LENGTH = 8000;
const MAX_FALLBACK_RESULTS = 3;

function splitIntoChunks(text: string, chunkSize: number = CHUNK_SIZE, overlap: number = CHUNK_OVERLAP): string[] {
  if (!text || text.trim().length === 0) return [];
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    chunks.push(text.slice(start, start + chunkSize));
    start += chunkSize - overlap;
    if (start >= text.length) break;
  }
  return chunks;
}

function extractKeywords(text: string): string[] {
  const englishStopWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'can', 'shall', 'to', 'of', 'in', 'for',
    'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during',
    'before', 'after', 'above', 'below', 'between', 'out', 'off', 'over',
    'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when',
    'where', 'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more',
    'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
    'same', 'so', 'than', 'too', 'very', 'just', 'because', 'but', 'and',
    'or', 'if', 'while', 'about', 'up', 'it', 'its', 'this', 'that',
    'these', 'those', 'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he',
    'him', 'his', 'she', 'her', 'they', 'them', 'their', 'what', 'which',
    'who', 'whom',
  ]);

  const chineseStopWords = new Set([
    '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一',
    '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有',
    '看', '好', '自己', '这', '那', '有', '还', '什么', '吗', '呢', '吧',
    '讲了', '笔记', '测试', '讲', '吗', '呢', '吧', '啊',
  ]);

  const processed = text
    .toLowerCase()
    .replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, ' ');

  const englishWords = processed
    .match(/[a-zA-Z0-9]+/g) || [];

  const chineseWords: string[] = [];
  const chineseChars = processed.match(/[\u4e00-\u9fff]+/g) || [];
  for (const str of chineseChars) {
    for (let i = 0; i < str.length; i++) {
      if (i + 2 <= str.length) {
        chineseWords.push(str.slice(i, i + 3));
      }
      if (i + 1 <= str.length) {
        chineseWords.push(str.slice(i, i + 2));
      }
      chineseWords.push(str.slice(i, i + 1));
    }
  }

  const words = [...englishWords, ...chineseWords]
    .filter((w) => w.length > 0)
    .filter((w) => !englishStopWords.has(w))
    .filter((w) => !chineseStopWords.has(w));

  const freq = new Map<string, number>();
  for (const word of words) {
    freq.set(word, (freq.get(word) || 0) + 1);
  }

  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([word]) => word);
}

class VectorSearchService {
  private isChunkTableReady = false;

  private async ensureChunkTable(): Promise<boolean> {
    if (this.isChunkTableReady) return true;
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS note_chunks (
          id SERIAL PRIMARY KEY,
          note_id INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          chunk_index INTEGER NOT NULL DEFAULT 0,
          content TEXT NOT NULL,
          keywords TEXT[] DEFAULT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await pool.query('CREATE INDEX IF NOT EXISTS idx_note_chunks_note_id ON note_chunks(note_id)');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_note_chunks_user_id ON note_chunks(user_id)');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_note_chunks_keywords ON note_chunks USING GIN (keywords)');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_note_chunks_search ON note_chunks USING GIN (to_tsvector(\'english\', content))');
      this.isChunkTableReady = true;
      return true;
    } catch (error) {
      console.error('Failed to create note_chunks table:', error);
      return false;
    }
  }

  private getDefaultProvider(): string {
    return embeddingService.getDefaultProvider();
  }

  async indexNote(noteId: number, userId: number, title: string, content: string, provider?: string): Promise<void> {
    try {
      const ready = await this.ensureChunkTable();
      if (!ready) return;

      const effectiveProvider = provider || this.getDefaultProvider();
      const plainContent = content.replace(/<[^>]+>/g, '').replace(/[#*`>\-]/g, '');
      const fullText = `${title}\n\n${plainContent}`;
      const chunks = splitIntoChunks(fullText);

      await pool.query('DELETE FROM note_chunks WHERE note_id = $1', [noteId]);

      for (let i = 0; i < chunks.length; i++) {
        const chunkKeywords = extractKeywords(chunks[i]);
        await pool.query(
          `INSERT INTO note_chunks (note_id, user_id, chunk_index, content, keywords)
           VALUES ($1, $2, $3, $4, $5)`,
          [noteId, userId, i, chunks[i], chunkKeywords]
        );
      }

      embeddingService.indexNote(noteId, userId, title, plainContent, effectiveProvider).catch((error) => {
        console.warn(`Vector indexing failed for note ${noteId}:`, error);
      });
    } catch (error) {
      console.error(`Failed to index note ${noteId}:`, error);
    }
  }

  async removeNoteIndex(noteId: number, userId: number): Promise<void> {
    try {
      await pool.query('DELETE FROM note_chunks WHERE note_id = $1', [noteId]);
      embeddingService.removeNote(noteId, userId).catch((error) => {
        console.warn(`Vector remove failed for note ${noteId}:`, error);
      });
    } catch (error) {
      console.error(`Failed to remove note index ${noteId}:`, error);
    }
  }

  async search(userId: number, query: string, limit: number = 5, provider?: string): Promise<Citation[]> {
    try {
      console.log('🔍 Search called:', { userId, query, limit, provider });
      const ready = await this.ensureChunkTable();
      if (!ready) {
        console.log('⚠️ Chunk table not ready, returning demo citations');
        return this.getDemoCitations();
      }

      const effectiveProvider = provider || this.getDefaultProvider();
      console.log(`📌 Using embedding provider: ${effectiveProvider}`);
      let results: Array<{ note_id: number; title: string; snippet: string; rank: number; source: string }> = [];
      let fallbackCount = 0;
      let vectorTrustworthy = false;

      // ============ Layer 0: Vector Search (Highest Priority) ============
      console.log('🧠 Attempting vector search...');
      try {
        const vectorResults = await embeddingService.search(query, limit, effectiveProvider, userId);
        console.log(`📊 Vector search returned ${vectorResults.length} results`);

        if (vectorResults.length > 0) {
        // Sort by distance (ascending = most relevant first)
        vectorResults.sort((a, b) => a.distance - b.distance);
        
        // Use relative threshold: only keep results within 15% of the best result's distance
        const bestDistance = vectorResults[0].distance;
        const maxAllowedDistance = Math.min(
          MAX_VECTOR_DISTANCE_ABSOLUTE,
          bestDistance * MAX_VECTOR_DISTANCE_RATIO
        );
        
        const filteredResults = vectorResults.filter((r) => r.distance <= maxAllowedDistance);
        
        console.log(`📊 Vector search: ${vectorResults.length} results, ${filteredResults.length} after threshold (best=${bestDistance.toFixed(4)}, max=${maxAllowedDistance.toFixed(4)})`);
        
        if (filteredResults.length > 0 && bestDistance < MIN_VECTOR_DISTANCE_FOR_TRUST) {
          vectorTrustworthy = true;
        }
        
        for (const r of vectorResults) {
          const included = r.distance <= maxAllowedDistance ? '✓' : '✗';
          console.log(`   ${included} [${r.title}] distance=${r.distance.toFixed(4)}`);
        }

        results = filteredResults.map((r) => ({
          note_id: r.noteId,
          title: r.title,
          snippet: r.content.substring(0, MAX_SNIPPET_LENGTH) + (r.content.length > MAX_SNIPPET_LENGTH ? '...' : ''),
          rank: 1 - r.distance / (bestDistance || 1),
          source: 'vector',
        }));

        }
      } catch (error) {
        console.warn('⚠️ Vector search failed, falling back to keyword search:', error);
      }

      // ============ Layer 1: PostgreSQL Full-Text Search (Fallback) ============
      if (results.length < limit && !vectorTrustworthy) {
        const queryKeywords = extractKeywords(query);
        const tsTerms = queryKeywords.filter((w) => w.length > 2);

        if (tsTerms.length > 0) {
          const tsQuery = tsTerms.map((w) => w + ':*').join(' | ');
          console.log('🔎 Full-text search with query:', tsQuery);
          const fullTextResult = await pool.query(
            `SELECT n.id as note_id, n.title,
                    nc.content as snippet,
                    ts_rank_cd(to_tsvector('english', nc.content), to_tsquery($1)) as rank
             FROM note_chunks nc
             JOIN notes n ON n.id = nc.note_id
             WHERE n.user_id = $2
               AND to_tsvector('english', nc.content) @@ to_tsquery($1)
             ORDER BY rank DESC
             LIMIT $3`,
            [tsQuery, userId, limit]
          );
          console.log('📄 Full-text results:', fullTextResult.rows.length);

          const existingIds = new Set(results.map((r) => r.note_id));
          for (const row of fullTextResult.rows) {
            if (!existingIds.has(row.note_id) && results.length < limit && fallbackCount < MAX_FALLBACK_RESULTS) {
              results.push({
                ...row,
                snippet: row.snippet.substring(0, MAX_SNIPPET_LENGTH) + (row.snippet.length > MAX_SNIPPET_LENGTH ? '...' : ''),
                rank: row.rank * 0.5,
                source: 'fulltext',
              });
              existingIds.add(row.note_id);
              fallbackCount++;
            }
          }
        }

        // ============ Layer 2: ILIKE Fuzzy Match ============
        if (results.length < limit && queryKeywords.length > 0 && !vectorTrustworthy) {
          const existingIds = new Set(results.map((r) => r.note_id));
          const ilikeConditions = queryKeywords.map((_, i) => `nc.content ILIKE $${i + 3}`).join(' OR ');
          const ilikeParams = queryKeywords.map((w) => `%${w}%`);

          console.log('🔍 ILIKE search with:', queryKeywords);
          const ilikeResult = await pool.query(
            `SELECT n.id as note_id, n.title,
                    nc.content as snippet,
                    0.1 as rank
             FROM note_chunks nc
             JOIN notes n ON n.id = nc.note_id
             WHERE n.user_id = $1
               AND (${ilikeConditions})
             LIMIT $2`,
            [userId, limit - results.length, ...ilikeParams]
          );
          console.log('📄 ILIKE results:', ilikeResult.rows.length);

          for (const row of ilikeResult.rows) {
            if (!existingIds.has(row.note_id) && results.length < limit && fallbackCount < MAX_FALLBACK_RESULTS) {
              results.push({
                ...row,
                snippet: row.snippet.substring(0, MAX_SNIPPET_LENGTH) + (row.snippet.length > MAX_SNIPPET_LENGTH ? '...' : ''),
                rank: row.rank * 0.3,
                source: 'ilike',
              });
              existingIds.add(row.note_id);
              fallbackCount++;
            }
          }
        }

        // ============ Layer 3: Keyword Array Match ============
        if (results.length < limit && queryKeywords.length > 0 && !vectorTrustworthy) {
          const existingIds = new Set(results.map((r) => r.note_id));
          const keywordPlaceholders = queryKeywords.map((_, i) => `$${i + 3}`).join(',');

          console.log('🔍 Keywords array search with:', queryKeywords);
          const keywordResult = await pool.query(
            `SELECT DISTINCT n.id as note_id, n.title,
                    nc.content as snippet,
                    0.05 as rank
             FROM note_chunks nc
             JOIN notes n ON n.id = nc.note_id
             WHERE n.user_id = $1
               AND nc.keywords && ARRAY[${keywordPlaceholders}]
             LIMIT $2`,
            [userId, limit - results.length, ...queryKeywords]
          );
          console.log('📄 Keyword array results:', keywordResult.rows.length);

          for (const row of keywordResult.rows) {
            if (!existingIds.has(row.note_id) && results.length < limit && fallbackCount < MAX_FALLBACK_RESULTS) {
              results.push({
                ...row,
                snippet: row.snippet.substring(0, MAX_SNIPPET_LENGTH) + (row.snippet.length > MAX_SNIPPET_LENGTH ? '...' : ''),
                rank: row.rank * 0.2,
                source: 'keyword',
              });
              existingIds.add(row.note_id);
              fallbackCount++;
            }
          }
        }
      }

      if (results.length === 0) {
        console.log('⚠️ No results found, returning demo citations');
        return this.getDemoCitations();
      }

      console.log('✅ Search completed with', results.length, 'results, sources:', results.map((r) => r.source).join(', '));
      const seen = new Set<number>();
      return results
        .filter((r) => {
          if (seen.has(r.note_id)) return false;
          seen.add(r.note_id);
          return true;
        })
        .map((r) => ({
          noteId: r.note_id,
          noteTitle: r.title,
          snippet: r.snippet,
        }));
    } catch (error) {
      console.error('❌ Search failed, falling back to demo:', error);
      return this.getDemoCitations();
    }
  }

  private getDemoCitations(): Citation[] {
    return [
      { noteId: 1, noteTitle: 'Demo Note - AI Basics', snippet: 'This is a simulated citation from your knowledge base. In production mode with a real AI provider, the system would search through your actual notes to find relevant context.' },
      { noteId: 2, noteTitle: 'Demo Note - Project Notes', snippet: 'Demo mode simulates RAG functionality. Configure an API key in Settings to enable real AI-powered search.' },
    ];
  }

  async getContextForQuestion(userId: number, question: string, maxChunks: number = 5, provider?: string): Promise<{ context: string[]; citations: Citation[] }> {
    const citations = await this.search(userId, question, maxChunks, provider);
    
    let totalLength = 0;
    const context: string[] = [];
    for (let i = 0; i < citations.length; i++) {
      const c = citations[i];
      const entry = `[Source ${i + 1}: "${c.noteTitle}"]\n${c.snippet}`;
      if (totalLength + entry.length > MAX_CONTEXT_TOTAL_LENGTH) {
        const remaining = MAX_CONTEXT_TOTAL_LENGTH - totalLength;
        if (remaining > 100) {
          context.push(entry.substring(0, remaining) + '...');
          totalLength += remaining;
        }
        break;
      }
      context.push(entry);
      totalLength += entry.length;
    }
    
    return { context, citations: citations.slice(0, context.length) };
  }

  async reindexAllNotes(): Promise<number> {
    try {
      const ready = await this.ensureChunkTable();
      if (!ready) return 0;

      const defaultProvider = this.getDefaultProvider();
      console.log(`🔄 Reindexing all notes with provider: ${defaultProvider}`);

      const result = await pool.query('SELECT id, user_id, title, content FROM notes');
      let count = 0;
      for (const note of result.rows) {
        await this.indexNote(note.id, note.user_id, note.title, note.content, defaultProvider);
        count++;
      }
      console.log(`Reindexed ${count} notes with ${defaultProvider}`);
      return count;
    } catch (error) {
      console.error('Reindex failed:', error);
      return 0;
    }
  }
}

export const vectorSearchService = new VectorSearchService();