import type { Components } from 'react-markdown'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type BubbleVariant = 'user' | 'assistant'

const variantClasses: Record<BubbleVariant, { prose: string; components: Components }> = {
  assistant: {
    prose: 'text-slate-900',
    components: {
      p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
      strong: ({ children }) => <strong className="font-semibold text-slate-950">{children}</strong>,
      em: ({ children }) => <em className="italic">{children}</em>,
      ul: ({ children }) => <ul className="mb-2 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>,
      ol: ({ children }) => <ol className="mb-2 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>,
      li: ({ children }) => <li className="leading-relaxed">{children}</li>,
      a: ({ href, children }) => (
        <a
          href={href}
          className="font-medium text-blue-600 underline decoration-blue-600/40 underline-offset-2 hover:text-blue-700"
          target="_blank"
          rel="noopener noreferrer"
        >
          {children}
        </a>
      ),
      code: ({ className, children, ...props }) => {
        const isBlock = className?.includes('language-')
        if (isBlock) {
          return (
            <code
              className={`block overflow-x-auto rounded-lg bg-slate-900/90 p-3 text-xs text-slate-100 ${className ?? ''}`}
              {...props}
            >
              {children}
            </code>
          )
        }
        return (
          <code
            className="rounded bg-slate-200/90 px-1.5 py-0.5 font-mono text-[0.9em] text-slate-800"
            {...props}
          >
            {children}
          </code>
        )
      },
      pre: ({ children }) => <pre className="mb-2 overflow-x-auto last:mb-0">{children}</pre>,
      blockquote: ({ children }) => (
        <blockquote className="mb-2 border-l-4 border-slate-300 pl-3 text-slate-600 last:mb-0">{children}</blockquote>
      ),
      h1: ({ children }) => <h1 className="mb-2 text-base font-semibold last:mb-0">{children}</h1>,
      h2: ({ children }) => <h2 className="mb-2 text-base font-semibold last:mb-0">{children}</h2>,
      h3: ({ children }) => <h3 className="mb-1 text-sm font-semibold last:mb-0">{children}</h3>,
      hr: () => <hr className="my-3 border-slate-200" />,
    },
  },
  user: {
    prose: 'text-white',
    components: {
      p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
      strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
      em: ({ children }) => <em className="italic text-white/95">{children}</em>,
      ul: ({ children }) => <ul className="mb-2 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>,
      ol: ({ children }) => <ol className="mb-2 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>,
      li: ({ children }) => <li className="leading-relaxed">{children}</li>,
      a: ({ href, children }) => (
        <a
          href={href}
          className="font-medium text-white underline decoration-white/50 underline-offset-2"
          target="_blank"
          rel="noopener noreferrer"
        >
          {children}
        </a>
      ),
      code: ({ className, children, ...props }) => {
        const isBlock = className?.includes('language-')
        if (isBlock) {
          return (
            <code
              className={`block overflow-x-auto rounded-lg bg-black/25 p-3 text-xs text-white ${className ?? ''}`}
              {...props}
            >
              {children}
            </code>
          )
        }
        return (
          <code className="rounded bg-white/20 px-1.5 py-0.5 font-mono text-[0.9em]" {...props}>
            {children}
          </code>
        )
      },
      pre: ({ children }) => <pre className="mb-2 overflow-x-auto last:mb-0">{children}</pre>,
      blockquote: ({ children }) => (
        <blockquote className="mb-2 border-l-4 border-white/40 pl-3 text-white/90 last:mb-0">{children}</blockquote>
      ),
      h1: ({ children }) => <h1 className="mb-2 text-base font-semibold last:mb-0">{children}</h1>,
      h2: ({ children }) => <h2 className="mb-2 text-base font-semibold last:mb-0">{children}</h2>,
      h3: ({ children }) => <h3 className="mb-1 text-sm font-semibold last:mb-0">{children}</h3>,
      hr: () => <hr className="my-3 border-white/30" />,
    },
  },
}

export function ChatMarkdown({ content, variant }: { content: string; variant: BubbleVariant }) {
  const { prose, components } = variantClasses[variant]
  return (
    <div className={`min-w-0 text-left ${prose}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  )
}
