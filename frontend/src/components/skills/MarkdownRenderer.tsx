import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import "github-markdown-css/github-markdown-light.css";

function CodeBlock({ language, children }: { language: string; children: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <button
        onClick={handleCopy}
        className="absolute right-2 top-2 p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-gray-700 hover:bg-gray-100"
      >
        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
      <SyntaxHighlighter
        language={language || "text"}
        style={oneLight}
        customStyle={{
          margin: 0,
          padding: "16px",
          borderRadius: "6px",
          fontSize: "13px",
          fontFamily:
            "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace",
          background: "#f6f8fa",
          border: "1px solid #d1d9e0",
        }}
        codeTagProps={{
          style: { background: "transparent" },
        }}
      >
        {children}
      </SyntaxHighlighter>
    </div>
  );
}

export function MarkdownRenderer({ content }: { content: string }) {
  // Strip frontmatter
  let body = content;
  if (body.startsWith("---")) {
    const parts = body.split("---");
    if (parts.length >= 3) {
      body = parts.slice(2).join("---").trim();
    }
  }

  return (
    <div className="markdown-body" style={{ background: "transparent" }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          pre({ children }) {
            return <>{children}</>;
          },
          code({ className, children, node: _node, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            const codeString = String(children).replace(/\n$/, "");
            if (match) {
              return <CodeBlock language={match[1]}>{codeString}</CodeBlock>;
            }
            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
        }}
      >
        {body}
      </ReactMarkdown>
    </div>
  );
}
