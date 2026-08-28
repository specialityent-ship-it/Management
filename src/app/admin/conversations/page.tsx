import { prisma } from "@/lib/db";
import { integrations } from "@/lib/config";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Chatbot" };

export default async function ConversationsPage() {
  const conversations = await prisma.conversation.findMany({
    orderBy: { updatedAt: "desc" },
    take: 40,
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">Chatbot conversations</h1>
        <p className="mt-1 text-sm text-ink-600">
          What visitors are asking the assistant on your website.
        </p>
      </div>

      {!integrations.anthropic && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          The assistant is not configured. Add <code>ANTHROPIC_API_KEY</code> to your environment to
          switch it on.
        </div>
      )}

      {conversations.length === 0 ? (
        <p className="card px-5 py-14 text-center text-sm text-ink-500">
          No conversations yet.
        </p>
      ) : (
        <div className="space-y-4">
          {conversations.map((conversation) => (
            <details key={conversation.id} className="card overflow-hidden">
              <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                <div>
                  <p className="text-sm font-medium text-ink-900">
                    {conversation.visitorName ?? "Anonymous visitor"}
                    {conversation.visitorPhone && (
                      <span className="ml-2 font-normal text-ink-500">
                        {conversation.visitorPhone}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-ink-500">
                    {conversation.messages.length} messages · last{" "}
                    {formatDateTime(conversation.updatedAt)}
                  </p>
                </div>
                <span className="badge bg-ink-100 text-ink-600 ring-ink-200">
                  {conversation.sessionKey.slice(0, 8)}
                </span>
              </summary>

              <ul className="space-y-3 border-t border-ink-200 bg-ink-50 p-5">
                {conversation.messages.map((message) => (
                  <li
                    key={message.id}
                    className={message.role === "USER" ? "flex justify-end" : "flex justify-start"}
                  >
                    <div
                      className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm ${
                        message.role === "USER"
                          ? "rounded-br-sm bg-brand-600 text-white"
                          : "rounded-bl-sm border border-ink-200 bg-white text-ink-800"
                      }`}
                    >
                      {message.content}
                    </div>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
