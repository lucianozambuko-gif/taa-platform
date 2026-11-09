import { cookies } from "next/headers";

export type Lang = "en" | "zu" | "st";
export const LANGS: { code: Lang; label: string; html: string }[] = [
  { code: "en", label: "English", html: "en-ZA" },
  { code: "zu", label: "isiZulu", html: "zu" },
  { code: "st", label: "Sesotho", html: "st" },
];

// isiZulu and Sesotho are DRAFT translations, to be checked by first-language speakers before launch.
const D = {
  "nav.courses": ["Find a course", "Thola isifundo", "Batla thuto"],
  "nav.online": ["Online learning", "Ukufunda ku-inthanethi", "Ho ithuta inthaneteng"],
  "nav.employers": ["For employers", "Okwabaqashi", "Bakeng sa bahiri"],
  "nav.learnerships": ["Learnerships", "Ama-learnership", "Di-learnership"],
  "nav.centre": ["Assessment centre", "Isikhungo sokuhlola", "Setsi sa tlhahlobo"],
  "nav.mylearning": ["My learning", "Ukufunda kwami", "Thuto ya ka"],
  "nav.login": ["Log in", "Ngena", "Kena"],
  "nav.signout": ["Sign out", "Phuma", "Tswa"],
  "nav.home": ["Home", "Ekhaya", "Lehae"],
  "nav.help": ["Help", "Usizo", "Thuso"],
  "nav.search": ["Search", "Sesha", "Batla"],
  "home.eyebrow": ["Skills training in Johannesburg and online", "Ukuqeqeshwa kwamakhono eGoli naku-inthanethi", "Thupelo ya bokgoni Johannesburg le inthaneteng"],
  "home.h1": [
    "Practical training that gets people working, and keeps teams working well.",
    "Ukuqeqeshwa okusebenzayo okuthola abantu umsebenzi, futhi kugcine amathimba esebenza kahle.",
    "Thupelo e sebetsang e fumanang batho mosebetsi, mme e boloka dihlopha di sebetsa hantle.",
  ],
  "home.lead": [
    "Short skills courses, accredited programmes and learnerships, with clear prices, real dates and online learning you can start today.",
    "Izifundo ezimfushane zamakhono, izinhlelo ezigunyaziwe nama-learnership, ngamanani acacile, izinsuku zangempela nokufunda ku-inthanethi ongakuqala namuhla.",
    "Dithuto tse kgutshwane tsa bokgoni, mananeo a amohelehileng le di-learnership, ka ditheko tse hlakileng, matsatsi a nnete le ho ithuta inthaneteng hoo o ka ho qalang kajeno.",
  ],
  "home.searchPh": ["Search courses, FAQs and articles", "Sesha izifundo, imibuzo nezihloko", "Batla dithuto, dipotso le dingolwa"],
  "home.study": ["I want to study", "Ngifuna ukufunda", "Ke batla ho ithuta"],
  "home.studyP": [
    "Find a course by career goal, see the full price and enrol online.",
    "Thola isifundo ngokomgomo womsebenzi, ubone inani eliphelele bese ubhalisa ku-inthanethi.",
    "Fumana thuto ho ya ka sepheo sa mosebetsi, bona theko yohle mme o ngodise inthaneteng.",
  ],
  "home.team": ["Train my team", "Qeqesha ithimba lami", "Koetlisa sehlopha sa ka"],
  "home.teamP": [
    "Group quotes, on-site training and progress reporting for HR and L&D.",
    "Izilinganiso zamaqembu, ukuqeqeshwa emsebenzini nemibiko yenqubekela phambili ye-HR ne-L&D.",
    "Ditheko tsa dihlopha, thupelo mosebetsing le ditlaleho tsa tswelopele bakeng sa HR le L&D.",
  ],
  "course.duration": ["Duration", "Isikhathi", "Nako"],
  "course.delivery": ["Delivery", "Indlela yokufundisa", "Mokgwa wa thuto"],
  "course.location": ["Location", "Indawo", "Sebaka"],
  "course.intake": ["Next intake", "Ukwamukelwa okulandelayo", "Kamohelo e latelang"],
  "course.certificate": ["Certificate", "Isitifiketi", "Setifikeiti"],
  "course.outcomes": ["What you will be able to do", "Ozokwazi ukukwenza", "Seo o tla kgona ho se etsa"],
  "course.who": ["Who it is for", "Okwabani", "Ke ya mang"],
  "course.entry": ["Entry requirements", "Izimfuneko zokungena", "Ditlhoko tsa ho kena"],
  "course.assessment": ["Assessment", "Ukuhlolwa", "Tlhahlobo"],
  "course.intakes": ["Intakes", "Ukwamukelwa", "Dikamohelo"],
  "course.enrol": ["Enrol and pay", "Bhalisa ukhokhe", "Ngodisa o lefe"],
  "draft": [
    "",
    "Ukuhumusha okusalungiswa: kusazohlolwa yisikhulumi solimi lwesiZulu. Ezinye izingxenye zisesiNgisini.",
    "Phetolelo e sa ntse e hlahlojwa ke sebui sa Sesotho. Dikarolo tse ding di sa ntse di le ka Senyesemane.",
  ],
} as const;

export type Key = keyof typeof D;

export async function getLang(): Promise<Lang> {
  try {
    const v = (await cookies()).get("taa-lang")?.value;
    return v === "zu" || v === "st" ? v : "en";
  } catch {
    return "en";
  }
}

export function t(lang: Lang, key: Key) {
  const i = lang === "zu" ? 1 : lang === "st" ? 2 : 0;
  return D[key][i] || D[key][0];
}

export async function getT() {
  const lang = await getLang();
  return { lang, t: (k: Key) => t(lang, k) };
}
