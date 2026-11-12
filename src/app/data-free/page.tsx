import PageHero from "@/components/PageHero";
import Link from "next/link";

export const metadata = {
  title: "Data-free learning and data saver",
  description: "How Training Africa Academy keeps studying cheap on prepaid data: data saver mode, light pages, offline lessons and a data-free address.",
};

const DF_URL = process.env.NEXT_PUBLIC_DATAFREE_URL ?? "";

// Measured with data saver on, on a phone-sized screen (compressed transfer size).
const SIZES: [string, string][] = [
  ["The first page you open (homepage, a course page or a lesson)", "about 140 KB"],
  ["Each page after that: courses, lessons, quizzes", "about 15 KB"],
  ["Reopening a lesson you've already viewed, in the app", "nothing (saved on your phone)"],
];

export default function DataFreePage() {
  return (
    <>
    <PageHero eyebrow="Data-free and data saver" title={<>Study without worrying about data</>} photo="internal-training1"><p>Most of our learners study on prepaid data, so the site is built to use as little as possible and, on the data-free address, nothing at all.</p></PageHero>
    <section className="block" style={{ paddingTop: 36 }}>
      <div className="wrap stack" style={{ gap: 22, maxWidth: 860 }}>
        <div className="stack" style={{ gap: 10 }}>
        </div>

        <div className="grid g2">
          <div className="panel stack">
            <h2 className="h3">Data-free address</h2>
            {DF_URL ? (
              <>
                <p className="muted">Browsing courses, enrolling and studying text lessons and quizzes on our data-free address costs you no data on Vodacom, MTN, Cell C and Telkom. Videos, card payments and WhatsApp open outside it and use normal data.</p>
                <div><a className="btn btn-primary" href={DF_URL}>Open the data-free site</a></div>
              </>
            ) : (
              <p className="muted">The Academy is setting up a data-free address with a South African data-free provider. When it's live, browsing and studying text lessons there won't use your data, and this page will link to it.</p>
            )}
          </div>
          <div className="panel stack">
            <h2 className="h3">Data saver</h2>
            <p className="muted">Turn it on under <b>Aa</b> at the top of any page. It switches on by itself when your phone has data saver on or your signal is 2G.</p>
            <ul className="muted" style={{ margin: 0, paddingLeft: 18 }}>
              <li>Videos load only when you tap play, and show roughly how much data they'll use</li>
              <li>Uses your phone's own fonts instead of downloading ours</li>
              <li>No animations or decorative pictures</li>
            </ul>
          </div>
        </div>

        <div className="panel stack" style={{ gap: 8 }}>
          <h2 className="h3">How much data the site uses</h2>
          <div className="tscroll" tabIndex={0}>
            <table className="tbl">
              <thead><tr><th>What you open</th><th>Data used</th></tr></thead>
              <tbody>{SIZES.map(([p, s]) => <tr key={p}><td>{p}</td><td className="tnum"><b>{s}</b></td></tr>)}</tbody>
            </table>
          </div>
          <p className="small muted">Without data saver, the first visit also downloads the site’s fonts (roughly 100 to 150 KB, once). For comparison, one minute of video at low quality is about 4 MB. The <b>Aa</b> menu shows how much the page you're on has used.</p>
        </div>

        <div className="panel stack">
          <h2 className="h3">Study offline</h2>
          <p className="muted">Add the Academy to your home screen and the lessons you've opened stay available with no signal. Your progress saves when you're back online.</p>
          <div className="row" style={{ gap: 8 }}><Link className="btn btn-ghost btn-sm" href="/dashboard">My learning</Link><Link className="btn btn-ghost btn-sm" href="/online-learning">How online learning works</Link></div>
        </div>
      </div>
    </section>
    </>
  );
}
