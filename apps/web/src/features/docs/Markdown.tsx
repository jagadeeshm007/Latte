import { Link } from "@tanstack/react-router";
import { Lexer, type MarkedToken, type Token, type Tokens } from "marked";
import { Fragment, type ReactNode } from "react";

import { CodeBlock } from "@/features/developers/CodeBlock";

import { headingId } from "./heading-id";

// Markdown as React elements, built from marked's tokens rather than its HTML
// output: React escapes every string, raw HTML in a page shows as text, and
// a link only becomes a link for a safe destination. No innerHTML anywhere.

const PAGE_LINK = /^([\w-]+)\.md(?:#([\w-]+))?$/;
const EXTERNAL = /^(https?:|mailto:)/i;

function DocLink({ href, children }: { href: string; children: ReactNode }) {
  const page = PAGE_LINK.exec(href);
  if (page?.[1]) {
    return (
      <Link to="/docs/$page" params={{ page: page[1] }} hash={page[2]} className="doc-link">
        {children}
      </Link>
    );
  }
  if (EXTERNAL.test(href)) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className="doc-link">
        {children}
      </a>
    );
  }
  // Same-site paths (/openapi.json, /llms.txt) and anchors on this page.
  if (href.startsWith("/") || href.startsWith("#")) {
    return (
      <a href={href} className="doc-link">
        {children}
      </a>
    );
  }
  // Anything else (javascript:, data:) is not followed.
  return <>{children}</>;
}

function inline(tokens: Token[] | undefined): ReactNode {
  return tokens?.map((t, i) => <Fragment key={i}>{renderInline(t)}</Fragment>);
}

// marked's Token adds a Generic shape for extensions; none are registered, so every token is a MarkedToken.
function renderInline(token: Token): ReactNode {
  const t = token as MarkedToken;
  switch (t.type) {
    case "strong":
      return <strong>{inline(t.tokens)}</strong>;
    case "em":
      return <em>{inline(t.tokens)}</em>;
    case "del":
      return <del>{inline(t.tokens)}</del>;
    case "codespan":
      return <code className="doc-code">{t.text}</code>;
    case "link":
      return <DocLink href={t.href}>{inline(t.tokens)}</DocLink>;
    case "br":
      return <br />;
    case "text":
      return t.tokens ? inline(t.tokens) : t.text;
    case "image":
      return <DocLink href={t.href}>{t.text}</DocLink>;
    default:
      // Escapes, raw HTML and anything unexpected: the source text, shown as text.
      return "text" in t ? t.text : t.raw;
  }
}

function Heading({ token }: { token: Tokens.Heading }) {
  const id = headingId(token.text);
  const content = inline(token.tokens);
  const className = "doc-heading scroll-mt-20";
  switch (token.depth) {
    case 1:
      return (
        <h1 id={id} className={`${className} font-heading text-2xl font-semibold`}>
          {content}
        </h1>
      );
    case 2:
      return (
        <h2 id={id} className={`${className} mt-6 font-heading text-lg font-semibold`}>
          {content}
        </h2>
      );
    case 3:
      return (
        <h3 id={id} className={`${className} mt-4 text-base font-semibold`}>
          {content}
        </h3>
      );
    default:
      return (
        <h4 id={id} className={`${className} mt-3 text-sm font-semibold`}>
          {content}
        </h4>
      );
  }
}

function Table({ token }: { token: Tokens.Table }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            {token.header.map((cell, i) => (
              <th key={i} className="px-3 py-2 text-start font-medium">
                {inline(cell.tokens)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {token.rows.map((row, r) => (
            <tr key={r} className="border-t">
              {row.map((cell, c) => (
                <td key={c} className="px-3 py-2 align-top">
                  {inline(cell.tokens)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function block(token: Token, key: number): ReactNode {
  const t = token as MarkedToken;
  switch (t.type) {
    case "heading":
      return <Heading key={key} token={t} />;
    case "paragraph":
      return <p key={key}>{inline(t.tokens)}</p>;
    case "code":
      return (
        <CodeBlock
          key={key}
          label={t.lang === undefined || t.lang === "" ? "text" : t.lang}
          code={t.text}
        />
      );
    case "list": {
      const items = t.items.map((item, i) => (
        <li key={i}>{item.tokens.map((child, j) => block(child, j))}</li>
      ));
      return t.ordered ? (
        <ol key={key} start={t.start === "" ? undefined : t.start} className="list-decimal ps-5">
          {items}
        </ol>
      ) : (
        <ul key={key} className="list-disc ps-5">
          {items}
        </ul>
      );
    }
    case "table":
      return <Table key={key} token={t} />;
    case "blockquote":
      return (
        <blockquote key={key} className="border-s-2 ps-3 text-muted-foreground">
          {t.tokens.map((child, j) => block(child, j))}
        </blockquote>
      );
    case "hr":
      return <hr key={key} />;
    case "space":
      return null;
    case "text":
      // Text directly in a list item.
      return <Fragment key={key}>{t.tokens ? inline(t.tokens) : t.text}</Fragment>;
    default:
      return (
        <p key={key} className="whitespace-pre-wrap">
          {"text" in t ? t.text : t.raw}
        </p>
      );
  }
}

/** Markdown renders one docs page. */
export function Markdown({ source }: { source: string }) {
  return (
    <div className="doc flex min-w-0 flex-col gap-3 text-sm leading-relaxed [&_.doc-code]:rounded [&_.doc-code]:bg-muted [&_.doc-code]:px-1 [&_.doc-code]:py-px [&_.doc-code]:font-mono [&_.doc-code]:text-[0.8125rem] [&_.doc-link]:font-medium [&_.doc-link]:underline [&_.doc-link]:underline-offset-4 [&_li]:my-1">
      {Lexer.lex(source).map((token, i) => block(token, i))}
    </div>
  );
}
