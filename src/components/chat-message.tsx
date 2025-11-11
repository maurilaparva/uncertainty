import { Message } from "ai";
import { cn } from "../lib/utils";
import { IconOpenAI, IconUser } from "./ui/icons";
import { MemoizedReactMarkdown } from "./markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { CodeBlock } from "./ui/codeblock";
import { CustomGraphEdge, CustomGraphNode } from "../lib/types";
import rehypeRaw from "rehype-raw";
import { categoryColorMapping } from "../lib/utils";

export interface ChatMessageProps {
  message: Message;
  nodes: CustomGraphNode[];
  edges: CustomGraphEdge[];
  clickedNode: any;
  labelToColor?: Map<string, string>;
}

function bestTextColor(bg: string): string {
  const toRGB = (s: string) => {
    if (!s) return [255, 255, 255];
    if (s.startsWith("#")) {
      const n = s.slice(1);
      const r = parseInt(n.length === 3 ? n[0] + n[0] : n.slice(0, 2), 16);
      const g = parseInt(n.length === 3 ? n[1] + n[1] : n.slice(2, 4), 16);
      const b = parseInt(n.length === 3 ? n[2] + n[2] : n.slice(4, 6), 16);
      return [r, g, b];
    }
    const m = s.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : [255, 255, 255];
  };
  const [r, g, b] = toRGB(bg).map((v) => v / 255);
  const lin = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return L > 0.5 ? "#111" : "white";
}

export function ChatMessage({
  message,
  nodes,
  edges,
  clickedNode,
  labelToColor,
  ...props
}: ChatMessageProps) {
  function formatText(input: string): string {
    input = input.split("||")[0];

    const entityPattern = /\[([^\]\|]+)(?:\|[^\]]+)?\]\(\$N\d+\)/g;
    const relationPattern =
      /\[([^\]]+)\]\(\$R\d+,\s*\$N\d+,\s*\$N\d+(?:;\s*\$R\d+,\s*\$N\d+,\s*\$N\d+)*\)/g;

    let formattedText = input.replace(entityPattern, (_full, label: string) => {
      const key = String(label).toLowerCase().trim();
      const bg = (labelToColor && labelToColor.get(key)) ?? "#e5e7eb";
      const fg = bestTextColor(bg);
      return `<mark class="node" style="background-color:${bg}; color:${fg}; border-radius:4px; padding:0 4px;">${label}</mark>`;
    });

    formattedText = formattedText.replace(
      relationPattern,
      (_f, relLabel: string) =>
        `<mark class="rel underline" style="background-color:transparent; color:inherit">${relLabel}</mark>`
    );

    nodes.forEach((node) => {
      const gptName = (node.data as any)?.gptName;
      if (!gptName) return;

      const isNodeClicked = clickedNode?.data?.gptName === gptName;
      const category = (node as any).category;
      const bg =
        (labelToColor &&
          labelToColor.get(String(gptName).toLowerCase().trim())) ||
        categoryColorMapping[category] ||
        "#e5e7eb";
      const fg = bestTextColor(bg);
      const tailwindClasses = isNodeClicked ? "font-bold border-2 border-black" : "";

      const highlightRegex = new RegExp(
        `(${gptName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
        "gi"
      );
      formattedText = formattedText.replace(
        highlightRegex,
        `<mark class="${tailwindClasses}" style="background-color:${bg}; color:${fg}; border-radius:4px; padding:0 4px;">$1</mark>`
      );
    });

    return formattedText;
  }

  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";

  return (
    <div className={cn("group relative mb-4 flex items-start md:-ml-12")} {...props}>
      {/* Avatar */}
      <div
        className={cn(
          "flex size-8 shrink-0 select-none items-center justify-center rounded-md border shadow",
          isUser ? "bg-background" : "bg-primary text-primary-foreground"
        )}
      >
        {isUser ? <IconUser /> : <IconOpenAI />}
      </div>

      {/* Message body */}
      <div
        className={cn(
          "flex-1 min-w-0 px-1 ml-4 space-y-2 overflow-hidden",
          isAssistant ? "overflow-y-auto max-h-96" : "overflow-y-hidden"
        )}
      >
        {isUser ? (
          // --- User message (question) ---
          <div
            className="text-lg font-medium text-neutral-800 tracking-tight leading-snug mb-2"
            style={{
              fontFamily: "Inter, system-ui, sans-serif",
              WebkitFontSmoothing: "antialiased",
              MozOsxFontSmoothing: "grayscale",
            }}
          >
            {message.content}
          </div>
        ) : (
          // --- Assistant message (answer) ---
          <MemoizedReactMarkdown
            className="prose break-words dark:prose-invert prose-p:leading-relaxed prose-pre:p-0"
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeRaw] as any}
            components={{
              p({ children }) {
                return <p className="mb-2 last:mb-0">{children}</p>;
              },
              code({ node, inline, className, children, ...props }) {
                if (children.length) {
                  if (children[0] == "▍") {
                    return (
                      <span className="mt-1 cursor-default animate-pulse">▍</span>
                    );
                  }
                  children[0] = (children[0] as string).replace("`▍`", "▍");
                }
                const match = /language-(\w+)/.exec(className || "");
                if (inline) {
                  return (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                }
                return (
                  <CodeBlock
                    key={Math.random()}
                    language={(match && match[1]) || ""}
                    value={String(children).replace(/\n$/, "")}
                    {...props}
                  />
                );
              },
            }}
          >
            {formatText(message.content)}
          </MemoizedReactMarkdown>
        )}
      </div>
    </div>
  );
}
