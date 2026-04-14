import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Part } from "@opencode-ai/sdk";

type SessionMessageRecord = {
  info: {
    id: string;
    role: "user" | "assistant";
    time?: {
      created?: number;
      completed?: number;
    };
  };
  parts: Part[];
};

type ClientLike = {
  session: {
    messages: (input: {
      sessionID: string;
      directory?: string;
      workspace?: string;
      limit?: number;
      before?: string;
    }) => Promise<SessionMessageRecord[]>;
  };
};

function formatPart(part: Part): string | null {
  if ("text" in part && typeof part.text === "string" && part.text.trim()) {
    return part.text.trim();
  }

  if ("tool" in part && typeof part.tool === "string") {
    return `[tool:${part.tool}]`;
  }

  if ("title" in part && typeof part.title === "string" && part.title.trim()) {
    return `[${part.title.trim()}]`;
  }

  return null;
}

function formatTimestamp(created?: number, completed?: number): string {
  const value = created ?? completed;
  if (!value) return "unknown-time";
  return new Date(value).toISOString();
}

export async function exportSessionTranscript(
  client: ClientLike,
  sessionID: string,
  directory: string,
): Promise<{ path: string; messageCount: number }> {
  const messages = await client.session.messages({
    sessionID,
    directory,
  });

  const body = messages
    .map(({ info, parts }) => {
      const renderedParts = parts.map(formatPart).filter((value): value is string => Boolean(value));
      return [
        `## ${info.role.toUpperCase()} ${formatTimestamp(info.time?.created, info.time?.completed)}`,
        renderedParts.join("\n\n") || "[no text content]",
      ].join("\n\n");
    })
    .join("\n\n---\n\n");

  const tempDir = await mkdtemp(join(tmpdir(), "opencode-mempalace-"));
  const path = join(tempDir, `${sessionID}.md`);
  await writeFile(path, body || "[empty session]", "utf8");

  return { path, messageCount: messages.length };
}
