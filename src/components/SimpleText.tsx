/** Renders staff-written text safely: "## " starts a heading, "- " a bullet, blank lines separate paragraphs. No HTML is allowed. */
export default function SimpleText({ text }: { text: string }) {
  const blocks = text.replace(/\r/g, "").split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  return (
    <div className="prose">
      {blocks.map((b, i) => {
        const lines = b.split("\n");
        const out: React.ReactNode[] = [];
        let list: string[] = [];
        const flush = () => {
          if (list.length) out.push(<ul key={`u${out.length}`}>{list.map((l, j) => <li key={j}>{l}</li>)}</ul>);
          list = [];
        };
        for (const line of lines) {
          if (line.startsWith("## ")) { flush(); out.push(<h2 key={`h${out.length}`}>{line.slice(3)}</h2>); }
          else if (/^[-*] /.test(line)) list.push(line.slice(2));
          else { flush(); out.push(<p key={`p${out.length}`}>{line}</p>); }
        }
        flush();
        return <div key={i}>{out}</div>;
      })}
    </div>
  );
}
