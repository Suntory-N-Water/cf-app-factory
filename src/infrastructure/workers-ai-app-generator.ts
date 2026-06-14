import * as v from 'valibot';
import { AI_MODEL } from '../config/constants';
import type { GeneratedApp } from '../domain/app';
import { APP_GENERATOR_SYSTEM_PROMPT } from './app-generator-prompt';

const generatedAppSchema = v.object({
  name: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(80)),
  code: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(80_000)),
});

export async function generateAppCodeWithWorkersAi(
  ai: Ai,
  prompt: string,
): Promise<GeneratedApp> {
  const aiResult = await ai.run(AI_MODEL, {
    messages: [
      { role: 'system', content: APP_GENERATOR_SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.2,
    max_tokens: 6_000,
  });

  const generated = parseGeneratedAppResponse(
    (aiResult as { readonly response?: unknown }).response,
  );

  const parsed = v.safeParse(generatedAppSchema, generated);
  if (!parsed.success) {
    console.error('生成結果の検証に失敗しました', generated);
    throw new Error('生成されたアプリの形式が不正です');
  }

  if (!parsed.output.code.includes('export class App')) {
    throw new Error('生成コードに App クラスがありません');
  }

  return parsed.output;
}

function parseGeneratedAppResponse(response: unknown): unknown {
  if (typeof response !== 'string') {
    return response;
  }

  try {
    return JSON.parse(response);
  } catch (error) {
    console.error('生成結果の JSON 解析に失敗しました', String(error));
    throw new Error('アプリ生成結果を解析できませんでした');
  }
}
