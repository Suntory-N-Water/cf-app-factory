import type { AppRecord, GeneratedApp } from '../domain/app';

export type GenerateAppInput = {
  readonly prompt: string;
};

export type GenerateAppDeps = {
  readonly generateAppCode: (prompt: string) => Promise<GeneratedApp>;
  readonly createApp: (
    app: GeneratedApp & { readonly prompt: string },
  ) => Promise<AppRecord>;
};

export async function generateApp(
  input: GenerateAppInput,
  deps: GenerateAppDeps,
): Promise<AppRecord> {
  const generated = await deps.generateAppCode(input.prompt);
  return deps.createApp({ ...generated, prompt: input.prompt });
}
